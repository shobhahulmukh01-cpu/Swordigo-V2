import {chromium} from '@playwright/test';
import fs from 'node:fs';import assert from 'node:assert/strict';
const base=process.env.EW_URL||'http://127.0.0.1:4173/Swordigo-V2/';
const out=process.env.EW_HUD_OUTPUT||'qa/correction/hud-browser';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox']});const results=[],errors=[];
function intersects(a,b){return a&&b&&a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;}
try{for(const [name,width,height,touch] of [['portrait',390,844,true],['landscape',844,390,true],['desktop',1440,900,false]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.waitForFunction(()=>window.emberwake&&window.EW_SEQUEL_PRESENTATION);
 await p.screenshot({path:`${out}/title-${name}.png`});
 const click=async s=>touch?p.locator(s).tap():p.locator(s).click();
 await click('#begin');await click('[data-act=launch]');await click('#modal-close');await p.waitForFunction(()=>emberwake.game.status==='playing'&&!emberwake.paused);await p.waitForTimeout(700);
 await p.screenshot({path:`${out}/fresh-${name}.png`});
 if(!touch){const mapYields=await p.evaluate(()=>{const app=emberwake,r=app.renderer,guide=document.getElementById('guide');let calls=0;const original=r.c.fillText;r.c.fillText=function(text,...args){if(text==='THE PATH AHEAD')calls++;return original.call(this,text,...args);};try{r.draw(0);return {visible:!guide.hidden&&guide.getClientRects().length>0&&getComputedStyle(guide).display!=='none',calls};}finally{r.c.fillText=original;}});assert(mapYields.visible,'desktop helper fixture actually visible');assert.equal(mapYields.calls,0,'map yields to visible helper');}

 // A reload uses the real newly earned initial save and the ordinary Continue action.
 await p.reload();await p.waitForFunction(()=>window.emberwake);await click('#continue');await p.waitForFunction(()=>emberwake.game.status==='playing'&&!emberwake.paused);await p.waitForTimeout(100);
 const objective=await p.locator('.objective').boundingBox(),prompt=await p.locator('#prompt').boundingBox(),toast=await p.locator('#toast').boundingBox();
 assert(await p.locator('.objective').isVisible(),'persistent objective visible '+name);assert(!intersects(objective,prompt),'direction/prompt separate '+name);assert(!intersects(toast,prompt),'toast/prompt separate '+name);assert(!intersects(toast,objective),'toast/direction separate '+name);
 const toastText=await p.locator('#toast').textContent();assert(!toastText.includes(' · K'),'no stale welcome key');
 await p.screenshot({path:`${out}/return-${name}.png`});results.push({name,objective,prompt,toast,toastText});await context.close();
}
// Explicitly positioned guardian render fixtures, not input-earned campaign proof.
// The retained guardian suite covers desktop; verify both touch HUD orientations.
const guardianFixtures=[];
for(const [viewport,width,height] of [['portrait',390,844],['landscape',844,390]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.waitForFunction(()=>window.emberwake);
 await p.locator('#begin').tap();await p.locator('[data-act=launch]').tap();await p.locator('#modal-close').tap();
 for(let i=0;i<3;i++){
  const layout=await p.evaluate(i=>{
   const a=emberwake,g=a.game;a.hard=false;a.close();
   for(let n=0;n<=i;n++){const l=g.levels[n];g.flag('seen',l.id);for(const s of l.sigils){g.flag('runes',s.id);g.flag('sigils',s.id);}if(n<i)g.flag('defeated',l.boss.id);}
   g.loadLevel(i);g.p.x=g.boss.x-(i===1?40:140);g.p.y=536;g.triggerBoss();a.process();a.hard=false;a.close();g.boss.t=0;g.updateBoss(1/120);
   a.clearInput();a.chapterUntil=0;a.toastUntil=0;a.paused=false;a.running=false;a.updateHUD();a.renderer.resize();a.renderer.cam=Math.max(0,Math.min(g.level.width-a.renderer.w,g.p.x-a.renderer.w*.39+g.p.face*55));a.renderer.draw(0);
   document.getElementById('chapter').hidden=true;document.getElementById('toast').hidden=true;
   if(!EW.validateSave(g.snapshot(),EW_LEVELS))throw Error('Invalid guardian fixture');
   const r=a.renderer,canvas=r.canvas.getBoundingClientRect(),hud=document.getElementById('boss-hud').getBoundingClientRect();
   const visibleWarnings=g.bossTelegraphs.filter(m=>m.x-r.cam>24&&m.x-r.cam<r.w-24).length;
   return {hudBottom:hud.bottom,heroTop:canvas.top+(g.p.y-(r.camY||0))*r.sy,warningCount:g.bossTelegraphs.length,visibleWarnings,bossOnscreen:g.boss.x-r.cam>=0&&g.boss.x+g.boss.w-r.cam<=r.w,warningRendererEnabled:!a.paused,objectiveVisible:getComputedStyle(document.querySelector('.objective')).display!=='none'};
  },i);
  assert(layout.warningCount>0&&layout.visibleWarnings>0&&layout.warningRendererEnabled,'actual rendered onscreen guardian warning required');assert(layout.bossOnscreen,'fixture must show the guardian');assert(layout.hudBottom<layout.heroTop-8,'guardian HUD clears hero and floor warnings: '+JSON.stringify({viewport,i,...layout}));assert.equal(layout.objectiveVisible,false,'combat replaces redundant objective lane');
  const filename=`guardian-${i+1}-${viewport}.png`;await p.screenshot({path:`${out}/${filename}`});guardianFixtures.push({viewport,guardian:i+1,filename,...layout});
 }
 await context.close();
}
assert.equal(errors.length,0,'no runtime exceptions');const report={status:'pass',captures:15,errors,results,guardianFixtures,guardianScope:'Six explicit render fixtures, not earned campaigns, device or performance qualification.'};fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));}finally{await browser.close();}
