'use strict';
// Only this suite is run for the route slice. No DOM, downloads or completion cheats.
const test = require('node:test');
const assert = require('node:assert/strict');
const levels = require('../assets/scripts/worlds.js');
const baseline = require('../../provided-emberwake/assets/scripts/worlds.js');
const EW = require('../assets/scripts/engine.js');
require('../assets/scripts/core-v11.js'); // Include the shipped strict v3 journey validator.
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const proofs = [];

function on(body, solid) {
  return body.grounded && Math.abs(body.y + body.h - solid.y) < .01 &&
    body.x + body.w > solid.x && body.x < solid.x + solid.w;
}
function step(body, level, input, hz, ledger) {
  EW.Physics.step(body, 1/hz, level.solids, input, {maxX:level.width});
  ledger.frames++;
  ledger.minFoot = Math.min(ledger.minFoot,body.y+body.h);
  assert(Number.isFinite(body.x+body.y+body.vx+body.vy));
  assert(body.y>=0 && body.y+body.h<=610, 'route left safe scene/entered a pit at x='+body.x.toFixed(1)+' foot='+(body.y+body.h).toFixed(1));
  for(const hazard of level.hazards) assert(!EW.Physics.overlaps(body,hazard), 'hazard intersection');
}
function aim(body, x) { return clamp((x-(body.x+14))*5,-300,300)/300; }
function traverse(level, ids, hz, label) {
  const solids = new Map(level.solids.map(s=>[s.id,s]));
  const start = solids.get(ids[0]);
  // One initial placement per entire itinerary. No body/state edits after this.
  const body = {x:start.x+Math.min(start.w/2,65)-14,y:start.y-54,w:28,h:54,
    vx:0,vy:0,grounded:true,jumps:0,coyote:.11,jumpBuffer:0,face:1};
  const ledger={frames:0,minFoot:start.y,edges:0,cacheApproaches:0};
  for(let i=1;i<ids.length;i++) {
    const from=solids.get(ids[i-1]), to=solids.get(ids[i]);
    assert(on(body,from), 'departure must be reached by prior inputs: '+from.id);
    const right=to.x+to.w/2>body.x+14;
    const target=to.oneWay?to.x+to.w/2:clamp(body.x+14,to.x+45,to.x+to.w-45);
    // Long ground tiles are walked to their departure edge before a gap jump.
    const departure=clamp(target,from.x+35,from.x+from.w-35);
    let walk=0;
    while(Math.abs(body.x+14-departure)>3 && walk++<hz*12) {
      step(body,level,{axis:aim(body,departure),jumpHeld:false},hz,ledger);
      assert(on(body,from),'walk-off before jump on '+from.id);
    }
    assert(walk<hz*12,'departure walk timed out');
    let landed=false;
    const dropping=!to.oneWay && from.oneWay && target>=from.x && target<=from.x+from.w;
    const falling=to.y-from.y>=100;
    const needsDouble=!falling && !dropping && (from.y-to.y>100 || (Math.abs(target-(body.x+14))>240 && from.y>=370));
    for(let f=0;f<hz*4;f++) {
      const input={axis:aim(body,target),jumpHeld:!falling,
        drop:dropping, jumpPressed:!falling && !dropping && (f===0 || (needsDouble && f===Math.round(hz*.22)))};
      step(body,level,input,hz,ledger);
      if(f>1 && on(body,to)) {landed=true;break;}
      // A landing on another shelf is not silently accepted as this edge.
      if(f>Math.round(hz*.25) && body.grounded) break;
    }
    assert(landed,`${label} ${hz}Hz ${from.id} -> ${to.id} failed at x=${body.x.toFixed(1)}, foot=${(body.y+54).toFixed(1)}`);
    ledger.edges++;
    if(to.id===level.routes[0].path.at(-1) && !label.includes('reverse')) {
      const cache=level.chests.find(c=>c.id===level.routes[0].cacheId);
      let frames=0;
      while(Math.abs(body.x+14-cache.x)>15 && frames++<hz*4) {
        step(body,level,{axis:aim(body,cache.x),jumpHeld:false},hz,ledger);
        assert(on(body,to),'cache approach must remain on its shelf');
      }
      assert(Math.abs(body.x+14-cache.x)<65 && Math.abs(body.y+54-cache.y)<95,
        'must reach the actual existing interaction footprint, not just its shelf');
      ledger.cacheApproaches++;
    }
  }
  proofs.push({realm:level.id,route:label,hz,edges:ledger.edges,frames:ledger.frames,
    seconds:Number((ledger.frames/hz).toFixed(3)),cacheApproaches:ledger.cacheApproaches,highestFoot:Number(ledger.minFoot.toFixed(2))});
}

