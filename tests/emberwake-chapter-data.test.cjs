'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const levels=require('../assets/scripts/worlds.js');
const EW=require('../assets/scripts/engine.js');
const before=JSON.stringify(levels);
const data=require('../assets/scripts/chapter-data.js');
const overlaps=EW.Physics.overlaps;
test('publishes data only; campaign and original-six-cache entitlement are untouched',()=>{
 assert.equal(globalThis.EW.ChapterData,data);
 assert.equal(JSON.stringify(levels),before);
 assert.equal(levels.length,3);
 assert.equal(levels.flatMap(l=>l.chests).length,6);
 assert.deepEqual(data.mainScenes,{'ch1:main:moonroot':0,'ch1:main:cinderworks':1,'ch1:main:hollowspire':2});
 const context={};vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../assets/scripts/chapter-data.js'),'utf8'),context);
 assert.equal(context.EW.ChapterData.sceneIds.length,7,'data loads without engine/DOM');
 assert(Object.isFrozen(data));assert(Object.isFrozen(data.rooms));
 assert.throws(()=>{data.anchors['ch1:anchor:millpond-entry'].x=0;},TypeError);
});
test('complete bounded roster includes dormant phases and only native enemy types',()=>{
 assert.deepEqual(data.validateData(levels),{valid:true,errors:[]});
 assert.equal(Object.keys(data.rooms).length,4);
 for(const [category,limit] of Object.entries(data.limits))assert.equal(data.rosters[category].length,limit,category);
 assert.equal(data.rosters.discovered.length,7);
 for(const ids of Object.values(data.rosters)){assert.equal(new Set(ids).size,ids.length);assert(ids.every(id=>/^ch1:/.test(id)));}
 for(const enemy of Object.values(data.defeated))assert(['crawler','sentinel','wisp','regent'].includes(enemy.type));
 assert.equal(data.defeated['ch1:enemy:archivist-engine'].phase,'encounter');
 assert(!data.rosters.defeated.includes('h-boss'));
 for(const category of ['mechanisms','items','deliveries','defeated'])for(const id of data.rosters[category]){
  assert(data.requirements[category][id].discovered.includes(data[category][id].sceneId));
 }
});
test('ten paired endpoints and certified static landings; no gated room return',()=>{
 assert.equal(Object.keys(data.doors).length,10);
 assert.equal(new Set(Object.values(data.doors).map(d=>d.pairId)).size,5);
 for(const d of Object.values(data.doors)){
  const reverse=data.doors[d.reverseId],a=data.anchors[d.destAnchor];
  assert.equal(reverse.reverseId,d.id);assert.equal(reverse.destScene,d.sourceScene);
  assert.equal(a.sceneId,d.destScene);assert(data.safeAnchor(a,levels));assert.equal(a.rest,false);
 }
 for(const room of Object.values(data.rooms))assert(room.doors.some(id=>Object.keys(data.doors[id].requirements).length===0));
 assert(!data.safeAnchor({sceneId:'unknown',x:100,y:590},levels));
 assert(!data.safeAnchor({sceneId:'ch1:room:millpond',x:850,y:590},levels),'gap is not a landing');
 assert(!data.safeAnchor({sceneId:'ch1:room:millpond',x:130,y:589},levels));
 assert(!data.safeAnchor({sceneId:'ch1:room:millpond',x:Infinity,y:590},levels));
});
test('paid optional deliveries and derived abilities/testimony never replace ending facts',()=>{
 const water=data.deliveries['ch1:delivery:water-remembers'],coal=data.deliveries['ch1:delivery:summer-coal'];
 assert.equal(water.gold,60);assert.equal(coal.gold,80);
 assert.equal(water.reward.gold,60);assert.equal(coal.reward.gold,80);
 assert(water.optional&&coal.optional);
 assert.equal(data.deliveries['ch1:delivery:charter'].gold,0);
 const base={mode:'story',completed:true,ending:'rekindle',flags:{defeated:['m-boss','c-boss','h-boss'],runes:['m-si0','m-si1','c-si0','c-si1','h-si0','h-si1']}};
 const copy=JSON.stringify(base);
 assert.deepEqual(data.deriveAbilities(base),{rootbinding:true,cinderseal:true,dawnstep:true});
 assert.deepEqual(data.deriveAbilities({...base,mode:'rush'}),{rootbinding:false,cinderseal:false,dawnstep:false});
 assert.equal(data.deriveAbilities({...base,completed:false}).dawnstep,false);
 assert.equal(data.deriveAbilities({...base,flags:{defeated:['m-boss'],runes:['m-si0']}}).rootbinding,false);
 let result=data.deriveObjectives({items:[water.itemId]},base);
 assert.equal(result.objectives.find(o=>o.id===water.id).status,'ready');
 assert.equal(result.objectives.at(-1).status,'available','no delivery/testimony gate');
 result=data.deriveObjectives({items:[water.itemId],deliveries:[water.id]},base);
 assert.equal(result.objectives.find(o=>o.id===water.id).status,'delivered');
 assert.equal(JSON.stringify(base),copy);
 const start=data.interactions['ch1:interaction:archive-opt-in'];
 assert.deepEqual(start.requirements,{completed:true});
 assert.equal(data.rooms['ch1:room:star-archive'].boss.type,'regent');
 assert.equal(data.invariants.requiresNewMoves,false);
});
// Geometry-only continuous-input proof: no enemy defeat or gameplay certification.
// One initial body placement; after that use shipped Physics, ordinary walking and
// one held jump across each authored low gap. No dash, teleport, abilities or edits.
function tour(room,hz,startX,targets){
 const body={x:startX,y:536,w:28,h:54,vx:0,vy:0,grounded:true,jumps:0,coyote:.11,jumpBuffer:0,face:1};
 const log={frames:0,jumps:0};
 for(const target of targets){
  let frames=0;
  while((Math.abs(body.x-target)>2||Math.abs(body.y+54-590)>.1||!body.grounded)&&frames++<hz*15){
   const direction=target>body.x?1:-1;
   const gap=room.hazards.find(h=>direction>0?h.x-body.x>30&&h.x-body.x<145:body.x-(h.x+h.w)>30&&body.x-(h.x+h.w)<145);
   const jumpPressed=!!gap&&body.grounded&&body.y+body.h>530;
   if(jumpPressed)log.jumps++;
   const axis=Math.max(-1,Math.min(1,(target-body.x)*5/300));
   EW.Physics.step(body,1/hz,room.solids,{axis,jumpPressed,jumpHeld:true},{maxX:room.width});
   log.frames++;
   assert(Number.isFinite(body.x+body.y+body.vx+body.vy));
   assert(body.y>=0&&body.y+54<=590.1,'left supported route '+room.id+' x='+body.x);
   for(const hazard of room.hazards)assert(!overlaps(body,hazard),'hazard intersected '+room.id);
  }
  assert(frames<hz*15,'failed to reach target '+target+' in '+room.id+' hz='+hz);
 }
 return log;
}
for(const hz of [60,120])test('ordinary-controls round trips reach every room interaction/exit at '+hz+' Hz',()=>{
 for(const room of Object.values(data.rooms)){
  const targets=[...room.interactions.map(id=>data.interactions[id].x),...room.doors.map(id=>data.doors[id].x),...room.anchors.map(id=>data.anchors[id].x)];
  const itinerary=[...new Set(targets)].sort((a,b)=>a-b);
  const first=itinerary[0];
  const log=tour(room,hz,first,[...itinerary.slice(1),...itinerary.slice(0,-1).reverse()]);
  assert(log.frames>0);
  if(room.hazards.length)assert(log.jumps>=2,'both directions crossed the gap');
 }
});
test('optional Rootbinding footprint is collision-clear and safe without being required',()=>{
 const bridge=data.mechanisms['ch1:mechanism:rootbridge'];
 const room=data.rooms[bridge.sceneId];
 assert.equal(bridge.waitIfOccupied,true);
 assert(!room.solids.some(s=>overlaps(bridge.clearFootprint,s)),'new bridge and standing clearance have no existing solid');
 for(const solid of bridge.geometry){
  assert(!room.solids.some(s=>overlaps(solid,s)));
  assert(!room.hazards.some(h=>overlaps(solid,h)));
 }
 assert.equal(data.mechanisms['ch1:mechanism:vent-west'].effect,'cool-marked-vent');
 assert.equal(data.interactions['ch1:interaction:dawnstep'].sameSceneOnly,true);
 assert.equal(data.interactions['ch1:interaction:dawnstep'].requireNoCombat,true);
});
test('story selector adds no save roster or optional encounter dependencies',()=>{
 assert.equal(typeof data.selectStory,'function');
 assert.equal(data.rosters.mechanisms.length,8);assert.equal(data.rosters.items.length,5);assert.equal(data.rosters.deliveries.length,3);
 assert.deepEqual(data.interactions['ch1:interaction:archive-opt-in'].requirements,{completed:true});
 assert.equal(data.invariants.archiveTestimonyRequired,false);
});
