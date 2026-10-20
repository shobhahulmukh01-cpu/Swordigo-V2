'use strict';
// Small non-browser contracts. They do NOT certify visual quality or gameplay.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const calls=[],images=[];let delegatedHero,baseBoss=0;
class Renderer{}class App{}
for(const k of ['object','skyline','npc','event','draw','terrain','glow','poly','line'])Renderer.prototype[k]=function(...a){calls.push([k,...a]);};
Renderer.prototype.hero=function(p,ghost){delegatedHero={p,ghost,t:this.t};};Renderer.prototype.boss=()=>{baseBoss++;};
for(const k of ['frame','settingsSave','updateHUD','codex','bind','settingsPanel'])App.prototype[k]=()=>{};
class ImageMock{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}decode(){return this.decodeFailure?Promise.reject(Error('decode failed')):Promise.resolve();}}
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get(o,k){return k in o?o[k]:(...a)=>{for(const n of a)if(typeof n==='number')assert(Number.isFinite(n),k+' nonfinite');calls.push([k,...a]);};},set(o,k,v){o[k]=v;return true;}});
const box={EW:{},EWClient:{Renderer,App},Image:ImageMock,document:{body:{classList:{add(){}}}},navigator:{},location:{protocol:'file:'}};box.globalThis=box;vm.createContext(box);
for(const f of ['chapter-data.js','realm-v11.js','presentation-v12.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/scripts',f),'utf8'),box,{filename:f});
const d=box.EW.ChapterData,g={status:'playing',inChapterRoom:true,scene:{id:'ch1:room:millpond'},progress:{mode:'story',level:0},chapter:{deliveries:[],items:[],mechanisms:[]},chapterHas(k,id){return this.chapter[k]?.includes(id)||false;}};
const r=new Renderer();Object.assign(r,{app:{game:g,settings:{reduceMotion:false}},c:ctx,w:1280,cam:0,t:1.7});
let count=0;async function check(name,fn){await fn();console.log('PASS '+name);count++;}
(async()=>{
await check('four room paths load once; pending/error retains alpha3 fallback',async()=>{
 const expected=['chapter-millpond.webp','chapter-cooling.webp','chapter-rootcellar.webp','chapter-archive.webp'];let i=0;
 for(const room of Object.values(d.rooms)){
  g.scene.id=room.id;assert.equal(r.chapterRoomPlate(room),false);const entry=r.chapterPlateImages[room.id],img=entry.image;
  assert(img.src.endsWith(expected[i++]));const n=images.length;r.chapterRoomPlate(room);assert.equal(images.length,n,'no per-frame reload');
  calls.length=0;r.chapterRoomBackdrop(room);assert(calls.some(c=>c[0]==='fillRect'||c[0]==='stroke'),'fallback architecture remains');
  img.onerror();assert.equal(r.chapterRoomPlate(room),false);
 }
});
await check('decoded art replaces primitive room overlay; dimensions and main plates preserved',async()=>{
 for(const room of Object.values(d.rooms)){
  g.scene.id=room.id;const entry=r.chapterPlateImages[room.id],img=entry.image;img.complete=true;img.naturalWidth=1376;img.naturalHeight=768;img.onload();
  assert.equal(entry.ready,false,'decode gate precedes ready');await Promise.resolve();assert.equal(entry.ready,true);
  for(const w of [333,390,1266,1440,2880]){r.w=w;r.cam=Math.max(0,room.width-w);calls.length=0;const before=JSON.stringify(room);r.chapterRoomBackdrop(room);
   const draw=calls.find(c=>c[0]==='drawImage');assert(draw&&draw[1]===img);assert(draw[4]<=img.naturalWidth&&draw[5]<=img.naturalHeight,'no pixel enlargement');assert.equal(calls.filter(c=>c[0]==='fillRect').length,1,'only the opaque matte, no old geometry over art');assert.equal(JSON.stringify(room),before);
  }
 }
 const before=images.length;g.inChapterRoom=false;calls.length=0;assert.equal(r.chapterRoomPlate(d.rooms['ch1:room:millpond']),false);assert.equal(images.length,before);assert.equal(calls.length,0);
 const source=fs.readFileSync(path.join(__dirname,'../assets/scripts/realm-v11.js'),'utf8');for(const p of ['moonroot_hd.webp','cinderworks_hd.webp','hollowspire_hd.webp'])assert(source.includes(p));g.inChapterRoom=true;
});
await check('decode rejection and empty image remain fallback; reduced motion has no drift',async()=>{
 const room=d.rooms['ch1:room:millpond'];g.scene.id=room.id;const entry=r.chapterPlateImages[room.id],img=entry.image;
 img.decodeFailure=true;img.onload();await Promise.resolve();assert.equal(entry.failed,true);assert.equal(r.chapterRoomPlate(room),false);
 img.decodeFailure=false;img.onload();await Promise.resolve();r.w=390;r.app.settings.reduceMotion=true;
 r.cam=0;calls.length=0;r.chapterRoomPlate(room);const a=calls.find(c=>c[0]==='drawImage').slice(2);
 r.cam=room.width;calls.length=0;r.chapterRoomPlate(room);assert.deepEqual(calls.find(c=>c[0]==='drawImage').slice(2),a);
 img.naturalHeight=0;assert.equal(r.chapterRoomPlate(room),false);img.naturalHeight=1152;
});
await check('hero staging delegates exact attack object/reach and restores decorative clock',()=>{
 r.w=390;r.cam=0;for(const reduceMotion of [false,true])for(const attack of [0,.25,.13,.04])for(const face of [-1,1]){
  r.app.settings.reduceMotion=reduceMotion;const p=Object.freeze({x:100,y:536,face,attack,dash:0,vx:150,anim:2});const before=JSON.stringify(p);const t=r.t;
  calls.length=0;r.hero(p,false);assert.equal(delegatedHero.p,p);assert.equal(delegatedHero.t,reduceMotion?0:t);assert.equal(r.t,t);assert.equal(JSON.stringify(p),before);
  assert(!calls.some(c=>c[0]==='arc'),'no enlarged attack arcs');
 }
 assert.equal(r.heroVisualPhase({attack:.25}),'set');assert.equal(r.heroVisualPhase({attack:.13}),'strike');assert.equal(r.heroVisualPhase({attack:.04}),'followthrough');assert.equal(r.heroVisualPhase({attack:0,dash:.1}),'dash');
});
await check('Engine drum posture is state-driven, nonmutating and not applied to campaign bosses',()=>{
 r.app.settings.reduceMotion=true;r.w=1440;r.cam=1300;const e={...d.rooms['ch1:room:star-archive'].boss,hp:260,flash:0};
 for(const [state,lift] of [['idle',0],['windup',-4],['attack',0],['recover',7]]){
  e.state=state;const before=JSON.stringify(e);calls.length=0;r.boss(e);assert(calls.some(c=>c[0]==='translate'&&c[1]===0&&c[2]===lift));assert.equal(JSON.stringify(e),before);
  if(state==='windup')assert(calls.some(c=>c[0]==='fillText'&&c[1]==='!'));
 }
 const n=baseBoss;r.boss({...e,id:'h-boss'});assert.equal(baseBoss,n+1);
});
await check('repair vignette is committed-only, immediate on journey switch and state-pure',()=>{
 r.cam=0;r.w=1440;
 for(const m of Object.values(d.deliveries)){
  g.scene.id=m.sceneId;g.chapter={items:[m.itemId],mechanisms:['ch1:mechanism:seal-charter'],deliveries:[]};calls.length=0;r.chapterDeliveryProp({x:275,y:590});assert.equal(calls.length,0);
  g.chapter.deliveries=[m.id];const before=JSON.stringify(g.chapter);calls.length=0;r.chapterDeliveryProp({x:275,y:590});assert(calls.some(c=>c[0]==='scale'&&c[1]===1.14&&c[2]===1));assert(calls.some(c=>c[0]==='glow'));assert.equal(JSON.stringify(g.chapter),before);
  g.chapter={items:[],mechanisms:[],deliveries:[]};calls.length=0;r.chapterDeliveryProp({x:275,y:590});assert.equal(calls.length,0);
 }
});
await check('minimap skips only short landscape cropping; full Map and game state untouched',()=>{
 g.bossActive=false;g.scene.id='fixture:main';g.inChapterRoom=false;g.level={width:2400,solids:[],sigils:[]};g.p={x:100};r.app.paused=false;r.app.miniMap=true;r.w=1280;r.sx=r.sy=1;
 const before=JSON.stringify(g);
 for(const [viewH,width,height,visible] of [[480,844,390,false],[720,1440,1000,true],[720,844,390,true],[480,900,600,true]]){
  r.viewH=viewH;r.canvas={clientWidth:width,clientHeight:height};calls.length=0;r.draw(0);
  assert.equal(calls.some(c=>c[0]==='fillText'&&c[1]==='THE PATH AHEAD'),visible,JSON.stringify({viewH,width,height}));
 }
 assert.equal(JSON.stringify(g),before);assert.equal(r.app.miniMap,true,'preference remains enabled');
});
await check('minimap yields only to actually visible keyboard-help card, not guessed tutorial state',()=>{
 g.bossActive=false;g.scene.id='fixture:main';g.inChapterRoom=false;g.level={width:2400,solids:[],sigils:[]};g.p={x:100};r.app.paused=false;r.app.miniMap=true;r.w=1280;r.viewH=720;r.canvas={clientWidth:1440,clientHeight:1000};
 let guide=null,style={display:'block',visibility:'visible',opacity:'1'};
 box.document.getElementById=id=>id==='guide'?guide:null;box.getComputedStyle=()=>style;
 const before=JSON.stringify(g),rect={width:230,height:70};
 for(const [hidden,rects,css,visible] of [
  [false,[rect],{},false],
  [true,[rect],{},true],
  [false,[],{},true],
  [false,[{width:0,height:0}],{},true],
  [false,[rect],{display:'none'},true],
  [false,[rect],{visibility:'hidden'},true],
  [false,[rect],{visibility:'collapse'},true],
  [false,[rect],{opacity:'0'},true]
 ]){
  guide={hidden,getClientRects:()=>rects};style={display:'block',visibility:'visible',opacity:'1',...css};calls.length=0;r.draw(0);
  assert.equal(calls.some(c=>c[0]==='fillText'&&c[1]==='THE PATH AHEAD'),visible,JSON.stringify({hidden,rects,css}));
 }
 guide=null;calls.length=0;r.draw(0);assert(calls.some(c=>c[0]==='fillText'&&c[1]==='THE PATH AHEAD'),'absent guide allows map');
 assert.equal(JSON.stringify(g),before);assert.equal(r.app.miniMap,true,'preference and detailed-map authority unchanged');
 delete box.document.getElementById;delete box.getComputedStyle;
});
console.log(count+' next2 render-contract checks passed; browser visual QA pending.');
})().catch(e=>{console.error(e);process.exitCode=1;});
