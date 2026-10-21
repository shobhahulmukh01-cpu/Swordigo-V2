'use strict';
// Node draw-contract tests, not integrated screenshots, earned play or device QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const calls=[],images=[];let nodes=[],baseTerrain=0,baseHero=null,baseDraw=0,baseBoss=0;
class Renderer{}class App{}
for(const k of ['skyline','npc','event','glow','poly','line'])Renderer.prototype[k]=function(...args){calls.push([k,...args]);};
Renderer.prototype.object=function(o,kind){calls.push(['baseObject',o,kind]);if(kind==='gate')this.c.fillText(o.chapterLabel,0,-152);};
Renderer.prototype.terrain=function(s){baseTerrain++;calls.push(['baseTerrain',s]);};
Renderer.prototype.hero=function(p,ghost){baseHero={p,ghost,t:this.t};};
Renderer.prototype.boss=()=>{baseBoss++;};Renderer.prototype.draw=()=>{baseDraw++;};
for(const k of ['frame','settingsSave','updateHUD','codex','bind','settingsPanel'])App.prototype[k]=()=>{};
class ImageMock{
 constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}
 decode(){this.decodes=(this.decodes||0)+1;return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}
}
const stack=[],ctx=new Proxy({font:'12px system-ui',globalAlpha:1,
 save(){stack.push({font:this.font,globalAlpha:this.globalAlpha});calls.push(['save']);},
 restore(){Object.assign(this,stack.pop()||{});calls.push(['restore']);},
 measureText(text){return{width:String(text).length*Number(String(this.font).match(/([\d.]+)px/)?.[1]||12)*.55};},
 fillText(...a){calls.push(['fillText',...a,{font:this.font}]);},
 createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};}
},{get(o,k){return k in o?o[k]:(...a)=>{for(const n of a)if(typeof n==='number')assert(Number.isFinite(n),k+' finite');calls.push([k,...a]);};},set(o,k,v){o[k]=v;return true;}});
const box={EW:{},EWClient:{Renderer,App},Image:ImageMock,document:{body:{classList:{add(){}}},querySelectorAll:()=>nodes},navigator:{},location:{protocol:'file:'},getComputedStyle:el=>el.style||{display:'block',visibility:'visible',opacity:'1'}};
box.globalThis=box;vm.createContext(box);
for(const name of ['chapter-data.js','realm-v11.js','presentation-v12.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/scripts',name),'utf8'),box,{filename:name});
const d=box.EW.ChapterData;
function make(){
 const g={status:'playing',progress:{mode:'story',level:0},scene:{id:'ch1:room:millpond'},inChapterRoom:true,bossActive:false,chapter:{items:[],mechanisms:[],deliveries:[]},p:{x:150,y:536,face:1,attack:0,dash:0},level:{width:2400,solids:[],sigils:[]},has:()=>false,chapterHas(k,id){return this.chapter[k]?.includes(id)||false;},chapterRequirements:()=>true,canEnterDoor:()=>false};
 const r=new Renderer();Object.assign(r,{app:{game:g,settings:{quality:'high',reduceMotion:false}},c:ctx,w:390,viewH:720,cam:0,camY:0,t:1.7,sx:1,sy:1,canvas:{clientWidth:390,clientHeight:844,getBoundingClientRect:()=>({left:0,top:0,width:390,height:844})}});return r;
}
async function decoded(r){assert.equal(r.terrainMaterial(),null);const e=r._terrainMaterial,i=e.image;i.complete=true;i.naturalWidth=1264;i.naturalHeight=848;i.onload();assert.equal(e.ready,false,'decode must settle');i.resolve();await Promise.resolve();assert.equal(e.ready,true);return i;}
let checks=0;async function check(name,fn){calls.length=0;nodes=[];await fn();checks++;console.log('PASS '+name);}
(async()=>{
await check('atlas is lazy, one image, decode-gated and low-quality never allocates',async()=>{
 const r=make(),n=images.length;r.app.settings.quality='low';assert.equal(r.terrainMaterial(),null);assert.equal(images.length,n);assert.equal(r._terrainMaterial,undefined);
 r.app.settings.quality='high';const img=await decoded(r);for(let i=0;i<40;i++)assert.equal(r.terrainMaterial(),img);assert.equal(images.length,n+1);assert.equal(img.decodes,1);assert.equal(img.src,'assets/art/terrain-materials-v13.png');
 r.app.settings.quality='low';assert.equal(r.terrainMaterial(),null);r.app.settings.quality='high';assert.equal(r.terrainMaterial(),img);
});
await check('request, decode and dimension errors retain sticky complete alpha4 fallback',async()=>{
 for(const kind of ['request','decode','dimension']){
  const r=make(),s=Object.freeze({x:0,y:590,w:1500,h:170}),before=baseTerrain;r.terrain(s,r.app.game.level);assert.equal(baseTerrain,before+1);
  const e=r._terrainMaterial,img=e.image;
  if(kind==='request')img.onerror();else{img.complete=true;img.naturalWidth=kind==='dimension'?1024:1264;img.naturalHeight=848;img.onload();if(kind==='decode')img.reject(Error('test decode rejection'));else img.resolve();await Promise.resolve();}
  assert.equal(e.failed,true);assert.equal(e.ready,false);const n=images.length;calls.length=0;r.terrain(s,r.app.game.level);assert.equal(baseTerrain,before+2);assert.equal(images.length,n);assert(!calls.some(c=>c[0]==='drawImage'));
 }
});
await check('decoded floors replace polygon passes; bands, lip and endpoint caps stay bounded',async()=>{
 const r=make(),image=await decoded(r),s=Object.freeze({x:120,y:590,w:1300,h:170}),level=Object.freeze({palette:{ground:'#234'}}),before=JSON.stringify(s),n=baseTerrain;
 const expected=[[0,276],[290,267],[577,271]];
 for(let k=0;k<3;k++){
  r.app.game.sceneRealmIndex=k;calls.length=0;r.terrain(s,level);const draws=calls.filter(c=>c[0]==='drawImage');assert(draws.length>0&&draws.length<8);assert(draws.every(c=>c[1]===image&&c[2]===0&&c[3]===expected[k][0]&&c[4]===1264&&c[5]===expected[k][1]));
  assert(calls.some(c=>c[0]==='rect'&&c[1]===s.x-r.cam&&c[3]===s.w),'clip exact solid width');assert(calls.some(c=>c[0]==='fillRect'&&c[1]===s.x-r.cam&&c[2]===s.y&&c[3]===s.w&&c[4]===4),'retain collision lip');
  assert(calls.some(c=>c[0]==='fillRect'&&c[1]===s.x-r.cam+s.w-7&&c[3]===7),'right endpoint cap');
 }
 assert.equal(baseTerrain,n,'no old polygon pass under decoded floors');assert.equal(JSON.stringify(s),before);
});
await check('world-anchored texture does not crawl; ultrawide and tiny shelves stay bounded',async()=>{
 const r=make();await decoded(r);const s=Object.freeze({x:0,y:590,w:1e7,h:170});
 const origins=[];for(const cam of [0,.5,99]){r.cam=cam;calls.length=0;r.terrain(s,{});origins.push(calls.find(c=>c[0]==='drawImage')[6]+cam);}assert.deepEqual(origins,[0,0,0]);
 r.w=2880;r.cam=4100;calls.length=0;r.terrain(s,{});assert(calls.filter(c=>c[0]==='drawImage').length<10);
 const shelf=Object.freeze({x:4200,y:470,w:35,h:18,oneWay:true}),n=baseTerrain;calls.length=0;r.terrain(shelf,{});assert.equal(baseTerrain,n+1,'original supports remain');assert(calls.filter(c=>c[0]==='drawImage').length<=2);assert(calls.some(c=>c[0]==='drawImage'&&c[5]===64));
 r.app.settings.quality='low';const n2=baseTerrain;r.terrain(shelf,{});assert.equal(baseTerrain,n2+1);
});
await check('DOM reservations project CSS coordinates through landscape camY; hidden nodes ignored',()=>{
 const r=make();r.w=1000;r.viewH=480;r.camY=150;r.canvas={clientWidth:844,getBoundingClientRect:()=>({left:10,top:20,width:844,height:390})};r.app.game.p=null;
 const node=(rect,extra={})=>({getClientRects:()=>[rect],getBoundingClientRect:()=>rect,...extra});
 nodes=[node({left:94.4,top:59,width:168.8,height:78}),node({left:0,top:0,width:900,height:900},{hidden:true}),node({left:0,top:0,width:900,height:900},{style:{display:'none'}})];
 const a=r.presentationLayout().reserved;assert.equal(a.length,1);assert(Math.abs(a[0].x-100)<1e-8);assert(Math.abs(a[0].y-198)<1e-8);assert(Math.abs(a[0].w-200)<1e-8);assert.equal(a[0].h,96);
});
await check('labels avoid actor and sword reservations, wrap at CSS size and never squeeze',()=>{
 for(const attack of [0,.25,.13,.04]){
  const r=make();r.app.game.p.attack=attack;const before=JSON.stringify(r.app.game.p);calls.length=0;
  const b=r.presentationLabel('Inspect the west irrigation valve',164,474);assert(b,'bounded label exists');assert(b.x>=8&&b.x+b.w<=r.w-8);
  for(const a of r.presentationLayout().reserved)assert(!(b.x<a.x+a.w+4&&b.x+b.w+4>a.x&&b.y<a.y+a.h+4&&b.y+b.h+4>a.y));
  const texts=calls.filter(c=>c[0]==='fillText');assert(texts.length>0&&texts.length<=2);assert(texts.every(c=>c.length===5),'no Canvas maxWidth squeeze');assert.equal(JSON.stringify(r.app.game.p),before);
 }
 const r=make();r.canvas.clientWidth=320;r.w=333;calls.length=0;r.presentationLabel('A readable small viewport label',200,450);assert(calls.filter(c=>c[0]==='fillText').every(c=>Math.abs(Number(c[4].font.match(/([\d.]+)px/)[1])*320/333-14)<.001));
});
await check('chapter dispatch uses exact door IDs and leaves physical props/facts untouched',()=>{
 const r=make(),g=r.app.game;g.scene.id='ch1:room:rootcellar';const before=JSON.stringify({chapter:g.chapter,rooms:d.rooms,doors:d.doors}),doors=[];g.canEnterDoor=id=>{assert(d.doors[id]);doors.push(id);return false;};
 r.chapterObjects(g);assert.equal(doors.length,Object.values(d.doors).filter(o=>o.sourceScene===g.scene.id).length);assert(calls.some(c=>c[0]==='baseObject'&&c[2]==='gate'));assert.equal(JSON.stringify({chapter:g.chapter,rooms:d.rooms,doors:d.doors}),before);
});
await check('reread is explicit collected-item metadata; badge does not re-open rewards',()=>{
 const r=make(),g=r.app.game,m={...d.interactions['ch1:item:open-letter'],reread:true};assert.equal(r.chapterPropStatus(m),'READY');g.chapter.items.push(m.id);assert.equal(r.chapterPropStatus(m),'READ AGAIN');assert.equal(r.chapterPropStatus({...m,reread:false}),'DONE');
 const before=JSON.stringify(g.chapter);r.object(m,'chest',true);assert(calls.some(c=>c[0]==='fillText'&&c[1]==='READ AGAIN'));assert.equal(JSON.stringify(g.chapter),before);
});
await check('Lyra remains delegated unchanged with parry; Engine aperture is static-state/pure',()=>{
 const r=make();for(const reduced of [false,true])for(const attack of [0,.25,.13,.04])for(const face of [-1,1]){
  r.app.settings.reduceMotion=reduced;const p=Object.freeze({x:150,y:536,face,attack,parry:.1,guardFlash:0,grounded:true,inv:0,dash:0,vx:0});const before=JSON.stringify(p),t=r.t;calls.length=0;r.hero(p,false);assert.equal(baseHero.p,p);assert.equal(baseHero.t,reduced?0:t);assert.equal(r.t,t);assert.equal(JSON.stringify(p),before);assert(calls.some(c=>c[0]==='arc'&&c[3]===37),'realm parry preserved');
 }
 const prior=baseHero;calls.length=0;r.app.settings.reduceMotion=true;r.hero(Object.freeze({x:0,y:0,face:1,attack:0,dash:.1}),true);assert.equal(baseHero,prior);assert.equal(calls.length,0,'no decorative dash ghosts with reduced motion');
 r.w=1440;r.cam=1300;r.app.settings.reduceMotion=true;const e={...d.rooms['ch1:room:star-archive'].boss,hp:260,flash:0,state:'recover'};const before=JSON.stringify(e);calls.length=0;r.boss(e);assert(calls.some(c=>c[0]==='poly'&&c[2]==='#0d222c'),'opened recovery aperture');assert.equal(JSON.stringify(e),before);const n=baseBoss;r.boss({...e,id:'campaign'});assert.equal(baseBoss,n+1);
});
await check('warning shapes stay exact; both word tags survive actor cluster and attack phase',()=>{
 const r=make(),g=r.app.game;g.bossActive=true;g.boss={x:180,y:450,w:96,h:140,hp:100};g.p={x:180,y:536,face:1,attack:0};
 const marks=[{kind:'light',x:35,endX:35,y:570,radius:30,phase:'warning',remaining:.5,warningDuration:1},{kind:'light',x:210,endX:210,y:570,radius:30,phase:'active',remaining:0,warningDuration:1}];g.bossTelegraphs=marks;const before=JSON.stringify({marks,p:g.p,boss:g.boss});
 calls.length=0;r.draw(0);const rings=calls.filter(c=>c[0]==='ellipse');assert.equal(rings.length,2);assert.deepEqual(rings.map(c=>c.slice(1,5)),[[35,587,30,9],[210,587,30,9]]);assert.equal(calls.filter(c=>c[0]==='fillText'&&c[1]==='LIGHT').length,2);assert.equal(JSON.stringify({marks,p:g.p,boss:g.boss}),before);assert(baseDraw>0);
});
await check('drop CSS has explicit minimum targets and bounded portrait/landscape grids',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../assets/styles/sequel-v12.css'),'utf8');assert(css.includes('[data-touch="drop"]'));assert(css.includes('min-width:44px;min-height:44px'));assert(css.includes('grid-template-rows:repeat(2,52px)'));assert(css.includes('grid-template-columns:repeat(3,44px)'));assert(css.includes('bottom:max(8px,env(safe-area-inset-bottom))'));
 // Structural CSS assertions only: no claim of actual button geometry or occlusion.
});
console.log(checks+' alpha5 presentation contracts passed; integrated visual/source-bound QA pending.');
})().catch(e=>{console.error(e);process.exitCode=1;});
