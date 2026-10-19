import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.env.EW_URL||'http://127.0.0.1:4173/Swordigo-V2/',out='qa/correction/browser';fs.mkdirSync(out,{recursive:true});let checks=[],errors=[],failures=[];
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox']});
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name)}
async function ready(p){p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failures.push(r.url())});await p.goto(base);await p.waitForFunction(()=>window.emberwake&&window.EW_SEQUEL_PRESENTATION);}
async function start(p){await p.click('#begin');await p.click('[data-act=launch]');await p.click('[data-act=close]:visible');await p.waitForFunction(()=>emberwake.game.status==='playing'&&!emberwake.paused);await p.waitForTimeout(700)}
async function shot(p,name){await p.screenshot({path:`${out}/${name}.png`})}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});await ready(page);await shot(page,'title-desktop');
 await check('primary entry is supplied Emberwake, full viewport and no replacement runtime',async()=>{assert.ok((await page.title()).includes('EMBERWAKE'));assert.equal(await page.evaluate(()=>!!window.lumen),false);assert.equal(await page.locator('#world').evaluate(e=>e.clientWidth),1440);assert.equal(await page.locator('#world').evaluate(e=>e.clientHeight),900);assert.equal(await page.evaluate(()=>!!EW.Encounters&&!!EW_JOURNAL),true)});
 await start(page);await shot(page,'game-desktop');
 await check('native keyboard moves Lyra and ordinary double jump remains available',async()=>{let x=await page.evaluate(()=>emberwake.game.p.x);await page.keyboard.down('KeyD');await page.waitForFunction(x=>emberwake.game.p.x>x+35,x);await page.keyboard.up('KeyD');await page.keyboard.press('Space');await page.waitForFunction(()=>emberwake.game.p.jumps===1);await page.keyboard.press('Space');await page.waitForFunction(()=>emberwake.game.p.jumps===2)});
 await page.keyboard.press('Escape');await check('pause stops simulation and offers export',async()=>{const t=await page.evaluate(()=>emberwake.game.progress.stats.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>emberwake.game.progress.stats.time),t);const d=page.waitForEvent('download');await page.click('[data-act=export]:visible');assert.ok((await d).suggestedFilename().endsWith('.json'))});await shot(page,'pause-desktop');
 await page.click('#modal-content [data-act=codex]');await shot(page,'journal-desktop');await check('derived journal contains optional route and original letter states',async()=>{assert.ok((await page.locator('#modal-content').textContent()).includes('Springward Canopy'));assert.ok((await page.locator('#modal-content').textContent()).includes('0/2 letters remembered'))});await page.click('#modal-close');
 await page.keyboard.press('KeyM');await shot(page,'map-desktop');await check('unseen travel remains disabled and discovered travel is engine-owned',async()=>{assert.equal(await page.locator('[data-travel]:disabled').count(),2);assert.equal(await page.evaluate(()=>emberwake.game.canTravel(1)),false)});await page.click('#modal-close');
 await page.keyboard.press('Escape');await page.click('#modal-content [data-act=settings]');await page.selectOption('#set-quality','low');await check('low quality applies immediately',async()=>{assert.equal(await page.evaluate(()=>emberwake.settings.quality),'low');assert.ok(await page.locator('#world').evaluate(e=>e.width<=e.clientWidth+1))});await shot(page,'settings-desktop');await page.click('#modal-close');
 await check('V4 authoritative journey continuity, frozen V3 fallback and coherent offline release',async()=>{
  await page.keyboard.press('Escape');await page.waitForFunction(()=>emberwake.modalKind==='pause');
  const continuity=await page.evaluate(async()=>{
   const app=emberwake;if(!app.save().ok)throw Error('Continuity baseline save failed');
   const e=EW.ChapterSave.parseEnvelope(localStorage.getItem('EW_STORY_V4'),EW_LEVELS);if(!e)throw Error('Invalid current/previous envelope');
   // Valid conflicting frozen legacy fixtures: authoritative V4 must win on reload.
   const old=new EW.Game(EW_LEVELS).newRun('adventure').snapshot();old.gold=901;
   localStorage.setItem('EW_STORY_V3',JSON.stringify(old));localStorage.setItem('EW_STORY_V3.backup',JSON.stringify({...old,gold:902}));
   const rush=new EW.Game(EW_LEVELS).newRun('adventure','rush').snapshot();rush.gold=903;localStorage.setItem('EW_RUSH_V3',JSON.stringify(rush));
   const frozen=['EW_STORY_V3','EW_STORY_V3.backup','EW_RUSH_V3'].map(k=>[k,localStorage.getItem(k)]);
   const cache=await caches.open('lumen-correction-fixture');await cache.put(new URL('obsolete-fixture',location.href),new Response('old'));await navigator.serviceWorker.ready;
   return {envelope:e,frozen};
  });
  async function assertContinuity(){
   assert.deepEqual(await page.evaluate(()=>EW.ChapterSave.parseEnvelope(localStorage.getItem('EW_STORY_V4'),EW_LEVELS)),continuity.envelope,'Reload preserves authoritative current, previous and revision');
   assert.deepEqual(await page.evaluate(keys=>keys.map(k=>[k,localStorage.getItem(k)]),continuity.frozen.map(([k])=>k)),continuity.frozen,'Migration/continuity must never rewrite frozen legacy or rush bytes');
   assert.deepEqual(await page.evaluate(()=>emberwake.savedJourney),continuity.envelope.current);
  }
  await page.reload();await page.waitForFunction(()=>window.emberwake);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await assertContinuity();
  await page.click('#continue');await page.waitForFunction(()=>emberwake.game.progress?.version===3);
  assert.equal(await page.evaluate(()=>emberwake.game.progress.gold),continuity.envelope.current.base.gold);
  const cacheFiles=await page.evaluate(async()=>{const keys=await caches.keys(),key=keys.find(k=>k.startsWith('emberwake-'));const c=await caches.open(key);return {keys,files:(await c.keys()).map(x=>x.url)}});
  for(const file of ['encounters-v12.js','chapter-save.js','chapter-data.js','chapter-runtime.js'])assert.ok(cacheFiles.files.some(x=>x.endsWith(file)),'Offline release includes '+file);
  assert.ok(!cacheFiles.files.some(x=>x.includes('lumen-game')));
  // This unrelated cache is injected after activation; reload does not imply activation or ownership of it.
  // Native Continue legitimately advances campaign time. Quiesce and explicitly save it before testing byte-stable offline reload.
  await page.keyboard.press('Escape');await page.waitForFunction(()=>emberwake.modalKind==='pause');
  const next=await page.evaluate(()=>{if(!emberwake.save().ok)throw Error('Pre-offline save failed');return EW.ChapterSave.parseEnvelope(localStorage.getItem('EW_STORY_V4'),EW_LEVELS);});
  if(JSON.stringify(next.current)!==JSON.stringify(continuity.envelope.current)){assert.deepEqual(next.previous,continuity.envelope.current);assert.equal(next.revision,continuity.envelope.revision+1);}else assert.deepEqual(next,continuity.envelope);
  continuity.envelope=next;
  await page.context().setOffline(true);await page.reload();await page.waitForFunction(()=>window.emberwake);await assertContinuity();assert.equal(await page.locator('#continue').isVisible(),true);
  await page.click('#continue');await page.waitForFunction(()=>emberwake.game.status==='playing');await page.context().setOffline(false);
 });
 await check('guardian render fixtures show locked telegraphs and truthful HUD labels',async()=>{for(let i=0;i<3;i++){await page.evaluate(i=>{const a=emberwake,g=a.game;a.hard=false;a.close();for(let n=0;n<=i;n++){const l=g.levels[n];g.flag('seen',l.id);for(const s of l.sigils){g.flag('runes',s.id);g.flag('sigils',s.id);}if(n<i)g.flag('defeated',l.boss.id);}g.loadLevel(i);g.p.x=g.boss.arena[0]+100;g.triggerBoss();a.process();a.hard=false;a.close();g.boss.t=0;g.updateBoss(1/120);a.updateHUD();a.clearInput();a.chapterUntil=0;a.toastUntil=0;document.getElementById('chapter').hidden=true;document.getElementById('toast').hidden=true;a.renderer.cam=Math.max(0,Math.min(g.level.width-a.renderer.w,g.p.x-a.renderer.w*.39+g.p.face*55));if(!EW.validateSave(g.snapshot(),EW_LEVELS))throw Error('Invalid guardian fixture');},i);assert.ok(await page.evaluate(()=>emberwake.game.bossTelegraphs.length>0));assert.ok(!(await page.locator('#boss-state').textContent()).includes('CHARGE'));await shot(page,['warden-warning','forge-warning','regent-warning'][i]);}});
 await page.close();
 for(const [name,width,height]of [['mobile',390,844],['landscape',844,390]]){const p=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});await ready(p);await shot(p,'title-'+name);await start(p);await shot(p,'game-'+name);await check(name+' viewport, usable touch targets and bounded interaction prompt',async()=>{assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);assert.equal(await p.locator('#world').evaluate(e=>e.clientHeight),height);assert.ok(await p.locator('#prompt').evaluate(e=>e.getBoundingClientRect().height<=72));for(const el of await p.locator('#touchdock button').all()){const r=await el.boundingBox();assert.ok(r.width>=44&&r.height>=44);assert.ok(r.x>=0&&r.x+r.width<=width&&r.y+r.height<=height)}});
 await check(name+' native touch movement releases cleanly',async()=>{const c=await p.context().newCDPSession(p),r=await p.locator('[data-touch=right]').boundingBox(),x=await p.evaluate(()=>emberwake.game.p.x);await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});await p.waitForFunction(x=>emberwake.game.p.x>x+25,x);await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>emberwake.held.size),0);});await p.close();}
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);checks.push('zero missing assets and runtime exceptions');
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({passed:checks.length,checks,errors,failures,scope:'Local Chromium HTTP project prefix; actual DOM keyboard/touch/download/offline. Guardian screenshots use explicitly positioned encounter fixtures, not campaign proof. No physical phone/controller/Safari/FPS or accessibility certification.'},null,2));console.log(JSON.stringify({passed:checks.length}));
}finally{await browser.close()}
