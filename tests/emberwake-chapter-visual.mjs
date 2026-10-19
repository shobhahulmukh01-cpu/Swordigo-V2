/** Isolated render fixtures, NOT earned gameplay or performance qualification.
 * Run only after parent build/server. No builds or production-file mutations.
 */
import {chromium} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const output=process.env.EW_VISUAL_OUTPUT||'qa/correction/chapter-visual';fs.mkdirSync(output,{recursive:true});
const executablePath=process.env.CHROME_BIN||['/usr/local/bin/chromium','/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox']}),shots=[],errors=[];
const url=process.env.EW_URL||'http://127.0.0.1:4173/Swordigo-V2/';
try{for(const [viewport,width,height] of [['desktop',1440,1000],['portrait',390,844]]){
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',isMobile:viewport==='portrait',hasTouch:viewport==='portrait'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push({viewport,error:e.message}));await page.goto(url);await page.waitForFunction(()=>window.emberwake);await page.waitForTimeout(250);
 for(const fixture of [
  {slug:'millpond',x:400,kind:'valve'},
  {slug:'millpond',x:1600,kind:'water-desk'},
  {slug:'cooling-gallery',x:420,kind:'vent'},
  {slug:'cooling-gallery',x:1770,kind:'coal'},
  {slug:'rootcellar',x:390,kind:'desk'},
  {slug:'rootcellar',x:1440,kind:'charter'},
  {slug:'star-archive',x:790,kind:'records'},
  {slug:'star-archive',x:1450,kind:'engine-warning'},
  {slug:'moonroot',main:true,x:250,kind:'delivery-absent'},
  {slug:'moonroot',main:true,x:250,kind:'delivery-present'},
  {slug:'cinderworks',main:true,x:300,kind:'delivery-absent'},
  {slug:'cinderworks',main:true,x:300,kind:'delivery-present'},
  {slug:'hollowspire',main:true,x:300,kind:'delivery-absent'},
  {slug:'hollowspire',main:true,x:300,kind:'delivery-present'}]){
  const state=await page.evaluate(f=>{
   const a=emberwake,g=a.game;g.newRun();for(const l of EW_LEVELS){g.flag('seen',l.id);g.flag('defeated',l.boss.id);for(const r of l.sigils){g.flag('runes',r.id);g.flag('sigils',r.id);}}
   g.loadLevel(2);g.finish('mercy');g.continueDeliveries();
   const scene='ch1:'+(f.main?'main:':'room:')+f.slug,anchor=Object.values(EW.ChapterData.anchors).find(x=>x.sceneId===scene);if(!anchor)throw Error('No fixture anchor '+scene);g.switchChapterScene(scene,anchor.id);
   // These seeded facts are render-only fixtures; never exported as earned evidence.
   if(f.kind==='delivery-present')g.chapter.deliveries=Object.keys(EW.ChapterData.deliveries);
   a.enterGame();a.process();a.hard=false;a.modalKind=null;a.paused=false;document.getElementById('modal').hidden=true;a.running=false;
   g.p.x=f.x;g.p.y=536;g.p.inv=0;
   if(f.kind==='engine-warning'){
    g.bossActive=true;g.boss.state='idle';g.boss.t=0;
    // Initialize the actual encounter's private warning state; never spoof its getter.
    g.updateBoss(1/120);if(!g.bossTelegraphs.some(m=>m.phase==='warning'))throw Error('Missing actual warning fixture');
   }
   a.renderer.fx=[];a.renderer.labels=[];a.updateHUD();a.renderer.resize();a.renderer.cam=Math.max(0,g.p.x-a.renderer.w*.5);a.renderer.draw(0);
   document.getElementById('chapter').hidden=true;document.getElementById('toast').hidden=true;
   return {scene:g.scene.id,kind:f.kind,chapter:g.chapter,canvas:{width:a.renderer.w,height:a.renderer.h}};
  },fixture);
  await page.waitForTimeout(70);await page.evaluate(()=>emberwake.renderer.draw(0));
  const filename=`${fixture.slug}-${fixture.kind}-${viewport}.png`,file=path.join(output,filename);await page.screenshot({path:file});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,filename+' horizontal document overflow');
  if(fixture.kind==='engine-warning'&&viewport==='portrait'){
   const layout=await page.evaluate(()=>{const box=document.getElementById('boss-hud').getBoundingClientRect(),canvas=document.getElementById('world').getBoundingClientRect(),r=emberwake.renderer,g=emberwake.game;const feet=canvas.top+(g.p.y+54-(r.camY||0))*r.sy;return {hudBottom:box.bottom,heroTop:feet-54*r.sy,feet,warningCount:g.bossTelegraphs.length,objectiveVisible:getComputedStyle(document.querySelector('.objective')).display!=='none'};});
   assert(layout.warningCount>0,'real warning fixture required');assert(layout.hudBottom<layout.heroTop-8,'portrait boss readout obscures hero/floor warnings: '+JSON.stringify(layout));assert.equal(layout.objectiveVisible,false,'combat replaces redundant objective lane');state.combatLayout=layout;
  }

  shots.push({viewport,width,height,filename,state,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
 }
 await context.close();
}}finally{await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Explicitly injected render fixtures, not gameplay; individual visual inspection required separately.',shots,errors},null,2));}
assert.deepEqual(errors,[]);console.log(`Captured ${shots.length} render fixtures; no page errors. Visual inspection pending.`);
