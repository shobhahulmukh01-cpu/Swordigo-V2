import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';import fs from 'node:fs';
const output=process.env.EW_CHAPTER_OUTPUT||'qa/correction/chapter-browser';fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||['/usr/local/bin/chromium','/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>fs.existsSync(p)),headless:true,args:['--no-sandbox']});const ctx=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let report={kind:'Native keyboard room-delivery traversal, fresh new journey, no game/position/fact injections',pass:false};
const observe=()=>page.evaluate(()=>{const a=emberwake,g=a.game;return {x:g.p?.x,y:g.p?.y,hp:g.p?.hp,mp:g.p?.mp,scene:g.scene?.id,status:g.status,modal:a.modalKind,near:g.near,playing:!a.paused,enemies:g.enemies.filter(e=>e.hp>0).map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,type:e.type})),items:g.chapter.items,mechs:g.chapter.mechanisms,deliveries:g.chapter.deliveries,gold:g.progress.gold,held:[...a.held.entries()],physical:a._physicalKeys?[...a._physicalKeys]:[]};});
async function dialogs(){for(let i=0;i<8;i++){const o=await observe();if(o.modal!=='dialogue')return;for(const k of ['KeyA','KeyD','KeyJ','KeyK','Space'])await page.keyboard.up(k);dir=null;await page.locator('[data-act="dialog-next"]').click();await page.waitForTimeout(60);}}
async function interactFact(category,id){for(let attempt=0;attempt<3;attempt++){await axis(null);for(const k of ['KeyJ','KeyK','Space','KeyE'])await page.keyboard.up(k);await dialogs();await page.keyboard.press('KeyE');try{await page.waitForFunction(([category,id])=>emberwake.game.chapter[category].includes(id),[category,id],{timeout:2500});await dialogs();return;}catch(_){await dialogs();}}throw Error('Native interaction did not acquire '+id+' '+JSON.stringify(await observe()));}
let dir=null;async function axis(d){for(const k of ['KeyA','KeyD'])await page.keyboard.up(k);dir=d;if(d)await page.keyboard.down(d);}
async function move(target,timeout=45000){const start=Date.now();while(Date.now()-start<timeout){await dialogs();const o=await observe();if(o.status==='dead'){await axis(null);await page.locator('[data-act="respawn"]').click();continue;}if(o.hp<45)await page.keyboard.press('KeyR');const delta=target-o.x;if(Math.abs(delta)<32){await axis(null);await page.keyboard.up('KeyJ');await page.keyboard.up('KeyK');await page.waitForTimeout(100);return;}
 await axis(delta>0?'KeyD':'KeyA');await page.keyboard.down('KeyJ');await page.keyboard.down('KeyK');if(o.x>760&&o.x<990&&o.scene==='ch1:room:millpond'){await page.keyboard.down('Space');await page.waitForTimeout(300);await page.keyboard.up('Space');}else await page.waitForTimeout(90);}
 throw Error('Movement timeout to '+target+' '+JSON.stringify(await observe()));}
async function clearFoes(){for(let ix=0;ix<20;ix++){const o=await observe();if(!o.enemies.length)return;const e=o.enemies.sort((a,b)=>Math.abs(a.x-o.x)-Math.abs(b.x-o.x))[0];await move(e.x-75,20000);await page.keyboard.down('KeyJ');await page.keyboard.down('KeyK');await axis(e.x>(await observe()).x?'KeyD':'KeyA');await page.waitForTimeout(120);await axis(null);for(let n=0;n<8;n++){if(e.type==='wisp'){await page.keyboard.down('Space');await page.waitForTimeout(400);await page.keyboard.up('Space');await page.waitForTimeout(350);}else await page.waitForTimeout(300);await dialogs();if(!(await observe()).enemies.some(x=>x.id===e.id))break;}await page.keyboard.up('KeyJ');await page.keyboard.up('KeyK');}
 throw Error('Combat clearing timeout '+JSON.stringify(await observe()));}
