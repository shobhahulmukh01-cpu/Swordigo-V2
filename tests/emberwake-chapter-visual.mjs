/** Isolated render fixtures, NOT earned gameplay or performance qualification.
 * Run only after parent build/server. No builds or production-file mutations.
 */
import {chromium} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const output=process.env.EW_VISUAL_OUTPUT||'qa/correction/chapter-visual';fs.mkdirSync(output,{recursive:true});
const executablePath=process.env.CHROME_BIN||['/usr/local/bin/chromium','/usr/bin/chromium','/usr/bin/google-chrome'].find(p=>fs.existsSync(p));
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox']}),shots=[],errors=[];
const url=process.env.EW_URL||'http://127.0.0.1:4173/Swordigo-V2/';
const roomFixtures=[
 {slug:'millpond',x:400,kind:'valve'},
 {slug:'millpond',x:1600,kind:'water-desk'},
 {slug:'cooling-gallery',x:420,kind:'vent'},
 {slug:'cooling-gallery',x:1770,kind:'coal'},
 {slug:'rootcellar',x:390,kind:'desk'},
 {slug:'rootcellar',x:1440,kind:'charter'},
 {slug:'star-archive',x:790,kind:'records'},
 {slug:'star-archive',x:1450,kind:'engine-warning'}
];
const engine=(kind,extra={})=>({slug:'star-archive',x:1450,kind,...extra});
const hero=(kind,heroAttack,extra={})=>({slug:'millpond',x:400,kind,heroAttack,...extra});
const requireArt=process.env.EW_REQUIRE_CHAPTER_ART!=='0';
const firstTwo=process.env.EW_VISUAL_PANEL==='first2',defaultExpectedCaptures=firstTwo?10:47;
const split=value=>(value||'').split(',').map(x=>x.trim()).filter(Boolean);
const captureFilter=split(process.env.EW_VISUAL_FILTER),viewportFilter=split(process.env.EW_VISUAL_VIEWPORTS);
for(const name of viewportFilter)assert(['desktop','portrait','landscape'].includes(name),'Unknown EW_VISUAL_VIEWPORTS value '+name);
let expectedCaptures=0;
try{for(const [viewport,width,height] of [['desktop',1440,1000],['portrait',390,844],['landscape',844,390]]){
 if(viewportFilter.length&&!viewportFilter.includes(viewport))continue;
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',isMobile:viewport!=='desktop',hasTouch:viewport!=='desktop'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push({viewport,error:e.message}));await page.goto(url);await page.waitForFunction(()=>window.emberwake);await page.waitForTimeout(250);
 const baseline=[...roomFixtures,...['moonroot','cinderworks','hollowspire'].flatMap(slug=>[
  {slug,main:true,x:slug==='moonroot'?250:300,kind:'delivery-absent'},
  {slug,main:true,x:slug==='moonroot'?250:300,kind:'delivery-present'}])];
 let fixtures=viewport==='landscape'?[
  roomFixtures[1],roomFixtures[3],roomFixtures[4],roomFixtures[7],
  hero('hero-strike',.13),engine('engine-recover')
 ]:baseline;
 if(viewport==='portrait')fixtures.push(
  engine('engine-idle'),engine('engine-attack'),engine('engine-recover'),
  hero('hero-set',.25),hero('hero-strike',.13),hero('hero-followthrough',.04),hero('hero-dash',0,{heroDash:.12}),
  hero('hero-strike-reduced',.13,{reduceMotion:true}),engine('engine-recover-reduced',{reduceMotion:true}),
  ...[roomFixtures[0],roomFixtures[2],roomFixtures[4],roomFixtures[6]].map(f=>({...f,kind:'art-fallback',fallback:true}))
 );
 if(firstTwo)fixtures=fixtures.filter(f=>['rootcellar','star-archive'].includes(f.slug)&&['desk','charter','records','engine-warning'].includes(f.kind));
 if(captureFilter.length)fixtures=fixtures.filter(f=>{
  const filename=`${f.slug}-${f.kind}-${viewport}.png`,scene=`ch1:${f.main?'main':'room'}:${f.slug}`;
  return captureFilter.some(value=>filename.includes(value)||scene===value||f.slug===value);
 });
 expectedCaptures+=fixtures.length;
 let fallbackMode=false;
 for(const fixture of fixtures){
  // Real request failure, not a forged renderer-ready flag; isolate loaded-image cache.
  if(fixture.fallback&&!fallbackMode){
   await page.route('**/assets/images/chapter-*.webp',route=>route.abort());
   await page.reload();await page.waitForFunction(()=>window.emberwake);fallbackMode=true;
  }
  const state=await page.evaluate(f=>{
   const a=emberwake,g=a.game;a.settings.reduceMotion=!!f.reduceMotion||f.kind.startsWith('delivery-');g.newRun();for(const l of EW_LEVELS){g.flag('seen',l.id);g.flag('defeated',l.boss.id);for(const r of l.sigils){g.flag('runes',r.id);g.flag('sigils',r.id);}}
   g.loadLevel(2);g.finish('mercy');g.continueDeliveries();
   const scene='ch1:'+(f.main?'main:':'room:')+f.slug,anchor=Object.values(EW.ChapterData.anchors).find(x=>x.sceneId===scene);if(!anchor)throw Error('No fixture anchor '+scene);g.switchChapterScene(scene,anchor.id);
   // These seeded facts are render-only fixtures; never exported as earned evidence.
   if(f.kind==='delivery-present')g.chapter.deliveries=Object.keys(EW.ChapterData.deliveries);
   a.enterGame();a.process();a.hard=false;a.modalKind=null;a.paused=false;document.getElementById('modal').hidden=true;a.running=false;
   g.p.x=f.x;g.p.y=536;g.p.inv=0;
   if(f.kind.startsWith('engine-')){
    g.bossActive=true;g.boss.state='idle';g.boss.t=0;
    // Actual encounter private warning state. State injection remains synthetic evidence.
    if(f.kind!=='engine-idle'){
     g.updateBoss(1/120);if(!g.bossTelegraphs.some(m=>m.phase==='warning'))throw Error('Missing actual warning fixture');
     const target=f.kind.startsWith('engine-recover')?'recover':f.kind==='engine-attack'?'attack':'windup';
     g.p.inv=9999;let steps=0;while(g.boss.state!==target&&steps++<1200)g.updateBoss(1/120);
     if(g.boss.state!==target)throw Error('Could not initialize Engine '+target);g.p.inv=0;
    }else g.boss.t=.85;
   }
   if(f.heroAttack!==undefined){g.p.attack=f.heroAttack;g.p.dash=f.heroDash||0;g.p.combo=1;g.p.vx=0;}
   a.renderer.fx=[];a.renderer.labels=[];a.updateHUD();a.renderer.resize();a.renderer.cam=Math.max(0,g.p.x-a.renderer.w*.5);a.renderer.draw(0);
   document.getElementById('chapter').hidden=true;document.getElementById('toast').hidden=true;
   return {scene:g.scene.id,kind:f.kind,reduceMotion:a.settings.reduceMotion,heroPhase:a.renderer.heroVisualPhase(g.p),bossState:g.boss?.state,chapter:g.chapter,canvas:{width:a.renderer.w,height:a.renderer.h}};
  },fixture);
  if(!fixture.main){
   await page.waitForFunction(({id,fallback,strict})=>{
    const e=emberwake.renderer.chapterPlateImages?.[id];return e&&(fallback?e.failed:strict?e.ready:(e.ready||e.failed));
   },{id:state.scene,fallback:!!fixture.fallback,strict:requireArt},{timeout:5000});
   state.art=await page.evaluate(()=>{const r=emberwake.renderer,e=r.chapterPlateImages?.[emberwake.game.scene.id];return e?{ready:e.ready,failed:e.failed,path:e.image.getAttribute('src'),width:e.image.naturalWidth,height:e.image.naturalHeight}:null;});
   if(fixture.fallback)assert.equal(state.art?.failed,true,'real missing-asset fallback');
   else if(requireArt)assert.equal(state.art?.ready,true,'authored room plate must be decoded');
  }
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
}}finally{await browser.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Explicitly injected render fixtures, not gameplay; individual visual inspection required separately.',requireArt,panel:firstTwo?'first2':'full',captureFilter,viewportFilter,expectedCaptures,shots,errors},null,2));}
assert(expectedCaptures>0,'No visual fixtures matched filters');assert.equal(shots.length,expectedCaptures,'complete selected fixture set');if(!captureFilter.length&&!viewportFilter.length)assert.equal(shots.length,defaultExpectedCaptures,'complete approved default fixture set');assert.deepEqual(errors,[]);console.log(`Captured ${shots.length} render fixtures; no page errors. Visual inspection pending.`);
