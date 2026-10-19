/** First-load / failed-title acceptance only. No Git, builds, source edits or installs.
 * node tests/emberwake-firstload-browser.mjs
 * EW_URL optionally selects a running preview (default :4173/Swordigo-V2/).
 * Local HTTP fixture freezes existing dist bytes; HTTP cache is real Chromium cache,
 * not Playwright routing. Stale fixtures are synthetic same-release bytes + markers,
 * NOT a historical release or proof of atomic production deployment.
 */
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const sri=b=>'sha384-'+createHash('sha384').update(b).digest('base64');
const results=[], notes=[];
async function check(name,fn){try{const detail=await fn();results.push({name,pass:true,...(detail?{detail}:{})});console.log('PASS '+name);}catch(e){results.push({name,pass:false,error:e.message});console.error('FAIL '+name+': '+e.message);}}
const snapshot=new Map();
function inventory(dir,rel=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=rel?rel+'/'+e.name:e.name;if(e.isSymbolicLink())throw Error('Fixture symlink refused: '+p);if(e.isDirectory())inventory(path.join(dir,e.name),p);else snapshot.set(p,fs.readFileSync(path.join(dir,e.name)));}}
inventory('dist');
const html=snapshot.get('index.html').toString();
const assets=[...html.matchAll(/(?:src|href)="(assets\/(?:scripts|styles)\/[^"?]+)(\?v=[0-9a-f]+)?"/g)].map(m=>({file:m[1],query:m[2]||''}));
await check('existing dist script/style URLs match their content digests',()=>{assert.ok(assets.length>=10);for(const {file,query} of assets)assert.equal(query,'?v='+sha(snapshot.get(file)).slice(0,12),file);return {assetCount:assets.length,htmlSHA256:sha(snapshot.get('index.html'))};});
await check('all prepared script/style SHA-384 integrity values match frozen bytes',()=>{for(const tag of html.match(/<(?:script|link)\b[^>]*(?:src|href)="assets\/(?:scripts|styles)\/[^"]+"[^>]*>/g)||[]){const file=tag.match(/(?:src|href)="([^"?]+)/)[1];assert.equal(tag.match(/integrity="([^"]+)"/)?.[1],sri(snapshot.get(file)),file);}return {assetCount:assets.length};});
await check('current source and frozen dist first-load bytes agree',()=>{for(const p of ['index.html','sw.js',...assets.map(a=>a.file)])assert.equal(sha(fs.readFileSync(p)),sha(snapshot.get(p)),p+' needs parent prepare/build');});
const stale=new Map(), oldQueries=new Map();
for(const {file} of assets){const bytes=snapshot.get(file),marked=Buffer.concat([bytes,Buffer.from(file.endsWith('.js')?'\n;globalThis.__STALE_ASSETS=(globalThis.__STALE_ASSETS||[]).concat('+JSON.stringify(file)+');\n':'\n/* synthetic stale CSS */\n:root{--ew-stale-cache:yes}\n')]);stale.set(file,marked);oldQueries.set(file,'?v='+sha(marked).slice(0,12));}
let phase='current',missing=null,corrupt=null;
const wrong=new Map(assets.map(({file})=>[file,Buffer.from(file.endsWith('.js')?';globalThis.__WRONG_SAME_KEY_EXECUTED=true;\n':':root{--ew-wrong-same-key:yes}\n')]));
const requests=[];
// Synthetic old release gets its own matching SRI as well as its own digest URL.
const oldHtml=assets.reduce((h,{file,query})=>h.replace(file+query,file+oldQueries.get(file)).replace(sri(snapshot.get(file)),sri(stale.get(file))),html);
const mime=p=>({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json'}[path.extname(p)]||'application/octet-stream');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),prefix=u.pathname.startsWith('/Swordigo-V2/')?'/Swordigo-V2/':'/',file=u.pathname.slice(prefix.length)||'index.html';
 requests.push({phase,file,query:u.search,corrupt:corrupt===file,status:missing===file?404:200});
 if(missing===file){res.writeHead(404,{'Content-Type':mime(file),'Cache-Control':'no-store'});res.end('Deliberately missing extension');return;}
 let bytes=file==='index.html'?Buffer.from(phase==='old'?oldHtml:html):snapshot.get(file);
 // Old content remains at its old address after publication. Unversioned paths also
 // hold stale bytes in the real browser cache, demonstrating why new keys matter.
 if(stale.has(file)&&(phase==='old'||u.search===oldQueries.get(file)))bytes=stale.get(file);
 if(corrupt===file)bytes=wrong.get(file);
 if(!bytes){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':mime(file),'Cache-Control':file==='index.html'||file==='sw.js'?'no-cache':'public, max-age=31536000, immutable','Service-Worker-Allowed':prefix});res.end(bytes);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const executablePath=process.env.CHROME_BIN||['/usr/local/bin/chromium','/usr/bin/chromium'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox']});
async function isolated(fn,{workers='block'}={}){const c=await browser.newContext({serviceWorkers:workers,acceptDownloads:true,viewport:{width:1280,height:800}});try{return await fn(await c.newPage(),c);}finally{await c.close();}}
async function boot(page,url){await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>!!window.emberwake,{timeout:7000});}
async function identities(page){return page.evaluate(()=>({core:!!window.EW_V11,encounters:!!window.EW?.Encounters,journal:!!window.EW_JOURNAL,persistence:window.EWClient?.persistenceSafety,presentation:!!window.EW_SEQUEL_PRESENTATION,chapter:!!(window.EW?.ChapterData&&window.EW?.ChapterSave&&window.EW?.features?.chapterRuntime)}));}
const integrated=assets.some(a=>a.file==='assets/scripts/chapter-runtime.js');
const expected={core:true,encounters:true,journal:true,persistence:'transactional-v1',presentation:true,chapter:integrated};
async function seed(page){
 await page.evaluate(()=>{const s=new EW.Game(EW_LEVELS).newRun('adventure').snapshot();s.gold=111;const old={...s,gold:9};localStorage.setItem('EW_STORY_V3',JSON.stringify(s));localStorage.setItem('EW_STORY_V3.backup',JSON.stringify(old));
  if(EW.ChapterSave){const cs=EW.ChapterSave;const first=cs.write(localStorage,cs.migrateV3(old,EW_LEVELS),EW_LEVELS,0);if(!first.ok)throw Error(first.error);const next=cs.write(localStorage,cs.migrateV3(s,EW_LEVELS),EW_LEVELS,first.envelope.revision);if(!next.ok)throw Error(next.error);}
 });await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.emberwake?.savedStory?.gold===111);await page.locator('#continue').click();await page.waitForFunction(()=>emberwake.game.status==='playing'&&!emberwake.paused);await page.keyboard.press('Escape');await page.waitForFunction(()=>emberwake.modalKind==='pause');
}
async function failedTitle(page,kind){
 await seed(page);
 const before=await page.evaluate(kind=>{
  const a=emberwake,real=localStorage,key=EW.ChapterSave?.KEY||'EW_STORY_V3';window.__liveGame=a.game;a.game.progress.gold=333;window.__writes=[];
  if(kind==='revision-conflict'){const e=JSON.parse(real.getItem(key));e.revision++;real.setItem(key,JSON.stringify(e));}
  a.storage={getItem(k){if(kind==='denied')throw new DOMException('Denied','SecurityError');return real.getItem(k);},setItem(k,v){__writes.push(k);if(kind==='denied'||kind==='write-denied'&&k===key)throw new DOMException('Denied','SecurityError');if(kind==='backup-quota'&&k.endsWith('.backup')||kind==='primary-quota'&&k===key)throw new DOMException('Blocked','QuotaExceededError');real.setItem(k,v);}};
  return {key,snapshot:a.game.snapshot(),portable:a.portableJourney?a.portableJourney():a.game.snapshot(),primary:real.getItem('EW_STORY_V3'),backup:real.getItem('EW_STORY_V3.backup'),authoritative:real.getItem(key),revision:a.storyRevision};
 },kind);
 await page.locator('#modal [data-act="title"]').click();
 const after=await page.evaluate(key=>({sameGame:emberwake.game===__liveGame,snapshot:emberwake.game.snapshot(),status:emberwake.game.status,paused:emberwake.paused,modal:emberwake.modalKind,titleHidden:document.getElementById('title-screen').hidden,primary:localStorage.getItem('EW_STORY_V3'),backup:localStorage.getItem('EW_STORY_V3.backup'),authoritative:localStorage.getItem(key),revision:emberwake.storyRevision,cached:emberwake.savedStory.gold,writes:__writes}),before.key);
 assert.equal(after.sameGame,true);assert.deepEqual(after.snapshot,before.snapshot);assert.equal(after.status,'playing');assert.equal(after.paused,true);assert.equal(after.modal,'pause');assert.equal(after.titleHidden,true);assert.equal(after.primary,before.primary);assert.equal(after.cached,111);assert.equal(after.authoritative,before.authoritative,'Failed title must not replace authoritative save');assert.equal(after.revision,before.revision);
 assert.equal(after.backup,!integrated&&kind==='primary-quota'?before.primary:before.backup,'V3 story and backup must remain frozen under V4');
 assert.deepEqual(after.writes,kind==='denied'||kind==='revision-conflict'?[]:integrated?[before.key]:kind==='backup-quota'?['EW_STORY_V3.backup']:['EW_STORY_V3.backup','EW_STORY_V3']);
 assert.match(await page.locator('#toast').innerText(),/Could not save.*live journey remains open.*Export/i);
 assert.equal(await page.locator('#modal [data-act="export"]').isVisible(),true);
 const d=page.waitForEvent('download');await page.locator('#modal [data-act="export"]').click();const download=await d;assert.equal(await download.failure(),null);const downloaded=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.deepEqual(downloaded,before.portable,'Native export must carry the full unsaved portable payload, not cached durable journey');
 if(integrated){assert.equal(downloaded.base.gold,333);assert.deepEqual(downloaded.chapter,before.portable.chapter);assert.equal(await page.evaluate(raw=>!!EW.ChapterSave.normalizePayload(raw,EW_LEVELS),downloaded),true);}else assert.equal(downloaded.gold,333);
 await page.locator('#modal [data-act="close"][data-primary]').click();await page.waitForFunction(()=>!emberwake.paused);assert.equal(await page.evaluate(()=>emberwake.game.progress.gold),333);
 return {fault:kind,authoritativeKey:before.key,downloadGold:downloaded.base?.gold??downloaded.gold,fullPayloadEqual:true,legacyFrozen:integrated,writeAttempts:after.writes};
}