try{
 await page.goto(process.env.EW_URL||'http://127.0.0.1:4173/Swordigo-V2/');await page.waitForFunction(()=>!!window.emberwake);await page.locator('#begin').click();await page.locator('[data-act="launch"]').click();await dialogs();
 // Optional advice is a native, non-granting journal action for this journey.
 await page.keyboard.press('KeyI');await page.locator('[data-act="aster-advice"]').click();
 assert.match(await page.locator('#aster-advice-text').textContent(),/Millpond door|irrigation valves/);
 const adviceFacts=await page.evaluate(()=>JSON.stringify({chapter:emberwake.game.chapter,gold:emberwake.game.progress.gold}));
 await page.locator('[data-act="advice-journal"]').click();await page.locator('[data-act="aster-advice"]').click();
 assert.equal(await page.evaluate(()=>JSON.stringify({chapter:emberwake.game.chapter,gold:emberwake.game.progress.gold})),adviceFacts);
 await page.locator('[data-act="close"]').last().click();report.nativeAdvice=true;
 await move(620);await page.keyboard.down('KeyJ');await page.keyboard.down('KeyK');await page.waitForTimeout(1400);await page.keyboard.up('KeyJ');await page.keyboard.up('KeyK');await move(730);await page.keyboard.press('KeyE');await page.waitForFunction(()=>emberwake.game.scene.id==='ch1:room:millpond');report.roomEntered=true;await clearFoes();
 await move(386);await interactFact('mechanisms','ch1:mechanism:valve-west');await move(1536);await interactFact('mechanisms','ch1:mechanism:valve-east');await move(1696);await interactFact('items','ch1:item:water-letter');assert.ok((await observe()).items.includes('ch1:item:water-letter'));
 await page.screenshot({path:output+'/earned-millpond-desktop.png'});
 await move(130);await page.keyboard.press('KeyE');await page.waitForFunction(()=>emberwake.game.scene.id==='ch1:main:moonroot');await move(261);const before=(await observe()).gold;await page.keyboard.press('KeyE');await page.waitForTimeout(250);const after=await observe();assert.ok(after.deliveries.includes('ch1:delivery:water-remembers'));assert.equal(after.gold,before+60);const durable=await page.evaluate(()=>JSON.parse(localStorage.getItem('EW_STORY_V4')).current);assert.ok(durable.chapter.deliveries.includes('ch1:delivery:water-remembers'));assert.equal(durable.base.gold,after.gold);assert.deepEqual(errors,[]);report={...report,pass:true,beforeGold:before,afterGold:after.gold,chapter:durable.chapter};
 // The following completed-import cases are explicit UI fixtures, not earned
 // original campaigns. They prove both native post-ending route connections.
 report.postEndingUI=[];
 for(const ending of ['mercy','rekindle']){
  for(const key of ['KeyA','KeyD','KeyJ','KeyK','Space'])await page.keyboard.up(key);dir=null;
  const payload=await page.evaluate(ending=>{const g=new EW.Game(EW_LEVELS).newRun();for(const l of EW_LEVELS){g.flag('seen',l.id);g.flag('defeated',l.boss.id);for(const e of l.enemies)g.flag('defeated',e.id);for(const r of l.sigils){g.flag('runes',r.id);g.flag('sigils',r.id);}}g.loadLevel(2);g.finish(ending);return g.snapshotJourney();},ending);
  await page.locator('#import-file').setInputFiles({name:'completed-'+ending+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  await page.locator('[data-act="import-accept"]').click();await page.waitForFunction(()=>emberwake.game.status==='won');
  assert.equal((await observe()).scene,'ch1:main:hollowspire');await page.locator('[data-act="continue-deliveries"]').click();
  await page.waitForFunction(()=>emberwake.game.scene.id==='ch1:main:moonroot'&&!emberwake.paused);
  const beforeStats=await page.evaluate(()=>JSON.stringify(emberwake.game.progress.stats));
  for(const index of [1,2]){await page.keyboard.press('KeyM');const button=page.locator('[data-travel="'+index+'"]');assert.equal(await button.isEnabled(),true);await button.click();await page.waitForFunction(index=>emberwake.game.sceneRealmIndex===index&&!emberwake.paused,index);}
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>emberwake.game.scene.id==='ch1:room:star-archive');assert.equal(await page.evaluate(()=>emberwake.game.bossActive),false);
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>emberwake.game.scene.id==='ch1:main:hollowspire');
  assert.deepEqual(await page.evaluate(()=>({ending:emberwake.game.progress.ending,level:emberwake.game.progress.level,completed:emberwake.game.progress.completed,stats:JSON.stringify(emberwake.game.progress.stats)})),{ending,level:2,completed:true,stats:beforeStats});// Round-trip return saved a Hollowspire chapter anchor. Reload must show
  // the ending first, then explicitly resume that anchor, not Moonroot.
  const savedAnchor=await page.evaluate(()=>JSON.parse(localStorage.getItem('EW_STORY_V4')).current.chapter.anchor);
  assert.equal(savedAnchor.sceneId,'ch1:main:hollowspire');await page.reload();await page.waitForFunction(()=>window.emberwake);
  await page.locator('#continue').click();await page.waitForFunction(()=>emberwake.game.status==='won');
  await page.locator('[data-act="continue-deliveries"]').click();await page.waitForFunction(()=>emberwake.game.scene.id==='ch1:main:hollowspire'&&!emberwake.paused);
  assert.equal(await page.evaluate(()=>emberwake.game.chapter.anchor.anchorId),savedAnchor.anchorId);
  report.postEndingUI.push({ending,pass:true,savedAnchor,scope:'completed-import fixture; native map travel through three main realms, Archive door round trip, reload ending and explicit saved-anchor continuation'});
 }
 assert.deepEqual(errors,[]);

}catch(e){report.pass=false;report.error=e.stack;report.observation=await observe().catch(()=>null);await page.screenshot({path:output+'/failure.png'}).catch(()=>{});}finally{await browser.close();fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,error:report.error?.split('\n')[0],roomEntered:report.roomEntered}));if(!report.pass)process.exitCode=1;}
