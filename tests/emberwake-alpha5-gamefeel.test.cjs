'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const EW=require('../assets/scripts/engine.js'),levels=require('../assets/scripts/worlds.js');
require('../assets/scripts/core-v11.js');require('../assets/scripts/encounters-v12.js');
const data=require('../assets/scripts/chapter-data.js');require('../assets/scripts/chapter-save.js');require('../assets/scripts/chapter-runtime.js');
const fresh=()=>new EW.Game(levels).newRun('adventure','story');
const clone=x=>JSON.parse(JSON.stringify(x));
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-9,message||`${a} != ${b}`);
function isolated(){const g=fresh();g.enemies=[];g.shots=[];g.events=[];return g;}
function release(g,h,seconds=.5){for(let i=0;i<Math.ceil(seconds/h);i++)g.step(h,{});}
function queued(h){const g=isolated();g.p.attackCD=.07;g.step(h,{attackPressed:true});assert.equal(g.attackID,0);return g;}
function ranged(type,side,h){
 const g=isolated(),source=levels[0].enemies.find(e=>e.type===type),size=type==='wisp'?{w:34,h:34,hp:34,gold:18,xp:20}:{w:36,h:58,hp:66,gold:22,xp:26};
 const e={...source,...size,homeX:source.x,baseY:source.y,face:-1,t:0,state:'patrol',flash:0,hitID:-1,phase:0};
 g.enemies=[e];Object.assign(g.p,{x:e.x+side*150,y:e.y-20});g.updateEnemy(e,h);
 assert.equal(e.state,'windup');assert.ok(Object.isFrozen(e.shotAim));return {g,e};
}
for(const h of [1/60,1/120])for(const type of ['sentinel','wisp'])for(const side of [-1,1])test(`isolated committed ${type} direction, side ${side}, ${h}`,()=>{
 const {g,e}=ranged(type,side,h),aim=e.shotAim,stats=clone(g.progress),duration=e.t;
 close(Math.hypot(aim.dx,aim.dy),1);assert.equal(Math.sign(aim.dx),side);
 assert.equal(duration,type==='wisp'?.7:.72);
 // The player crosses behind and changes height during the already-warned shot.
 Object.assign(g.p,{x:e.x-side*210,y:e.y-180});
 for(let i=0;e.state==='windup'&&i<200;i++){g.clock+=h;g.updateEnemy(e,h);}
 assert.equal(g.shots.length,1);const shot=g.shots[0],speed=type==='wisp'?230:310;
 close(shot.vx,aim.dx*speed);close(shot.vy,aim.dy*speed);assert.equal(shot.dmg,type==='wisp'?10:14);assert.equal(shot.r,7);assert.equal(shot.life,4);
 assert.equal(e.shotAim,null);assert.equal(e.state,'patrol');assert.equal(e.t,type==='wisp'?2.1:1.8);
 assert.deepEqual(g.progress,stats,'aiming/firing must not mutate progression or rewards');
});
test('isolated stunned windup retains its direction and pauses its existing timer',()=>{
 const {g,e}=ranged('sentinel',1,1/120),aim=e.shotAim,t=e.t;e.stun=.2;
 g.updateEnemy(e,.1);assert.equal(e.shotAim,aim);assert.equal(e.t,t);assert.equal(g.shots.length,0);
 g.p.x=e.x-300;g.updateEnemy(e,.1);assert.equal(e.t,t);
 g.updateEnemy(e,1/120);assert.equal(e.shotAim,aim);assert.ok(e.t<t);
});
test('isolated committed shot remains reflectable at unchanged precision-guard damage',()=>{
 const g=isolated(),e={face:-1};g.lockEnemyAim(e,g.p.x+90,g.p.y+27);
 g.enemyShot(e,g.p.x+48,g.p.y+27,310,7,14,e.shotAim);g.p.face=1;
 g.step(1/120,{parryPressed:true});assert.equal(g.shots[0].owner,'hero');assert.equal(g.shots[0].reflected,true);
 assert.equal(g.shots[0].dmg,28+g.progress.upgrades.focus*7);assert.equal(g.shots[0].vx,740);
});
test('isolated enemy defeat clears aim and grants the original reward exactly once',()=>{
 const {g,e}=ranged('sentinel',1,1/120),gold=g.progress.gold,xp=g.progress.xp;e.hp=1;
 g.damageEnemy(e,1);assert.equal(e.shotAim,null);assert.equal(g.progress.gold,gold+22);assert.equal(g.progress.xp,xp+26);
 const snapshot=g.snapshot();g.damageEnemy(e,100);assert.deepEqual(g.snapshot(),snapshot);
});
test('isolated cached room departure preserves a live windup; fresh reload rebuilds it',()=>{
 const g=isolated(),e={...levels[0].enemies[1],w:36,h:58,hp:66,homeX:1400,x:1400,baseY:532,face:-1,t:0,state:'patrol',flash:0,hitID:-1,patrol:[1400,1400]};
 g.enemies=[e];g.p.x=1200;g.updateEnemy(e,1/120);const aim=e.shotAim,t=e.t;
 const id='ch1:door:millpond-enter',door=data.doors[id];g.p.x=door.source.x+door.source.w/2-14;g.p.y=536;
 assert.ok(g.enterDoor(id));const back=data.doors[door.reverseId];g.p.x=back.source.x+back.source.w/2-14;g.p.y=536;
 assert.ok(g.enterDoor(back.id));assert.equal(g.enemies[0],e);assert.equal(e.shotAim,aim);assert.equal(e.t,t);
 g.loadLevel(0);const rebuilt=g.enemies.find(v=>v.id===e.id);assert.notEqual(rebuilt,e);assert.equal(rebuilt.shotAim,undefined);assert.equal(rebuilt.state,'patrol');
 assert.doesNotMatch(JSON.stringify(g.snapshotJourney()),/shotAim/);
});
for(const h of [1/60,1/120])test(`isolated fresh sword tap accepts <=80ms only, ${h}`,()=>{
 for(const [remaining,accepted] of [[.08,true],[.07,true],[.080001,false],[.12,false]]){
  const g=isolated();g.p.attackCD=remaining;g.step(h,{attackPressed:true});assert.equal(g.attackID,0);
  release(g,h);assert.equal(g.attackID,accepted?1:0,String(remaining));
  if(accepted){assert.equal(g.events.filter(e=>e.type==='slash').length,1);assert.equal(g.p.combo,1);}
 }
});
for(const h of [1/60,1/120])test(`isolated buffer is one slot, consumes once, and never shortens recovery, ${h}`,()=>{
 const g=queued(h),before=g.p.attackCD;g.step(h,{});g.step(h,{attackPressed:true});g.step(h,{});
 let firedAt=null;
 for(let i=0;i<80;i++){const old=g.attackID;g.step(h,{});if(g.attackID!==old){assert.equal(firedAt,null);firedAt=g.clock;}}
 assert.equal(g.attackID,1);assert.ok(firedAt>=.07-1e-9);assert.ok(before>0);
 assert.equal(g.events.filter(e=>e.type==='slash').length,1);
});
for(const h of [1/60,1/120])test(`ordinary held sword retains cooldown/combo cadence, ${h}`,()=>{
 const g=isolated(),hits=[];
 for(let i=0;i<Math.ceil(1.8/h);i++){const old=g.attackID;g.step(h,{attackPressed:true});if(old!==g.attackID)hits.push({t:g.clock,combo:g.p.combo});}
 assert.ok(hits.length>=6);
 for(let i=1;i<hits.length;i++){const minimum=hits[i-1].combo===3?.34:.22,diff=hits[i].t-hits[i-1].t;assert.ok(diff>=minimum-1e-9);assert.ok(diff<=minimum+h+1e-9);assert.equal(hits[i].combo,hits[i-1].combo%3+1);}
});
test('isolated priority includes the first legal dash tick; no queued sword leaks through',()=>{
 const g=queued(1/120);g.p.dashCD=1/240;
 g.step(1/120,{attackPressed:true,dashPressed:true,parryPressed:true});assert.ok(g.p.dash>0);assert.equal(g.p.parry,0);assert.equal(g.attackID,0);
 release(g,1/120);assert.equal(g.attackID,0);
});
for(const kind of ['clearInput-boundary','hurt','guard','dash','unready-guard','unready-dash','death','load','new-run','resume','scene','menu','won'])test(`isolated pending tap cancellation: ${kind}`,()=>{
 const h=1/120,g=queued(h);
 if(kind==='clearInput-boundary'){const before=JSON.stringify({p:g.p,j:g.snapshotJourney(),events:g.events});g.clearCombatInput();assert.equal(JSON.stringify({p:g.p,j:g.snapshotJourney(),events:g.events}),before);}
 if(kind==='hurt'){g.p.inv=0;g.hurt(1,g.p.x-50);}
 if(kind==='guard')g.step(h,{parryPressed:true});
 if(kind==='dash')g.step(h,{dashPressed:true});
 if(kind==='unready-guard'){g.p.parryCD=1;g.step(h,{parryPressed:true});}
 if(kind==='unready-dash'){g.p.dashCD=1;g.step(h,{dashPressed:true});}
 if(kind==='death'){g.p.hp=1;g.p.inv=0;g.hurt(100,g.p.x-50);assert.equal(g.status,'dead');}
 if(kind==='load')g.loadLevel(0);
 if(kind==='new-run')g.newRun('adventure');
 if(kind==='resume')assert.ok(g.resumeJourney(g.snapshotJourney()));
 if(kind==='scene')assert.ok(g.switchChapterScene('ch1:room:rootcellar','ch1:anchor:rootcellar-entry'));
 if(kind==='menu'||kind==='won'){g.status=kind;g.step(h,{});g.status='playing';}
 release(g,h);assert.equal(g.attackID,0,kind);
});
test('isolated invalid dt is inert; ignored invulnerable damage does not discard intent',()=>{
 const g=queued(1/120),before=JSON.stringify({p:g.p,j:g.snapshotJourney(),events:g.events});
 for(const h of [NaN,-1,0,2])g.step(h,{dashPressed:true});assert.equal(JSON.stringify({p:g.p,j:g.snapshotJourney(),events:g.events}),before);
 g.hurt(10,g.p.x);release(g,1/120);assert.equal(g.attackID,1);
});
test('isolated optional foe keeps zero rewards and no aim/input fields enter saves',()=>{
 const g=isolated();assert.ok(g.switchChapterScene('ch1:room:millpond','ch1:anchor:millpond-entry'));
 const e=g.enemies.find(v=>v.type==='sentinel'),gold=g.progress.gold,xp=g.progress.xp;assert.ok(e);g.lockEnemyAim(e,e.x+18,e.y+25);
 g.damageEnemy(e,999);assert.equal(g.progress.gold,gold);assert.equal(g.progress.xp,xp);assert.ok(g.chapterHas('defeated',e.id));
 const snapshot=g.snapshotJourney();assert.doesNotMatch(JSON.stringify(snapshot),/shotAim|swordInputs|remaining/);assert.ok(EW.ChapterSave.normalizePayload(snapshot,levels));
});
function fingerprint(g){return crypto.createHash('sha256').update(JSON.stringify({j:g.snapshotJourney(),p:g.p,enemies:g.enemies,shots:g.shots,boss:g.boss,status:g.status,clock:g.clock,attackID:g.attackID})).digest('hex');}
for(const h of [1/60,1/120])test(`earned start-area fresh tap combo exactly replays with no state injection, ${h}`,()=>{
 const g=fresh(),actions=[],hashes=[];let pressed=false,released=false;
 for(let i=0;i<Math.ceil(.8/h);i++){
  let input={};if(i===0)input={attackPressed:true};
  else if(!pressed&&g.p.attackCD>h&&g.p.attackCD<=.08){input={attackPressed:true};pressed=true;}
  else if(pressed)released=true;
  actions.push(input);g.step(h,input);hashes.push(fingerprint(g));
 }
 assert.ok(pressed&&released);assert.equal(g.attackID,2);assert.equal(g.p.combo,2);
 assert.equal(g.progress.gold,0);assert.equal(g.progress.xp,0);assert.equal(g.progress.stats.kills,0);
 const r=fresh();for(let i=0;i<actions.length;i++){r.step(h,clone(actions[i]));assert.equal(fingerprint(r),hashes[i]);}
 assert.deepEqual(r.snapshotJourney(),g.snapshotJourney());
});
for(const h of [1/60,1/120])test(`earned campaign prefix defeats ordinary crawler/sentinel/wisp and exactly replays, ${h}`,()=>{
 const Q=require('./emberwake-qa.js'),g=fresh(),c=new Q.Controller(levels,'story','original'),actions=[],hashes=[];let warned=false;
 // Controller receives cloned observations. Only the runner owns the live game;
 // no enemy/pose/fact/resource injection, skipped waypoint or controller change.
 for(let frame=0;frame<6500&&!g.has('defeated','m-e2');frame++){
  const action=c.tick(Q.observe(g,false,frame));assert.deepEqual(Object.keys(action),['input']);
  actions.push(clone(action.input));g.step(h,action.input);hashes.push(fingerprint(g));
  warned ||= g.enemies.some(e=>e.shotAim&&e.state==='windup');
 }
 assert.ok(warned);for(const id of ['m-e0','m-e1','m-e2'])assert.ok(g.has('defeated',id),id);
 assert.equal(g.progress.stats.deaths,0);assert.ok(EW.validateSave(g.snapshot(),levels));
 const r=fresh();for(let i=0;i<actions.length;i++){r.step(h,clone(actions[i]));assert.equal(fingerprint(r),hashes[i]);}
 assert.deepEqual(r.snapshotJourney(),g.snapshotJourney());
});
test('isolated one-slot request expires rather than waiting through an extended recovery',()=>{
 const h=1/120,g=queued(h);g.p.attackCD=1;release(g,h,1.4);assert.equal(g.attackID,0);
});