try{
 for(const prefix of ['/','/Swordigo-V2/']){
  for(const file of ['assets/scripts/client.js','assets/styles/sequel-v12.css']){
   await check('wrong same-key 200 bytes blocked by SRI '+prefix+file,()=>isolated(async p=>{
    phase='current';missing=null;corrupt=file;const n=requests.length,consoleErrors=[];p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    await p.addInitScript(()=>{localStorage.setItem('EW_STORY_V3','preexisting-primary-fixture');localStorage.setItem('EW_STORY_V3.backup','preexisting-backup-fixture');localStorage.setItem('EW_STORY_V4','preexisting-v4-fixture');});
    await p.goto(origin+prefix,{waitUntil:'load'});
    const state=await p.evaluate(()=>({app:!!window.emberwake,failed:window.EW_BOOT_FAILED,executed:!!window.__WRONG_SAME_KEY_EXECUTED,css:getComputedStyle(document.documentElement).getPropertyValue('--ew-wrong-same-key').trim(),text:document.getElementById('ember-root').textContent,primary:localStorage.getItem('EW_STORY_V3'),backup:localStorage.getItem('EW_STORY_V3.backup'),v4:localStorage.getItem('EW_STORY_V4')}));
    assert.ok(requests.slice(n).some(r=>r.file===file&&r.corrupt&&r.status===200&&r.query===assets.find(a=>a.file===file).query),'Must inject wrong bytes at the actual current digest URL');
    assert.equal(state.app,false);assert.equal(state.failed,true);assert.equal(state.executed,false);assert.notEqual(state.css,'yes');assert.equal(state.primary,'preexisting-primary-fixture');assert.equal(state.backup,'preexisting-backup-fixture');assert.equal(state.v4,'preexisting-v4-fixture');assert.match(state.text,/could not|cannot|incomplete|failed|refresh|reload/i);
    assert.ok(consoleErrors.some(s=>/integrity|digest/i.test(s)&&/block/i.test(s)),'Must observe Chromium integrity-block diagnostic, not only a missing global');corrupt=null;return {status:200,url:file+assets.find(a=>a.file===file).query,integrityBlocked:true};
   }));
  }
  corrupt=null;
  await check('cold complete uncontrolled boot '+prefix,()=>isolated(async p=>{phase='current';missing=null;corrupt=null;await boot(p,origin+prefix);assert.deepEqual(await identities(p),expected);assert.equal(await p.evaluate(()=>navigator.serviceWorker.controller),null);return {workerPolicy:'blocked',identities:await identities(p)};}));
  await check('real HTTP cached stale script/style keys bypassed '+prefix,()=>isolated(async (p,c)=>{
   phase='old';missing=null;corrupt=null;const cdp=await c.newCDPSession(p);await cdp.send('Network.enable');let cacheHits=0;cdp.on('Network.requestServedFromCache',()=>cacheHits++);
   await boot(p,origin+prefix);assert.equal((await p.evaluate(()=>__STALE_ASSETS)).length,assets.filter(a=>a.file.endsWith('.js')).length);assert.equal(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--ew-stale-cache').trim()),'yes');
   // Prime stable paths too, with fetch through actual HTTP caching, not a route.
   await p.evaluate(async files=>{for(const f of files)await (await fetch(f)).text();},assets.map(a=>a.file));
   await p.reload({waitUntil:'load'});await p.waitForFunction(()=>window.emberwake);assert.ok(cacheHits>=assets.length,'Must observe real browser HTTP cache hits');
   phase='current';const n=requests.length;await p.reload({waitUntil:'load'});await p.waitForFunction(()=>window.emberwake);assert.equal(await p.evaluate(()=>window.__STALE_ASSETS||null),null);assert.notEqual(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--ew-stale-cache').trim()),'yes');assert.deepEqual(await identities(p),expected);
   for(const a of assets)assert.ok(requests.slice(n).some(r=>r.file===a.file&&r.query===a.query),'New digest not fetched: '+a.file);
   // Cached old/stable bytes demonstrably survive publication; new keys avoid them.
   assert.match(await p.evaluate(async()=>await (await fetch('assets/scripts/client.js')).text()),/__STALE_ASSETS/);
   return {cacheHits,newAddressRequests:assets.length,workerPolicy:'blocked',staleFixture:'synthetic same-release bytes + execution/CSS markers'};
  }));
  await check('registration refusal still permits coherent boot '+prefix,()=>isolated(async p=>{phase='current';missing=null;await p.addInitScript(()=>{window.__refusedRegistration=0;navigator.serviceWorker.register=()=>{window.__refusedRegistration++;return Promise.reject(new DOMException('Policy denied','SecurityError'));};});await boot(p,origin+prefix);assert.deepEqual(await identities(p),expected);assert.equal(await p.evaluate(()=>__refusedRegistration),1);assert.equal(await p.evaluate(()=>navigator.serviceWorker.controller),null);return {registration:'explicitly refused fixture'};},{workers:'allow'}));
  for(const file of [...(integrated?['assets/scripts/chapter-data.js','assets/scripts/chapter-save.js','assets/scripts/chapter-runtime.js']:[]),'assets/scripts/core-v11.js','assets/scripts/encounters-v12.js','assets/scripts/journal-v12.js','assets/scripts/controls-v11.js','assets/scripts/journey-v11.js','assets/scripts/realm-v11.js','assets/scripts/presentation-v12.js','assets/styles/sequel-v12.css']){
   await check('extension/style 404 must fail closed '+prefix+file,()=>isolated(async p=>{
    phase='current';missing=file;await p.addInitScript(()=>{localStorage.setItem('EW_STORY_V3','preexisting-primary-fixture');localStorage.setItem('EW_STORY_V3.backup','preexisting-backup-fixture');localStorage.setItem('EW_STORY_V4','preexisting-v4-fixture');});
    const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+prefix,{waitUntil:'load'});await p.waitForTimeout(100);
    const state=await p.evaluate(()=>({app:!!window.emberwake,status:window.emberwake?.game.status,text:document.getElementById('ember-root').textContent,primary:localStorage.getItem('EW_STORY_V3'),backup:localStorage.getItem('EW_STORY_V3.backup'),v4:localStorage.getItem('EW_STORY_V4')}));
    assert.equal(state.primary,'preexisting-primary-fixture');assert.equal(state.backup,'preexisting-backup-fixture');assert.equal(state.v4,'preexisting-v4-fixture');
    assert.equal(state.app,false,'Missing '+file+' nevertheless instantiated App; boot is not extension-complete (status '+state.status+')');assert.match(state.text,/could not|cannot|incomplete|failed|refresh|reload/i,'Must show explicit nonplaying recovery');return {errors};
   }));
  }
 }
 missing=null;corrupt=null;phase='current';
 await check('cold worker activation and first claimed reload /Swordigo-V2/',()=>isolated(async p=>{await boot(p,origin+'/Swordigo-V2/');await p.waitForFunction(()=>navigator.serviceWorker.controller,{timeout:20000});await p.reload({waitUntil:'load'});await p.waitForFunction(()=>window.emberwake);assert.deepEqual(await identities(p),expected);return {controller:await p.evaluate(()=>navigator.serviceWorker.controller.scriptURL)};},{workers:'allow'}));
 const external=process.env.EW_URL||'http://127.0.0.1:4173/Swordigo-V2/';
 let live=false;try{const r=await fetch(external);live=r.ok;if(live)await check('running preview HTML equals frozen dist',async()=>{assert.equal(sha(Buffer.from(await r.text())),sha(snapshot.get('index.html')));return {url:external,cacheControl:r.headers.get('cache-control')};});}catch(e){notes.push('Existing preview unavailable: '+e.message);}
 if(!live)notes.push('SKIP running-preview checks: no successful existing server response; local fixture remains available.');
 for(const kind of integrated?['denied','write-denied','primary-quota','revision-conflict']:['denied','backup-quota','primary-quota']){
  await check('native failed Save & return retains live journey and exports '+kind+(live?' (existing preview)':' (local dist)'),()=>isolated(async p=>{await boot(p,live?external:origin+'/Swordigo-V2/');return failedTitle(p,kind);}));
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({scope:'local Chromium precheck, not production acceptance',utc:new Date().toISOString(),frozenDistHTML:sha(snapshot.get('index.html')),passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,notes,results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
