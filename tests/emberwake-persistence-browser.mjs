// Isolated browser/storage fixtures, not campaign-completion evidence. No server/build ownership.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const url=process.env.EW_URL||'http://127.0.0.1:4173/Swordigo-V2/';
const executablePath=process.env.CHROME_BIN||['/usr/local/bin/chromium','/usr/bin/chromium'].find(p=>fs.existsSync(p));
const args=process.env.EW_NO_SANDBOX==='1'?['--no-sandbox']:[];
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args});
const results=[];
async function scenario(name,fn){
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
 await context.addInitScript(()=>{
  window.__pendingReads=[];
  const text=File.prototype.text;
  File.prototype.text=function(){const original=text.call(this);if(!this.name.startsWith('slow-'))return original;
   return new Promise((resolve,reject)=>window.__pendingReads.push({name:this.name,release:()=>original.then(resolve,reject)}));};
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.emberwake&&window.EWClient);
  assert.equal(await page.evaluate(()=>EWClient.persistenceSafety),'transactional-v1','Server must serve latest assigned journey source; parent rebuild required otherwise.');
  await fn(page);assert.deepEqual(errors,[],'Unexpected browser errors');results.push({name,pass:true});console.log('PASS '+name);
 }catch(e){results.push({name,pass:false,error:e.message});console.error('FAIL '+name+': '+e.message);}
 finally{await context.close();}
}
async function seed(page){
 await page.evaluate(()=>{
  const s=new EW.Game(EW_LEVELS).newRun('adventure').snapshot();s.gold=111;
  localStorage.setItem('EW_STORY_V3',JSON.stringify(s));
  localStorage.setItem('EW_STORY_V3.backup',JSON.stringify({...s,gold:9}));
 });
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.emberwake?.savedStory?.gold===111);
 await page.locator('#continue').click();await page.waitForFunction(()=>emberwake.game.status==='playing'&&!emberwake.paused);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>emberwake.modalKind==='pause');
}
async function fixtureFile(page,gold,name='journey.json'){
 const text=await page.evaluate(gold=>{const s=new EW.Game(EW_LEVELS).newRun('adventure').snapshot();s.gold=gold;return JSON.stringify(s);},gold);
 await page.locator('#import-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text)});
 if(name.startsWith('slow-'))await page.waitForFunction(name=>__pendingReads.some(r=>r.name===name),name);
 else await page.waitForFunction(()=>emberwake.modalKind==='restore');
}
async function release(page,name){await page.evaluate(name=>{const r=__pendingReads.find(r=>r.name===name);if(!r)throw Error('Missing delayed fixture');r.release();},name);await page.waitForTimeout(100);}
async function fault(page,kind){
 await page.evaluate(kind=>{
  const app=emberwake,real=localStorage;window.__writes=[];
  // Explicit isolated fixture: simulate earned-but-not-yet-persisted current progress.
  app.game.progress.gold=333;window.__originalGame=app.game;
  app.storage={getItem(k){if(kind==='denied')throw new DOMException('Denied','SecurityError');return real.getItem(k);},
   setItem(k,v){__writes.push({key:k,value:v});
    const gold=(()=>{try{return JSON.parse(v).gold;}catch(_){return null;}})();
    if(kind==='backup-quota'&&k.endsWith('.backup'))throw new DOMException('Quota','QuotaExceededError');
    if(kind==='primary-after-backup'&&k==='EW_STORY_V3')throw new DOMException('Quota','QuotaExceededError');
    if(kind==='target-primary'&&k==='EW_STORY_V3'&&gold===444)throw new DOMException('Quota','QuotaExceededError');
    if(kind==='new-target'&&k==='EW_STORY_V3'&&gold===0)throw new DOMException('Quota','QuotaExceededError');
    real.setItem(k,v);
   }};
 },kind);
}
async function assertUnchangedLive(page,before){
 assert.equal(await page.evaluate(()=>emberwake.game===__originalGame),true,'Abort must keep current runtime object/fight');
 assert.deepEqual(await page.evaluate(()=>emberwake.game.snapshot()),before);
 assert.match(await page.locator('#toast').innerText(),/Journey not replaced.*Export your current journey/s);
}
try{
 for(const kind of ['denied','backup-quota','primary-after-backup','target-primary']){
  await scenario('native confirmed import aborts safely: '+kind,async page=>{
   await seed(page);await fault(page,kind);await fixtureFile(page,444);
   const before=await page.evaluate(()=>emberwake.game.snapshot());
   await page.locator('[data-act="import-accept"]').click();await assertUnchangedLive(page,before);
   assert.equal(await page.evaluate(()=>emberwake.modalKind),'restore');
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('EW_STORY_V3')).gold);
   assert.equal(stored,kind==='target-primary'?333:111);
   assert.equal(await page.evaluate(()=>EW.validateSave(localStorage.getItem('EW_STORY_V3'),EW_LEVELS)!==null),true);
   if(kind==='target-primary')assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('EW_STORY_V3.backup')).gold),333);
   if(kind==='primary-after-backup')assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('EW_STORY_V3.backup')).gold),111);
   const download=page.waitForEvent('download');await page.locator('[data-act="export-current"]').click();
   assert.match((await download).suggestedFilename(),/emberwake.*json/);
   await page.locator('[data-act="import-cancel"]').click();
  });
 }
 await scenario('successful native restore preserves unsaved current journey as rolling backup',async page=>{
  await seed(page);await page.evaluate(()=>{emberwake.game.progress.gold=333;});await fixtureFile(page,444);
  await page.locator('[data-act="import-accept"]').click();await page.waitForFunction(()=>emberwake.game.progress.gold===444&&!emberwake.paused);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('EW_STORY_V3')).gold),444);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('EW_STORY_V3.backup')).gold),333);
  // Quiesce the current progress first: active-frame time may legitimately differ from the restored snapshot.
  assert.equal(await page.evaluate(()=>emberwake.save().ok),true);
  const backup=await page.evaluate(()=>localStorage.getItem('EW_STORY_V3.backup'));
  assert.equal(await page.evaluate(()=>emberwake.save().ok),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('EW_STORY_V3.backup')),backup,'Identical normalized save must not rotate backup');
  await page.reload();await page.waitForFunction(()=>window.emberwake?.savedStory?.gold===444);
  await page.locator('#continue').click();await page.waitForFunction(()=>emberwake.game.progress.gold===444);
 });
 for(const kind of ['backup-quota','primary-after-backup','new-target']){
  await scenario('native new-journey confirmation aborts safely: '+kind,async page=>{
   await seed(page);await fault(page,kind);
   await page.locator('[data-act="title"]').click();await page.locator('[data-act="new"]').click();
   await page.locator('[data-act="launch"]').click();await page.waitForFunction(()=>emberwake.modalKind==='replace');
   // Title attempted a save too; the live snapshot is still the unsaved current journey.
   const before=await page.evaluate(()=>emberwake.game.snapshot());
   await page.locator('[data-act="launch-confirm"]').click();await assertUnchangedLive(page,before);
   assert.equal(await page.evaluate(()=>emberwake.modalKind),'replace');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('EW_STORY_V3')).gold),kind==='new-target'?333:111);
   await page.locator('[data-act="new-cancel"]').click();
  });
 }
 await scenario('successful confirmed new journey does not immediately overwrite retained backup',async page=>{
  await seed(page);await page.evaluate(()=>{emberwake.game.progress.gold=333;});
  await page.locator('[data-act="title"]').click();await page.locator('[data-act="new"]').click();await page.locator('[data-act="launch"]').click();
  await page.locator('[data-act="launch-confirm"]').click();await page.waitForFunction(()=>emberwake.modalKind==='dialogue');
  assert.equal(await page.evaluate(()=>emberwake.game.progress.gold),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('EW_STORY_V3.backup')).gold),333);
 });
 await scenario('native title and Continue invalidate delayed file reads',async page=>{
  await seed(page);await fixtureFile(page,555,'slow-title.json');
  await page.locator('[data-act="title"]').click();await page.locator('#continue').click();
  await release(page,'slow-title.json');
  assert.equal(await page.evaluate(()=>emberwake._importCandidate),null);
  assert.notEqual(await page.evaluate(()=>emberwake.modalKind),'restore');
  assert.equal(await page.evaluate(()=>emberwake.game.progress.gold),111);
 });
 for(const method of ['title','enterGame','start','continue','death']){
  await scenario('isolated delayed-read lifecycle boundary: '+method,async page=>{
   await seed(page);await fixtureFile(page,555,'slow-'+method+'.json');
   const prior=await page.evaluate(()=>emberwake._importGeneration);
   await page.evaluate(method=>{if(method==='death')emberwake.game.status='dead';emberwake[method]();},method);
   assert.ok(await page.evaluate(prior=>emberwake._importGeneration>prior,prior));
   await release(page,'slow-'+method+'.json');
   assert.equal(await page.evaluate(()=>emberwake._importCandidate),null);
   assert.notEqual(await page.evaluate(()=>emberwake.modalKind),'restore');
   assert.notEqual(await page.evaluate(()=>emberwake.game.progress.gold),555);
  });
 }
 await scenario('overlapping native file selections respect latest read and cancel',async page=>{
  await seed(page);const stored=await page.evaluate(()=>localStorage.getItem('EW_STORY_V3'));
  await fixtureFile(page,555,'slow-old.json');await fixtureFile(page,666,'slow-new.json');
  await release(page,'slow-new.json');await page.waitForFunction(()=>emberwake.modalKind==='restore');
  assert.equal(await page.evaluate(()=>emberwake._importCandidate.gold),666);
  await release(page,'slow-old.json');assert.equal(await page.evaluate(()=>emberwake._importCandidate.gold),666);
  await page.locator('[data-act="import-cancel"]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('EW_STORY_V3')),stored);
 });
 await scenario('remapped held key cannot reactivate by repeat across pause/close',async page=>{
  await seed(page);await page.locator('#modal [data-act="settings"]').click();await page.locator('[data-act="bindings"]').click();
  await page.locator('[data-act="bind-change"][data-bind="right"]').click();await page.keyboard.press('KeyB');
  await page.locator('[data-act="close"][data-primary]').click();
  await page.keyboard.down('KeyB');await page.waitForFunction(()=>emberwake.down('right'));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>emberwake.paused);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!emberwake.paused);
  await page.keyboard.down('KeyB'); // Playwright's second down sends a real repeat keyboard event.
  assert.equal(await page.evaluate(()=>emberwake.down('right')),false);
  await page.keyboard.up('KeyB');await page.keyboard.down('KeyB');await page.waitForFunction(()=>emberwake.down('right'));
  await page.keyboard.up('KeyB');assert.equal(await page.evaluate(()=>emberwake.down('right')),false);
 });
}finally{await browser.close();}
console.log(JSON.stringify({url,scope:'Native browser import/confirmation/download/key input plus explicit isolated storage/delayed-read/lifecycle fixtures; not campaign, device or release certification.',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
