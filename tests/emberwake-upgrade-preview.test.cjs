'use strict';
// Isolated combat/purchase fixtures, not input-earned campaign evidence.
const {test}=require('node:test'),assert=require('node:assert/strict');
const EW=require('../assets/scripts/engine.js'),levels=require('../assets/scripts/worlds.js');
require('../assets/scripts/core-v11.js');require('../assets/scripts/encounters-v12.js');require('../assets/scripts/chapter-data.js');require('../assets/scripts/chapter-save.js');require('../assets/scripts/chapter-runtime.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(rank,level,kind){const g=new EW.Game(levels).newRun('story');g.progress.rank=rank;g.progress.upgrades={blade:rank%4,heart:rank%4,focus:rank%4,[kind]:level};g.progress.gold=1000;g.p.x=500;g.p.y=536;g.p.hp=40;g.p.mp=30;g.p.flasks=1;g.enemies=[];g.events=[];return g;}
function actualStats(g){const p=g.p;g.enemies=[];g.shots=[];p.mp=g.maxMP;p.spellCD=0;assert(g.cast());const boltDamage=g.shots[0].dmg;g.shots=[];p.mp=0;g.step(1/120,{});const lumenPerSecond=p.mp*120;
 g.shots=[{owner:'enemy',x:p.x+30,y:p.y+27,vx:0,vy:0,r:7,life:1,dmg:1}];p.parryCD=0;p.face=1;g.step(1/120,{parryPressed:true});const reflectedBoltDamage=g.shots.find(s=>s.reflected)?.dmg;assert.notEqual(reflectedBoltDamage,undefined);g.shots=[];p.parry=0;
 const damage=[];g.damageEnemy=(e,n)=>damage.push(n);g.enemies=[{id:'fixture',type:'crawler',x:p.x+40,y:556,w:42,h:34,hp:9999,homeX:p.x+40,baseY:556,patrol:[p.x+40,p.x+40],t:10,face:1,state:'patrol',hitID:-1}];
 for(const combo of [0,2]){p.attackCD=0;p.dash=0;p.combo=combo;p.comboAge=0;g.step(1/120,{attackPressed:true});}
 return {maxHP:g.maxHP,maxMP:g.maxMP,swordDamage:damage[0],thirdStrikeDamage:damage[1],boltDamage,lumenPerSecond,reflectedBoltDamage};}
function compare(a,b){for(const key of Object.keys(a))assert(Math.abs(a[key]-b[key])<1e-7,key+': '+a[key]+' != '+b[key]);}
test('preview is pure for every rank, attunement level and kind; actual wrapped combat/purchase agrees',()=>{
 for(let rank=1;rank<=20;rank++)for(const kind of ['blade','heart','focus'])for(let level=0;level<=3;level++){
  const g=setup(rank,level,kind),before=JSON.stringify(g),journey=clone(g.progress),preview=g.upgradePreview(kind);assert.equal(JSON.stringify(g),before);assert.deepEqual(EW.upgradePreview(journey,kind),preview);assert.deepEqual(g.progress,journey);
  const frozen=Object.freeze({...journey,upgrades:Object.freeze({...journey.upgrades})});assert.deepEqual(EW.upgradePreview(frozen,kind),preview);
  compare(actualStats(setup(rank,level,kind)),preview.current);assert.equal(preview.level,level);assert.deepEqual(preview.refill,{hp:true,mp:true,flasks:false});
  if(level===3){assert(preview.capped);assert.equal(preview.cost,null);assert.equal(preview.next,null);assert.equal(preview.nextLevel,null);assert.equal(preview.affordable,false);assert.equal(g.upgrade(kind).ok,false);}
  else{assert.equal(preview.cost,[90,160,250][level]);assert(preview.affordable);assert(g.upgrade(kind).ok);assert.equal(g.progress.gold,preview.goldAfter);assert.equal(g.progress.upgrades[kind],preview.nextLevel);assert.deepEqual([g.p.hp,g.p.mp,g.p.flasks],[g.maxHP,g.maxMP,1]);compare(actualStats(g),preview.next);}
 }
});
test('unknown/no journey previews return null; insufficient funds preview never purchases',()=>{const menu=new EW.Game(levels);assert.equal(menu.upgradePreview('blade'),null);assert.equal(EW.upgradePreview(null,'blade'),null);const g=setup(1,0,'blade');g.progress.gold=89;const before=JSON.stringify(g);assert.equal(g.upgradePreview('bogus'),null);const p=g.upgradePreview('blade');assert.equal(p.affordable,false);assert.equal(p.goldAfter,-1);assert.equal(JSON.stringify(g),before);assert.equal(g.upgrade('blade').ok,false);assert.equal(JSON.stringify(g),before);});
test('preview results cannot mutate the live journey or subsequent results',()=>{const g=setup(4,1,'focus'),p=g.upgradePreview('focus');p.current.maxHP=-1;p.next.maxMP=-1;p.refill.flasks=true;assert.notEqual(g.upgradePreview('focus').current.maxHP,-1);assert.notEqual(g.upgradePreview('focus').next.maxMP,-1);assert.equal(g.upgradePreview('focus').refill.flasks,false);});
