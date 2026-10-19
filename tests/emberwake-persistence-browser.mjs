// Isolated browser/storage fixtures, not campaign-completion evidence. No server/build ownership.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const url=process.env.EW_URL||'http://127.0.0.1:4173/Swordigo-V2/';
const executablePath=process.env.CHROME_BIN||['/usr/local/bin/chromium','/usr/bin/chromium'].find(p=>fs.existsSync(p));
const args=process.env.EW_NO_SANDBOX==='1'?['--no-sandbox']:[];
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args});
const results=[],frozenByPage=new WeakMap();
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
  assert.equal(await page.evaluate(()=>EW.ChapterSave?.KEY),'EW_STORY_V4','Server must include frozen chapter persistence API');
  assert.equal(await page.evaluate(()=>EWClient.persistenceSafety),'transactional-v1','Server must serve latest assigned journey source; parent rebuild required otherwise.');
  await fn(page);await assertFrozen(page);assert.deepEqual(errors,[],'Unexpected browser errors');results.push({name,pass:true});console.log('PASS '+name);
 }catch(e){results.push({name,pass:false,error:e.message});console.error('FAIL '+name+': '+e.message);}
 finally{await context.close();}
}
async function seed(page){
 await page.evaluate(()=>{
  const s=new EW.Game(EW_LEVELS).newRun('adventure').snapshot();s.gold=111;
  localStorage.setItem('EW_STORY_V3',JSON.stringify(s));
  localStorage.setItem('EW_STORY_V3.backup',JSON.stringify({...s,gold:9}));
  const rush=new EW.Game(EW_LEVELS).newRun('adventure','rush').snapshot();rush.gold=77;localStorage.setItem('EW_RUSH_V3',JSON.stringify(rush));
 });
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.emberwake?.savedStory?.gold===111);
 await page.evaluate(()=>{window.__frozenLegacy=['EW_STORY_V3','EW_STORY_V3.backup','EW_RUSH_V3'].map(k=>[k,localStorage.getItem(k)]);});
 frozenByPage.set(page,await page.evaluate(()=>__frozenLegacy));
 assert.equal(await page.evaluate(()=>localStorage.getItem('EW_STORY_V4')),null,'Reading V3 fallback must not silently write migration');
 assert.deepEqual(await page.evaluate(()=>emberwake.savedJourney.chapter),await page.evaluate(()=>EW.ChapterSave.blankChapter()));
 await page.locator('#continue').click();await page.waitForFunction(()=>emberwake.game.status==='playing'&&!emberwake.paused);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>emberwake.modalKind==='pause');
 assert.equal(await page.evaluate(()=>emberwake.save().ok),true);
 assert.equal((await envelope(page)).current.base.gold,111);await assertFrozen(page);
}
async function fixtureFile(page,gold,name='journey.json'){
 const text=await page.evaluate(gold=>{const s=new EW.Game(EW_LEVELS).newRun('adventure').snapshot();s.gold=gold;return JSON.stringify(s);},gold);
 await page.locator('#import-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text)});
 if(name.startsWith('slow-'))await page.waitForFunction(name=>__pendingReads.some(r=>r.name===name),name);
 else await page.waitForFunction(()=>emberwake.modalKind==='restore');
}
async function release(page,name){await page.evaluate(name=>{const r=__pendingReads.find(r=>r.name===name);if(!r)throw Error('Missing delayed fixture');r.release();},name);await page.waitForTimeout(100);}
async function assertFrozen(page){
 const expected=frozenByPage.get(page);assert.ok(expected,'Frozen legacy baseline must be recorded');
 const actual=await page.evaluate(keys=>keys.map(k=>[k,localStorage.getItem(k)]),expected.map(([k])=>k));
 assert.deepEqual(actual,expected,'V3 primary/backup and rush bytes must remain frozen');
}
async function envelope(page){
 const e=await page.evaluate(()=>EW.ChapterSave.parseEnvelope(localStorage.getItem('EW_STORY_V4'),EW_LEVELS));
 assert.ok(e,'Stored V4 current AND previous must validate');return e;
}
async function fault(page,kind){
 await page.evaluate(kind=>{
  const app=emberwake,real=localStorage;window.__writes=[];
  // Explicit isolated fixture: earned-but-not-yet-persisted current progress.
  app.game.progress.gold=333;window.__originalGame=app.game;
  if(kind==='revision-conflict'){const e=JSON.parse(real.getItem('EW_STORY_V4'));e.revision++;real.setItem('EW_STORY_V4',JSON.stringify(e));}
  window.__beforeEnvelope=real.getItem('EW_STORY_V4');
  app.storage={getItem(k){if(kind==='denied')throw new DOMException('Denied','SecurityError');return real.getItem(k);},
   setItem(k,v){__writes.push({key:k,value:v});
    const gold=(()=>{try{return JSON.parse(v).current?.base.gold;}catch(_){return null;}})();
    if(kind==='preserve-quota'&&k==='EW_STORY_V4')throw new DOMException('Quota','QuotaExceededError');
    if(kind==='target-quota'&&k==='EW_STORY_V4'&&gold===444)throw new DOMException('Quota','QuotaExceededError');
    if(kind==='new-target'&&k==='EW_STORY_V4'&&gold===0)throw new DOMException('Quota','QuotaExceededError');
    real.setItem(k,v);
   }};
 },kind);
}
async function assertFailedStorage(page,kind){
 const before=await page.evaluate(()=>JSON.parse(__beforeEnvelope)),e=await envelope(page);
 if(['target-quota','new-target'].includes(kind)){
  assert.equal(e.current.base.gold,333);assert.deepEqual(e.previous,before.current);
  assert.equal(e.revision,before.revision+1,'Only preservation may advance revision on failed target');
 }else assert.equal(await page.evaluate(()=>localStorage.getItem('EW_STORY_V4')),await page.evaluate(()=>__beforeEnvelope),'Failed preservation leaves entire envelope byte-identical');
 const writes=await page.evaluate(()=>__writes);
 assert.ok(writes.every(w=>w.key==='EW_STORY_V4'),'Story transaction writes only authoritative key');
 if(kind==='denied'||kind==='revision-conflict')assert.equal(writes.length,0);
 else assert.equal(writes.length,['target-quota','new-target'].includes(kind)?2:1);
 await assertFrozen(page);
}
async function assertUnchangedLive(page,before){
 assert.equal(await page.evaluate(()=>emberwake.game===__originalGame),true,'Abort must keep current runtime object/fight');
 assert.deepEqual(await page.evaluate(()=>emberwake.game.snapshot()),before);
 assert.match(await page.locator('#toast').innerText(),/Journey not replaced.*Export your current journey/s);
}
try{
 for(const kind of ['denied','preserve-quota','target-quota','revision-conflict']){
  await scenario('native confirmed import aborts safely: '+kind,async page=>{
   await seed(page);await fault(page,kind);await fixtureFile(page,444);
   const before=await page.evaluate(()=>emberwake.game.snapshot());
   await page.locator('[data-act="import-accept"]').click();await assertUnchangedLive(page,before);
   assert.equal(await page.evaluate(()=>emberwake.modalKind),'restore');
   await assertFailedStorage(page,kind);
   const download=page.waitForEvent('download');await page.locator('[data-act="export-current"]').click();
   assert.match((await download).suggestedFilename(),/emberwake.*json/);
   await page.locator('[data-act="import-cancel"]').click();
  });
 }
 await scenario('successful native restore preserves unsaved current journey as rolling backup',async page=>{
  await seed(page);await page.evaluate(()=>{emberwake.game.progress.gold=333;});
  const priorEnvelope=await envelope(page),preserved=await page.evaluate(()=>EW.ChapterSave.normalizePayload(emberwake.portableJourney(),EW_LEVELS));
  await fixtureFile(page,444);
  await page.locator('[data-act="import-accept"]').click();await page.waitForFunction(()=>emberwake.game.progress.gold===444&&!emberwake.paused);
  await page.keyboard.press('Escape');
  const restored=await envelope(page);assert.equal(restored.current.base.gold,444);assert.deepEqual(restored.previous,preserved);assert.equal(restored.revision,priorEnvelope.revision+2,'Preserve and target are distinct successful authoritative writes');
  assert.deepEqual(restored.current.chapter,await page.evaluate(()=>EW.ChapterSave.blankChapter()),'Original V3 import migrates to blank chapter');
  // Quiesce the current progress first: active-frame time may legitimately differ from the restored snapshot.
  assert.equal(await page.evaluate(()=>emberwake.save().ok),true);
  const stable=await page.evaluate(()=>localStorage.getItem('EW_STORY_V4'));const prior=await envelope(page);
  assert.equal(await page.evaluate(()=>emberwake.save().ok),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('EW_STORY_V4')),stable,'Identical normalized save retains entire envelope including previous and revision');
  assert.deepEqual(await envelope(page),prior);await assertFrozen(page);
  await page.reload();await page.waitForFunction(()=>window.emberwake?.savedStory?.gold===444);
  await page.locator('#continue').click();await page.waitForFunction(()=>emberwake.game.progress.gold===444);
 });
 for(const kind of ['denied','preserve-quota','new-target','revision-conflict']){
  await scenario('native new-journey confirmation aborts safely: '+kind,async page=>{
   await seed(page);
   await page.locator('[data-act="title"]').click();await page.locator('[data-act="new"]').click();
   await page.locator('[data-act="launch"]').click();await page.waitForFunction(()=>emberwake.modalKind==='replace');
   // Fault begins after native title/new navigation: title correctly refuses an unsavable journey.
   await fault(page,kind);
   const before=await page.evaluate(()=>emberwake.game.snapshot());
   await page.locator('[data-act="launch-confirm"]').click();await assertUnchangedLive(page,before);
   assert.equal(await page.evaluate(()=>emberwake.modalKind),'replace');
   await assertFailedStorage(page,kind);
   await page.locator('[data-act="new-cancel"]').click();
  });
 }
 await scenario('successful confirmed new journey does not immediately overwrite retained backup',async page=>{
  await seed(page);await page.evaluate(()=>{emberwake.game.progress.gold=333;});
  await page.locator('[data-act="title"]').click();await page.locator('[data-act="new"]').click();await page.locator('[data-act="launch"]').click();
  const preserved=await envelope(page);
  await page.locator('[data-act="launch-confirm"]').click();await page.waitForFunction(()=>emberwake.modalKind==='dialogue');
  assert.equal(await page.evaluate(()=>emberwake.game.progress.gold),0);
  const e=await envelope(page);assert.equal(e.current.base.gold,0);assert.deepEqual(e.previous,preserved.current);assert.equal(e.revision,preserved.revision+1);await assertFrozen(page);
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
  await seed(page);const stored=await page.evaluate(()=>localStorage.getItem('EW_STORY_V4'));
  await fixtureFile(page,555,'slow-old.json');await fixtureFile(page,666,'slow-new.json');
  await release(page,'slow-new.json');await page.waitForFunction(()=>emberwake.modalKind==='restore');
  assert.equal(await page.evaluate(()=>emberwake._importCandidate.base.gold),666);
  await release(page,'slow-old.json');assert.equal(await page.evaluate(()=>emberwake._importCandidate.base.gold),666);
  await page.locator('[data-act="import-cancel"]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('EW_STORY_V4')),stored);
 });
 await scenario('authored reward commit writes V4 atomically and keeps frozen V3 bytes',async page=>{
  await seed(page);
  const setup=await page.evaluate(()=>{
   const app=emberwake,g=app.game,p=app.portableJourney();
   p.chapter.active=true;p.chapter.discovered=['ch1:main:moonroot','ch1:room:millpond'];
   p.chapter.mechanisms=['ch1:mechanism:valve-west','ch1:mechanism:valve-east'];p.chapter.items=['ch1:item:water-letter'];
   if(!EW.ChapterSave.normalizePayload(p,EW_LEVELS)||!g.resumeJourney(p))throw Error('Invalid authored delivery fixture');
   // Isolated positioned interaction fixture, not exploration/campaign proof.
   const m=Object.values(EW.ChapterData.interactions).find(m=>m.deliveryId==='ch1:delivery:water-remembers'||m.id==='ch1:delivery:water-remembers');
   if(!m)throw Error('Missing authored delivery');g.p.x=m.x-65;g.p.y=m.y-54;
   const preconditions={status:g.status,scene:g.scene?.id,authoredScene:m.sceneId,requirements:g.chapterRequirements(m.requirements),danger:g.chapterCombatDanger(),dx:Math.abs(g.p.x+14-m.x),dy:Math.abs(g.p.y+54-m.y),liveEnemies:g.enemies.filter(e=>e.hp>0).length};
   if(preconditions.status!=='playing'||preconditions.scene!==preconditions.authoredScene||!preconditions.requirements||preconditions.danger||preconditions.dx>=68||preconditions.dy>=85||!preconditions.liveEnemies)throw Error('Delivery fixture preconditions: '+JSON.stringify(preconditions));
   app.attachJourney(g);if(!app.save().ok)throw Error('Fixture baseline did not persist');
   window.__rewardId=m.id;return {payload:g.snapshotJourney(),raw:localStorage.getItem('EW_STORY_V4'),revision:app.storyRevision};
  });
  for(const kind of ['denied','quota']){
   const r=await page.evaluate(kind=>{
    const app=emberwake,real=app.storage;let writes=0;
    app.storage={getItem(k){if(kind==='denied')throw new DOMException('Denied','SecurityError');return localStorage.getItem(k);},setItem(){writes++;throw new DOMException('Quota','QuotaExceededError');}};
    const ok=app.game.chapterInteract(__rewardId);app.storage=real;return {ok,writes,payload:app.game.snapshotJourney(),raw:localStorage.getItem('EW_STORY_V4'),revision:app.storyRevision};
   },kind);
   assert.equal(r.ok,false);assert.equal(r.writes,kind==='denied'?0:1,'Failure must reach intended storage gate');assert.deepEqual(r.payload,setup.payload);assert.equal(r.raw,setup.raw);assert.equal(r.revision,setup.revision);await assertFrozen(page);
  }
  assert.equal(await page.evaluate(()=>emberwake.game.chapterInteract(__rewardId)),true);
  const paid=await envelope(page);assert.equal(paid.current.base.gold,171);assert.deepEqual(paid.current.chapter.deliveries,['ch1:delivery:water-remembers']);
  assert.deepEqual(paid.previous,setup.payload);assert.equal(paid.revision,setup.revision+1);await assertFrozen(page);
  assert.equal(await page.evaluate(()=>emberwake.game.chapterInteract(__rewardId)),true);
  assert.deepEqual(await envelope(page),paid,'Repeated delivery neither repays nor rotates previous');
  const frozen=await page.evaluate(()=>__frozenLegacy);await page.reload();await page.waitForFunction(()=>window.emberwake?.savedStory?.gold===171);
  await page.evaluate(f=>window.__frozenLegacy=f,frozen);await assertFrozen(page);
  assert.equal(await page.evaluate(()=>EW.ChapterSave.prepareDelivery(emberwake.savedJourney,'ch1:delivery:water-remembers',EW_LEVELS).reward),0,'Reload retains once-only delivery');
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