test('legacy campaign data and all original solids remain byte-semantic equivalent',()=>{
  assert.equal(levels.length,baseline.length);
  levels.forEach((level,i)=>{
    const old=baseline[i];
    const {solids,routes,...remaining}=level;
    const {solids:oldSolids,...oldRemaining}=old;
    assert.deepEqual(remaining,oldRemaining);
    oldSolids.forEach(s=>assert.deepEqual(solids.find(x=>x.id===s.id),s));
    assert.equal(new Set(solids.map(s=>s.id)).size,solids.length);
    const newSolids=solids.filter(s=>!oldSolids.some(x=>x.id===s.id));
    assert(newSolids.length>=3);
    newSolids.forEach(s=>{
      assert(s.oneWay && s.x>=0 && s.x+s.w<=level.boss.arena[0] && s.y>=220 && s.y<=480);
      assert(!old.checkpoints.some(cp=>Math.abs(cp.x-(s.x+s.w/2))<s.w/2+35),'checkpoint airspace preserved');
    });
    assert.equal(routes.length,1);
    const route=routes[0];
    assert.equal(route.optional,true);
    assert(old.chests.some(c=>c.id===route.cacheId));
    assert(route.instruction.length>50 && route.landmarks.length>=3);
    route.landmarks.forEach(l=>assert(l.name && l.description && Number.isFinite(l.x+l.y)));
    const destination=level.chests.find(c=>c.id===route.cacheId);
    const final=solids.find(s=>s.id===route.path.at(-1));
    assert(destination.x>=final.x && destination.x<=final.x+final.w && destination.y===final.y);
  });
});

for(const level of levels) for(const hz of [60,120]) {
  const route=level.routes[0];
  test(`${level.id} optional loop and cache return use continuous real physics inputs at ${hz}Hz`,()=>{
    const itinerary=[...route.approach,...route.path.slice(1),...route.returnPath.slice(1)];
    traverse(level,itinerary,hz,'upper/cache/return');
  });
  test(`${level.id} original lower alternative remains connected at ${hz}Hz`,()=>{
    traverse(level,route.lowerPath,hz,'lower/cache');
  });
  test(`${level.id} both original required rune climbs remain input-reachable at ${hz}Hz`,()=>{
    const prefix={moonroot:'m',cinderworks:'c',hollowspire:'h'}[level.id];
    traverse(level,[prefix+'-g1',prefix+'-a0',prefix+'-a1'],hz,'required/rune1');
    traverse(level,[prefix+'-g2',prefix+'-b0',prefix+'-b1'],hz,'required/rune2');
  });
  test(`${level.id} upper route can be retraced at ${hz}Hz`,()=>{
    traverse(level,[...route.path].reverse(),hz,'upper/reverse');
  });
}

test('v3 baseline checkpoint journeys and completed endings normalize identically',()=>{
  // Test base serialization invariants with existing fields only, not a full release claim.
  for(const mode of ['story','rush']) for(let i=0;i<3;i++) for(const checkpoint of baseline[i].checkpoints) {
    const game=new EW.Game(baseline);game.newRun('adventure',mode);
    game.progress.level=i;game.progress.checkpoint=checkpoint.id;
    game.progress.flags.seen=baseline.slice(0,i+1).map(l=>l.id);
    for(const prior of baseline.slice(0,i)) {
      game.progress.flags.defeated.push(prior.boss.id);
      game.progress.flags.runes.push(...prior.sigils.map(x=>x.id));
      game.progress.flags.sigils.push(...prior.sigils.map(x=>x.id));
    }
    const save=game.snapshot();
    const normalized=EW.validateSave(save,levels);
    assert(normalized,'fixture must be valid, not null-equivalent');
    assert.deepEqual(normalized,EW.validateSave(save,baseline));
    const restored=new EW.Game(levels);assert(restored.resume(save));
    const legacyRestored=new EW.Game(baseline);assert(legacyRestored.resume(save));
    assert.deepEqual(restored.snapshot(),legacyRestored.snapshot());
    assert.equal(restored.p.flasks,3);
  }
  for(const ending of ['mercy','rekindle']) {
    const game=new EW.Game(baseline);game.newRun('story','story');
    const s=game.snapshot();s.level=2;s.checkpoint=baseline[2].checkpoints[2].id;
    s.completed=true;s.ending=ending;s.flags.seen=baseline.map(l=>l.id);
    s.flags.defeated=baseline.map(l=>l.boss.id);
    s.flags.runes=baseline.flatMap(l=>l.sigils.map(x=>x.id));s.flags.sigils=[...s.flags.runes];
    s.flags.chests=baseline.flatMap(l=>l.chests.map(x=>x.id));
    assert(EW.validateSave(s,levels));
    assert.deepEqual(EW.validateSave(s,levels),EW.validateSave(s,baseline));
    const restored=new EW.Game(levels);assert(restored.resume(s));
    assert.equal(restored.status,'won');assert.equal(restored.progress.ending,ending);
  }
});

test('measured route ledger',()=>{
  assert.equal(proofs.length,30);
  console.log('ROUTE_PROOFS '+JSON.stringify(proofs));
  console.log('ROUTE_TOTALS '+JSON.stringify({itineraries:proofs.length,edges:proofs.reduce((n,p)=>n+p.edges,0),frames:proofs.reduce((n,p)=>n+p.frames,0),cacheApproaches:proofs.reduce((n,p)=>n+p.cacheApproaches,0)}));
});
