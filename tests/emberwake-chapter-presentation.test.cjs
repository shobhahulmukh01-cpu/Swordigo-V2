'use strict';
// Render-contract fixtures only; not browser screenshots or earned-gameplay evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const calls=[],base={object:0,boss:0,skyline:0,npc:0};
class Renderer {} class App {}
for(const key of ['object','boss','skyline','npc'])Renderer.prototype[key]=()=>{base[key]++;};
for(const key of ['event','hero','draw','terrain','glow','poly','line'])Renderer.prototype[key]=function(...args){calls.push([key,...args]);};
for(const key of ['frame','settingsSave','updateHUD','codex','bind','settingsPanel'])App.prototype[key]=()=>{};
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get(o,k){return k in o?o[k]:(...args)=>{if(k==='ellipse')assert.ok(args.length>=7,'Canvas ellipse needs an endAngle');for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v),k+' has nonfinite coordinate');calls.push([k,...args]);};},set(o,k,v){o[k]=v;return true;}});
const sandbox={EW:{},EWClient:{Renderer,App},document:{body:{classList:{add(){}}}},navigator:{},location:{protocol:'file:'},Image:class{constructor(){this.complete=false;}},console};
sandbox.globalThis=sandbox;vm.createContext(sandbox);
for(const f of ['chapter-data.js','realm-v11.js','presentation-v12.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/scripts',f),'utf8'),sandbox,{filename:f});
const d=sandbox.EW.ChapterData,g={status:'playing',progress:{mode:'story',level:0},chapter:{items:[],mechanisms:[],deliveries:[]},scene:{id:'ch1:room:millpond'},inChapterRoom:true,chapterHas(k,id){return this.chapter[k]?.includes(id)||false;},chapterRequirements(req){return !req||(Array.isArray(req)?req.length===0:Object.keys(req).length===0);}};
const r=new Renderer();Object.assign(r,{app:{game:g,settings:{reduceMotion:true}},c:context,w:1280,cam:0,t:0});
let count=0;function check(name,fn){fn();console.log('PASS '+name);count++;}
check('semantic kinds use actual chapter contract; campaign props still delegate',()=>{
 const expected={'ch1:mechanism:valve-west':'valve','ch1:mechanism:vent-east':'vent','ch1:item:water-letter':'letter-desk','ch1:item:open-letter':'letter-desk','ch1:item:charter':'letter-desk','ch1:item:orin-testimony':'letter-desk','ch1:item:summer-coal':'coal','ch1:mechanism:seal-water':'testimony','ch1:interaction:archive-opt-in':'console','ch1:interaction:archive-finish':'console'};
 for(const [id,kind] of Object.entries(expected))assert.equal(r.chapterPropKind(d.interactions[id]),kind,id);
 const before=base.object;r.object({id:'m-cache',x:0,y:590},'chest');assert.equal(base.object,before+1);
});
check('status derives ready/locked/done without creating state',()=>{
 const m=d.interactions['ch1:mechanism:valve-west'],v=d.interactions['ch1:mechanism:vent-west'];
 assert.equal(r.chapterPropStatus(m),'READY');assert.equal(r.chapterPropStatus(v),'LOCKED');g.chapter.mechanisms.push(v.id);assert.equal(r.chapterPropStatus(v),'DONE');g.chapter.mechanisms=[];
});
check('every chapter semantic prop renders at portrait and desktop; no facts/geometry change',()=>{
 const before=JSON.stringify({d,chapter:g.chapter});for(const w of [390,1440]){r.w=w;for(const m of Object.values(d.interactions)){r.cam=m.x-w/2;r.object(m,m.type==='item'?'chest':'shrine');}}
 assert.equal(JSON.stringify({d,chapter:g.chapter}),before);
});
check('all four room backdrops render without mutating supplied geometry',()=>{
 const before=JSON.stringify(d.rooms);for(const room of Object.values(d.rooms)){g.scene.id=room.id;for(const w of [390,1440]){r.w=w;r.cam=0;r.skyline(room);r.cam=room.width-w;r.skyline(room);}}assert.equal(JSON.stringify(d.rooms),before);
});
check('delivered props require per-journey committed deliveries, never possession/signature',()=>{
 for(const id of ['ch1:delivery:water-remembers','ch1:delivery:summer-coal','ch1:delivery:charter']){
  const m=d.deliveries[id];g.scene.id=m.sceneId;r.cam=0;r.w=1440;g.chapter.deliveries=[];g.chapter.items=[m.itemId,'ch1:item:orin-testimony'];g.chapter.mechanisms=['ch1:mechanism:seal-charter'];
  calls.length=0;r.chapterDeliveryProp({x:275,y:590});assert.equal(calls.length,0,'uncommitted '+id);
  g.chapter.deliveries=[id];calls.length=0;const before=JSON.stringify(g.chapter);r.chapterDeliveryProp({x:275,y:590});assert.ok(calls.length>5,id+' visible');assert.equal(JSON.stringify(g.chapter),before);
  // Switching journeys removes presentation immediately, no renderer cache.
  g.chapter={items:[],mechanisms:[],deliveries:[]};calls.length=0;r.chapterDeliveryProp({x:275,y:590});assert.equal(calls.length,0);
 }
});
check('only the Engine gets nonhuman silhouette; regent renderer and simulation untouched',()=>{
 const original=base.boss;r.cam=1300;r.w=390;const e={...d.rooms['ch1:room:star-archive'].boss,w:96,h:140,hp:260,state:'idle',flash:0};
 const before=JSON.stringify(e);r.boss(e);assert.equal(base.boss,original);assert.equal(JSON.stringify(e),before);
 e.state='windup';calls.length=0;r.boss(e);assert.ok(calls.some(x=>x[0]==='fillText'&&x[1]==='!'));assert.ok(!calls.some(x=>x[0]==='fillText'&&x[1]!=='!'));
 r.boss({...e,id:'h-boss'});assert.equal(base.boss,original+1);e.hp=0;calls.length=0;r.boss(e);assert.equal(calls.length,0);
});
console.log(count+' render-contract checks passed. Browser visual inspection remains required.');
