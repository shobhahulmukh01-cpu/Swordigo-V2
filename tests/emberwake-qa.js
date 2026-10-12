#!/usr/bin/env node
'use strict';
/* Dependency-free autonomous controller. No engine/world mutations. Run:
   node emberwake-qa.js /path/to/exact-export-directory
   Controller receives JSON-cloned observations, never the live Game instance.
   Runner calls newRun, step, and only a choice-event-authorized finish. */
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const dir=path.resolve(process.env.EW_SOURCE_DIR||process.argv[2]||path.join(__dirname,'..','assets','scripts'));
const reportDir=path.resolve(process.env.EW_QA_OUTPUT||'qa');
const EW=require(path.join(dir,'engine.js'));
const LEVELS=require(path.join(dir,'worlds.js'));
require(path.join(dir,'core-v11.js'));
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hashes=Object.fromEntries(['engine.js','worlds.js','core-v11.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,n))).digest('hex')]));
function route(l){
 const r=[], point=(x,foot=590)=>r.push({kind:'point',x:x-14,foot});
 const rest=i=>r.push({kind:'rest',x:l.checkpoints[i].x-14,foot:590});
 const shrine=i=>r.push({kind:'shrine',x:l.shrines[i].x-14,foot:590});
 const fight=i=>r.push({kind:'fight',id:l.enemies[i].id});
 const rune=i=>{const sig=l.sigils[i];const upper=l.solids.find(q=>q.oneWay&&q.y===370&&sig.x>=q.x&&sig.x<q.x+q.w);const lower=l.solids.filter(q=>q.oneWay&&q.y===480&&q.x<upper.x).sort((a,b)=>b.x-a.x)[0];point(lower.x+lower.w/2,480);r.push({kind:'rune',id:sig.id});};
 rest(0);shrine(0);
 for(const c of l.chests.filter(q=>q.y===590&&q.x<600))r.push({kind:'chest',id:c.id,x:c.x-14,foot:c.y});
 if(l.id==='moonroot'){
  fight(0);fight(1);rune(0);fight(2);fight(3);rest(1);rune(1);fight(4);shrine(1);fight(5);
  const c=l.chests.find(q=>q.y===370&&q.x>3000);r.push({kind:'chest',id:c.id,x:c.x-14,foot:370});
  fight(6);fight(7);rest(2);
 }else if(l.id==='cinderworks'){
  fight(0);fight(1);rune(0);fight(2);fight(3);fight(4);rest(1);rune(1);fight(5);fight(6);fight(7);shrine(1);fight(8);rest(2);
 }else{
  fight(0);fight(1);rune(0);fight(2);fight(3);rest(1);fight(4);rune(1);fight(5);fight(6);shrine(1);fight(7);fight(8);rest(2);
 }
 r.push({kind:'boss'});r.push({kind:'exit',x:l.exit.x-14,foot:590});return r;
}
class Controller{
 constructor(levels,mode){this.levels=clone(levels);this.mode=mode;this.level=-1;this.ix=0;this.age=0;this.choices=0;}
 nav(s,x,foot,input){
  const p=s.p, f=p.y+p.h, dx=x-p.x;
  input.axis=clamp(dx/24,-1,1);input.jumpHeld=true;
  const solids=this.levels[s.level].solids;
  const onWay=solids.some(q=>q.oneWay&&Math.abs(q.y-f)<2&&p.x<q.x+q.w&&p.x+p.w>q.x);
  if(p.grounded&&onWay&&foot>f+45)input.drop=true;
  const floors=solids.filter(q=>!q.oneWay&&q.y===590).sort((a,b)=>a.x-b.x);
  const floor=floors.find(q=>p.x+14>=q.x&&p.x+14<=q.x+q.w);
  const next=floor&&floors.find(q=>q.x>floor.x);
  const gapJump=this.mode!=='rush'&&dx>30&&p.grounded&&f>575&&floor&&next&&next.x>floor.x+floor.w&&floor.x+floor.w-(p.x+p.w)<55;
  const up=foot<f-24&&Math.abs(dx)<235;
  if(p.grounded&&(up||gapJump))input.jumpPressed=true;
  else if(!p.grounded&&p.jumps<2&&p.vy>-65&&((foot<f-8&&Math.abs(dx)<240)||(!floor&&dx>35)))input.jumpPressed=true;
  return Math.abs(dx)<7&&Math.abs(f-foot)<3&&p.grounded;
 }
 defense(s,input,target){
  const p=s.p;
  if(p.hp<s.maxHP*.56&&p.flasks>0)input.healPressed=true;
  const incoming=s.shots.find(a=>a.owner==='enemy'&&Math.abs(a.x+a.vx*.1-p.x-14)<65&&Math.abs(a.y+a.vy*.1-p.y-27)<45);
  const close=target&&Math.abs(target.x+target.w/2-p.x-14)<100&&Math.abs(target.y-p.y)<95;
  const charge=target?.isBoss&&((target.state==='windup'&&target.move==='charge'&&target.t<.14)||target.state==='charge')&&Math.abs(target.x+48-p.x-14)<185;
  if(p.parryCD===0&&(incoming||close||charge)){
   input.parryPressed=true;input.axis=Math.sign((incoming?incoming.x:target.x+target.w/2)-p.x-14)||p.face;
  }else if(charge&&p.dashCD===0&&p.parry<=0){input.dashPressed=true;input.axis=Math.sign(target.x+48-p.x-14)||p.face;}
 }
 tick(s){
  if(s.status!=='playing')throw Error('Controller stopped: '+s.status);
  if(s.level!==this.level){this.level=s.level;this.ix=0;this.age=0;const l=this.levels[s.level];this.route=this.mode==='rush'?[{kind:'boss'},{kind:'exit',x:1686,foot:590}]:route(l);}
  const w=this.route[this.ix];if(!w)throw Error('Route exhausted at '+s.level);
  if(++this.age>7000)throw Error('Waypoint timeout '+JSON.stringify(w)+' '+JSON.stringify({p:s.p,boss:s.boss,sigils:s.sigils}));
  const input={axis:0,jumpHeld:true}, l=this.levels[s.level];let advance=false,target;
  if(w.kind==='fight'){
   target=s.enemies.find(e=>e.id===w.id&&e.hp>0);
   if(!target)advance=true;
   else{
    let floor;
    if(target.type==='wisp')floor=l.solids.filter(q=>q.oneWay&&Math.abs(q.y-(target.baseY+65))<100).sort((a,b)=>Math.abs(clamp(target.x,a.x,a.x+a.w)-target.x)-Math.abs(clamp(target.x,b.x,b.x+b.w)-target.x))[0];
    else floor=l.solids.find(q=>!q.oneWay&&q.y===590&&target.homeX>=q.x&&target.homeX<q.x+q.w);
    if(!floor)throw Error('No fighting surface for '+target.id);
    const side=target.x>floor.x+floor.w?-1:(target.x<floor.x?1:-1);
    const x=clamp(target.x+target.w/2+side*90-14,floor.x+4,floor.x+floor.w-28);
    this.nav(s,x,floor.y,input);
    if(Math.abs(target.x-s.p.x)<260){input.attackPressed=true;input.spellPressed=true;}
    if(Math.abs(x-s.p.x)<8)input.axis=Math.sign(target.x+target.w/2-s.p.x-14)||s.p.face;
   }
  }else if(w.kind==='rune'){
   const sig=l.sigils.find(q=>q.id===w.id);
   if(s.sigils.includes(sig.id))advance=true;
   else{
    const released=s.runes.includes(sig.id);
    const ready=this.nav(s,sig.x-(released?14:64),sig.y,input);
    if(!released&&ready){input.axis=1;input.spellPressed=true;}
   }
  }else if(w.kind==='boss'){
   target=s.boss;
   if(!target||target.hp<=0)advance=true;
   else{
    const x=clamp(target.x-66,target.arena[0]+12,target.arena[1]-40);
    this.nav(s,x,590,input);input.attackPressed=true;
    if(Math.abs(target.x-s.p.x)<420)input.spellPressed=true;
    if(Math.abs(x-s.p.x)<8)input.axis=Math.sign(target.x+48-s.p.x-14)||s.p.face;
   }
  }else if(w.kind==='exit'){
   this.nav(s,w.x,w.foot,input);
   if(s.near?.type==='exit')input.interactPressed=true;
   if(s.choice){this.choices++;return{input,choice:'mercy'};}
  }else if(w.kind==='chest'&&s.chests.includes(w.id))advance=true;
  else if(this.nav(s,w.x,w.foot,input)){
   if(w.kind!=='point')input.interactPressed=true;
   advance=true;
  }
  this.defense(s,input,target);
  if(advance){this.ix++;this.age=0;if(input.interactPressed)return {input};return this.tick(s);}
  return {input};
 }
}
function observe(g,choice){return clone({level:g.progress.level,status:g.status,p:g.p,maxHP:g.maxHP,maxMP:g.maxMP,enemies:g.enemies,boss:g.boss,bossActive:g.bossActive,shots:g.shots,near:g.near,runes:g.progress.flags.runes,sigils:g.progress.flags.sigils,chests:g.progress.flags.chests,choice});}
function play(mode,dt=1/120,limit=80000,difficulty='story',ending=mode==='rush'?'rekindle':'mercy'){
 const before=JSON.stringify(LEVELS),g=new EW.Game(LEVELS);g.newRun(difficulty,mode);
 const c=new Controller(LEVELS,mode),seen=new WeakSet(),counts={},milestones=[],inputRuns=[];let choice=false,frames=0;
 const drain=()=>{for(const e of g.events){if(seen.has(e))continue;seen.add(e);counts[e.type]=(counts[e.type]||0)+1;if(e.type==='choice')choice=true;if(e.type==='realm')choice=false;if(['realm','rune','sigil','defeat','bossIntro','checkpoint','choice','ending','death','respawn'].includes(e.type))milestones.push({frame:frames,level:g.progress.level,...clone(e)});}};
 let error=null;
 try{
  drain();
  for(;frames<limit&&g.status!=='won';frames++){
   const action=c.tick(observe(g,choice));if(action.choice)action.choice=ending;
   const key=JSON.stringify(action);
   if(inputRuns.length&&inputRuns[inputRuns.length-1].key===key)inputRuns[inputRuns.length-1].frames++;
   else inputRuns.push({key,frames:1});
   if(action.choice){if(!choice)throw Error('Unprompted final choice');if(!g.finish(action.choice))throw Error('Legitimate choice rejected');}
   else g.step(dt,action.input);
   drain();
  }
  if(g.status!=='won')throw Error('Frame budget exhausted');
  if(JSON.stringify(LEVELS)!==before)throw Error('World mutation detected');
  const expected=mode==='story'?LEVELS.flatMap(l=>[...l.enemies,l.boss].map(e=>e.id)):LEVELS.map(l=>l.boss.id);
  if(expected.some(id=>!g.has('defeated',id)))throw Error('Missing required defeats');
  if(LEVELS.some(l=>l.sigils.some(sig=>!g.has('sigils',sig.id)||!g.has('runes',sig.id))))throw Error('Missing sigil');
  if(!EW.validateSave(g.snapshot(),LEVELS))throw Error('Completed save invalid');
 }catch(e){error=e.message;}
 return {pass:!error,mode,difficulty,dt,frames,error,counts,milestones,final:g.snapshot(),last:{p:clone(g.p),boss:clone(g.boss),waypoint:c.route?.[c.ix]},inputs:inputRuns.map(r=>({frames:r.frames,...JSON.parse(r.key)}))};
}

/* REGRESSION FIXTURES BELOW MAY MUTATE THEIR OWN ISOLATED GAME INSTANCES.
   They are NEVER the games used by play(), replay(), or completion evidence. */
const assert=require('assert').strict;
function fixture(difficulty='story',index=0){const g=new EW.Game(LEVELS).newRun(difficulty);if(index)g.loadLevel(index);return g;}
function memory(entries={}){const m=new Map(Object.entries(entries));return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
function terminal(r){const s=clone(r.final);s.completed=false;s.ending=null;return s;}
function state(g){return clone({progress:g.progress,p:g.p,status:g.status,shots:g.shots,boss:g.boss});}
function runRegressions(runs){
 const tests=[],test=(name,fn)=>{try{fn();tests.push({name,pass:true});}catch(e){tests.push({name,pass:false,error:e.message});}};
 const fresh=()=>fixture().snapshot(),reject=s=>assert.equal(EW.validateSave(s,LEVELS),null);
 test('version and feature flags',()=>{assert.equal(EW.version,'1.1.0-rc.3');for(const k of ['precisionGuard','strictJourneyValidation','explicitBeaconRest','preservedFallDamage'])assert.equal(EW.features[k],true);});
 test('fresh save round trip',()=>assert.deepEqual(EW.validateSave(JSON.stringify(fresh()),LEVELS),fresh()));
 test('completed story save and resume round trip',()=>{assert(runs[0].pass);const g=fixture();assert(g.resume(JSON.stringify(runs[0].final)));assert.equal(g.status,'won');assert.deepEqual(g.snapshot(),runs[0].final);});
 test('completed rush save round trip',()=>{assert(runs[1].pass);assert.deepEqual(EW.validateSave(runs[1].final,LEVELS),runs[1].final);});
 for(const raw of ['{','null','[]','true','"text"'])test('reject malformed/nonjourney '+raw,()=>reject(raw));
 for(const category of ['chests','runes','sigils','defeated','seen'])test('reject unknown ID in '+category,()=>{const s=fresh();s.flags[category].push('unrecognized');reject(s);});
 for(const [category,id] of [['chests','m-si0'],['runes','m-e0'],['sigils','m-ch0'],['defeated','moonroot'],['seen','m-boss']])test('reject misplaced ID in '+category,()=>{const s=fresh();s.flags[category].push(id);reject(s);});
 test('reject sigil without released rune',()=>{const s=fresh();s.flags.sigils.push('m-si0');reject(s);});
 test('reject unseen current realm',()=>{const s=fresh();s.flags.seen=[];reject(s);});
 for(const [field,v] of [['gold',1.5],['gold',-1],['kills',.5],['kills',-1],['deaths',.5],['deaths',-1]])test('reject invalid counter '+field+'='+v,()=>{const s=fresh();if(field==='gold')s.gold=v;else s.stats[field]=v;reject(s);});
 for(const v of [undefined,null,0,'false'])test('reject nonboolean completed '+String(v),()=>{const s=fresh();s.completed=v;reject(s);});
 for(const [field,v] of [['level',3],['level',.5],['rank',21],['mode','arena'],['difficulty','easy']])test('reject invalid '+field,()=>{const s=fresh();s[field]=v;reject(s);});
 for(const v of [-1,4,.5])test('reject invalid upgrade '+v,()=>{const s=fresh();s.upgrades.blade=v;reject(s);});
 test('reject missing upgrades',()=>{const s=fresh();delete s.upgrades;reject(s);});
 test('reject incomplete save with ending',()=>{const s=fresh();s.ending='mercy';reject(s);});
 for(const what of ['ending','historical sigil','boss','level'])test('reject inconsistent completed '+what,()=>{const s=clone(runs[0].final);if(what==='ending')s.ending=null;else if(what==='historical sigil')s.flags.sigils.shift();else if(what==='boss')s.flags.defeated=s.flags.defeated.filter(id=>id!=='m-boss');else s.level=0;reject(s);});
 test('deduplicate valid flags',()=>{const s=fresh();s.flags.seen.push('moonroot');assert.deepEqual(EW.validateSave(s,LEVELS).flags.seen,['moonroot']);});
 test('normalize unrecognized checkpoint to current first beacon',()=>{const s=fresh();s.checkpoint='missing';assert.equal(EW.validateSave(s,LEVELS).checkpoint,'m-cp0');});
 test('save backup fallback on invalid primary',()=>{const s=fresh();assert.deepEqual(EW.Save.read(memory({save:'corrupt','save.backup':JSON.stringify(s)}),'save',LEVELS),s);});
 test('save backup fallback when primary read throws',()=>{const s=fresh();const st={getItem:k=>{if(k==='save')throw Error('blocked primary');return JSON.stringify(s);}};assert.deepEqual(EW.Save.read(st,'save',LEVELS),s);});
 test('save write preserves prior valid backup',()=>{const old=fresh(),s=fresh();s.gold=17;const st=memory({save:JSON.stringify(old)});assert(EW.Save.write(st,'save',s,LEVELS).ok);assert.deepEqual(JSON.parse(st.getItem('save.backup')),old);assert.deepEqual(JSON.parse(st.getItem('save')),s);});
 test('invalid save write leaves storage untouched',()=>{const st=memory({save:'original'}),s=fresh();s.flags.sigils.push('m-si0');const before=Array.from(st.m);assert.equal(EW.Save.write(st,'save',s,LEVELS).ok,false);assert.deepEqual(Array.from(st.m),before);});
 test('unavailable storage reports read/write failure',()=>{assert.equal(EW.Save.read(null,'save',LEVELS),null);assert.equal(EW.Save.write(null,'save',fresh(),LEVELS).ok,false);assert.equal(EW.Save.write({getItem(){throw Error('blocked');}},'save',fresh(),LEVELS).ok,false);});
 test('reject advanced story save without prior realm completion',()=>{const s=fresh();s.level=1;s.checkpoint='c-cp0';s.flags.seen.push('cinderworks');reject(s);});
 test('raw JSON 150000-byte safety limit remains enforced',()=>{const s=fresh();s.extraPadding='x'.repeat(150000);const raw=JSON.stringify(s);assert(raw.length>150000);reject(raw);});
 test('finish rejected from menu',()=>assert.equal(new EW.Game(LEVELS).finish('mercy'),false));
 test('finish rejected early, without mutation',()=>{const g=fixture(),before=state(g);assert.equal(g.finish('mercy'),false);assert.deepEqual(state(g),before);});
 test('finish rejects a missing historical boss after valid resume',()=>{const g=fixture();assert(g.resume(terminal(runs[0])));g.progress.flags.defeated=g.progress.flags.defeated.filter(id=>id!==LEVELS[0].boss.id);const before=state(g);assert.equal(g.finish('mercy'),false);assert.deepEqual(state(g),before);});
 for(const missing of ['sigils','boss'])test('finish requires final '+missing,()=>{const s=terminal(runs[0]);if(missing==='sigils')s.flags.sigils=s.flags.sigils.filter(id=>id!=='h-si0');else s.flags.defeated=s.flags.defeated.filter(id=>id!==LEVELS[LEVELS.length-1].boss.id);const g=fixture();assert(g.resume(s));const before=state(g);assert.equal(g.finish('mercy'),false);assert.deepEqual(state(g),before);});
 test('finish rejects invalid ending',()=>{const g=fixture();assert(g.resume(terminal(runs[0])));const before=state(g);assert.equal(g.finish('unrecognized'),false);assert.deepEqual(state(g),before);});
 test('completed finish cannot be repeated',()=>{const g=fixture();assert(g.resume(runs[0].final));assert.equal(g.finish('rekindle'),false);assert.equal(g.progress.ending,'mercy');});
 test('successful finish must produce a valid completed save',()=>{const g=fixture();assert(g.resume(terminal(runs[0])));g.progress.flags.sigils=g.progress.flags.sigils.filter(id=>id!=='m-si0');g.progress.flags.runes=g.progress.flags.runes.filter(id=>id!=='m-si0');const before=state(g);const ok=g.finish('mercy');assert.equal(ok,false);assert.deepEqual(state(g),before);assert(!ok||EW.validateSave(g.snapshot(),LEVELS)!==null,'finish returned success but its completed save is rejected');});
 for(const dt of [0,-1,NaN,Infinity])test('invalid step dt '+String(dt)+' is inert',()=>{const g=fixture(),before=state(g);g.step(dt,{parryPressed:true});assert.deepEqual(state(g),before);});
 test('out-of-range step dt 2 is inert including guard',()=>{const g=fixture(),before=state(g);g.step(2,{parryPressed:true});assert.deepEqual(state(g),before);});
 for(const difficulty of ['story','adventure','veteran'])test('nonlethal void rescue preserves damaged vitals '+difficulty,()=>{
  const g=fixture(difficulty);g.p.hp=80;g.p.mp=43;g.p.flasks=1;g.p.y=800;g.p.inv=10;
  const before=clone(g.progress.stats),damage=Math.max(1,Math.round(25*({story:.5,adventure:1,veteran:1.35}[difficulty])));
  g.step(1/120,{});assert.equal(g.status,'playing');assert.equal(g.p.hp,80-damage);assert(Math.abs(g.p.mp-(43+.1))<1e-9);assert.equal(g.p.flasks,1);assert.equal(g.progress.stats.deaths,before.deaths);assert.equal(g.progress.checkpoint,'m-cp0');assert.equal(g.p.x,150);assert.equal(g.p.y,536);assert.equal(g.p.parry,0);assert.equal(g.p.parryCD,0);assert.equal(g._fallVitals,null);assert(g.events.some(e=>e.type==='respawn'));
 });
 test('void damage cannot be parried',()=>{const g=fixture();g.p.hp=50;g.p.parry=.19;g.hurt(25,g.p.x+20,true);assert.equal(g.p.hp,37);assert(g._fallVitals);assert(!g.events.some(e=>e.type==='parry'));});
 test('lethal void increments death once without free rescue',()=>{const g=fixture();g.p.hp=5;g.p.y=800;g.step(1/120,{});assert.equal(g.status,'dead');assert.equal(g.progress.stats.deaths,1);assert(!g.events.some(e=>e.type==='respawn'));});
 test('lava rescue preserves loss and flask count',()=>{const g=fixture('story',1),cp=g.current.checkpoints[0];g.p.hp=80;g.p.mp=43;g.p.flasks=1;g.p.inv=0;g.p.x=920;g.p.y=615;g.step(1/120,{});assert.equal(g.p.hp,66);assert.equal(g.p.flasks,1);assert.equal(g.p.x,cp.x);assert.equal(g.p.y,cp.y-54);});
 test('standing at same beacon does not silently rest',()=>{const g=fixture();g.p.hp=40;g.p.mp=10;g.p.flasks=0;g.step(1/120,{});assert.equal(g.p.hp,40);assert.equal(g.p.flasks,0);assert.equal(g.near.type,'beacon');});
 test('E explicitly rests at same beacon',()=>{const g=fixture();g.p.hp=40;g.p.mp=10;g.p.flasks=0;g.step(1/120,{interactPressed:true});assert.equal(g.p.hp,g.maxHP);assert.equal(g.p.mp,g.maxMP);assert.equal(g.p.flasks,3);assert(g.events.some(e=>e.type==='checkpoint'));});
 test('rest interaction is disabled during active boss',()=>{const g=fixture();g.bossActive=true;g.p.hp=40;g.p.mp=10;g.p.flasks=0;g.step(1/120,{interactPressed:true});assert.equal(g.p.hp,40);assert.equal(g.p.flasks,0);assert.notEqual(g.near?.type,'beacon');});
 test('normal heal input consumes one flask and restores 55 percent',()=>{const g=fixture();g.p.hp=20;g.step(1/120,{healPressed:true});assert.equal(g.p.hp,75);assert.equal(g.p.flasks,2);});
 test('heal at full health consumes nothing',()=>{const g=fixture();g.step(1/120,{healPressed:true});assert.equal(g.p.flasks,3);});
 test('heal with no flask restores nothing',()=>{const g=fixture();g.p.hp=20;g.p.flasks=0;g.step(1/120,{healPressed:true});assert.equal(g.p.hp,20);});
 test('parry input starts window and cooldown',()=>{const g=fixture();g.step(1/120,{parryPressed:true,axis:-1});assert.equal(g.p.face,-1);assert.equal(g.p.parry,.19);assert.equal(g.p.parryCD,.62);assert(g.events.some(e=>e.type==='guard'));});
 test('held parry cannot retrigger before cooldown',()=>{const g=fixture();g.step(1/120,{parryPressed:true});for(let i=0;i<30;i++)g.step(1/120,{parryPressed:true});assert.equal(g.events.filter(e=>e.type==='guard').length,1);assert.equal(g.p.parry,0);assert(g.p.parryCD>0);});
 test('parry window expires and rear attacks still hurt',()=>{const g=fixture();g.p.inv=0;g.p.face=1;g.p.parry=.1;g.hurt(20,g.p.x-60);assert.equal(g.p.hp,90);assert(!g.events.some(e=>e.type==='parry'));});
 test('front parry consumes window and rewards mana',()=>{const g=fixture();g.p.inv=0;g.p.mp=20;g.p.face=1;g.p.parry=.1;g.hurt(20,g.p.x+60);assert.equal(g.p.hp,100);assert.equal(g.p.mp,34);assert.equal(g.p.parry,0);assert(g.p.inv>=.26);assert(g.events.some(e=>e.type==='parry'));});
 test('parry cannot activate while already dashing',()=>{const g=fixture();g.p.dash=.1;g.step(1/120,{parryPressed:true});assert.equal(g.p.parry,0);assert.equal(g.p.parryCD,0);});
 test('parry cooldown permits next timed activation',()=>{const g=fixture();g.step(1/120,{parryPressed:true});for(let i=0;i<80;i++)g.step(1/120,{});g.step(1/120,{parryPressed:true});assert.equal(g.events.filter(e=>e.type==='guard').length,2);});
 for(const face of [-1,1])test('front projectile reflects with hero ownership face '+face,()=>{const g=fixture();g.p.face=face;g.p.mp=20;const s={owner:'enemy',x:g.p.x+14+face*40,y:g.p.y+27,vx:-face*240,vy:0,r:7,life:4,dmg:13};g.shots.push(s);g.step(1/120,{parryPressed:true});assert.equal(s.owner,'hero');assert.equal(s.reflected,true);assert.equal(s.vx,face*740);assert.equal(s.vy,0);assert.equal(s.dmg,28);assert.equal(g.p.hp,100);assert.equal(g.p.parry,0);assert.equal(g.events.filter(e=>e.type==='parry').length,1);});
 test('rear projectile is not reflected',()=>{const g=fixture();const s={owner:'enemy',x:g.p.x-35,y:g.p.y+27,vx:240,vy:0,r:7,life:4,dmg:13};g.shots.push(s);g.step(1/120,{parryPressed:true});assert.equal(s.owner,'enemy');assert.equal(s.reflected,undefined);});
 test('expired projectile cannot reflect',()=>{const g=fixture();const s={owner:'enemy',x:g.p.x+45,y:g.p.y+27,vx:-240,vy:0,r:7,life:0,dmg:13};g.shots.push(s);g.step(1/120,{parryPressed:true});assert.equal(s.owner,'enemy');});
 test('single guard reflects at most one projectile',()=>{const g=fixture();const shots=[0,1].map(i=>({owner:'enemy',x:g.p.x+47+i,y:g.p.y+27,vx:-240,vy:0,r:7,life:4,dmg:13}));g.shots.push(...shots);g.step(1/120,{parryPressed:true});assert.equal(shots.filter(s=>s.reflected).length,1);});
 test('reflection damage scales with focus',()=>{const g=fixture();g.progress.upgrades.focus=2;const s={owner:'enemy',x:g.p.x+47,y:g.p.y+27,vx:-240,vy:0,r:7,life:4,dmg:13};g.shots.push(s);g.step(1/120,{parryPressed:true});assert.equal(s.dmg,42);});
 test('reflected projectile actually damages ordinary enemy through simulation',()=>{const g=fixture();const e=g.enemies[0];g.p.x=520;g.p.y=536;g.p.face=1;const s={owner:'enemy',x:g.p.x+47,y:570,vx:-240,vy:0,r:7,life:4,dmg:13};g.shots.push(s);g.step(1/120,{parryPressed:true});for(let i=0;i<35;i++)g.step(1/120,{});assert.equal(s.reflected,true);assert(e.hp<40);});
 test('parry stun freezes enemy movement and attack timer',()=>{const g=fixture();const e=g.enemies[0];e.stun=.3;e.state='windup';e.t=.05;const x=e.x;g.updateEnemy(e,.1);assert.equal(e.x,x);assert.equal(e.t,.05);assert(Math.abs(e.stun-.2)<1e-12);});
 for(let i=0;i<3;i++){
  test('sigil gate progression realm '+i,()=>{const g=fixture('story',i);const gate=()=>g.getSolids().some(s=>s.id==='sigil-gate');assert(gate());g.flag('runes',g.current.sigils[0].id);assert(gate());g.flag('sigils',g.current.sigils[0].id);assert(gate());g.flag('runes',g.current.sigils[1].id);assert(gate());g.flag('sigils',g.current.sigils[1].id);assert(!gate());});
  test('physical gate prevents arena entry realm '+i,()=>{const g=fixture('story',i);g.p.x=g.boss.arena[0]-70;g.p.y=536;for(let k=0;k<90;k++)g.step(1/120,{axis:1});assert(g.p.x+g.p.w<=g.boss.arena[0]+1e-9);assert.equal(g.bossActive,false);});
  test('collecting both opens boss and arena locks realm '+i,()=>{const g=fixture('story',i);for(const sig of g.current.sigils){g.flag('runes',sig.id);g.flag('sigils',sig.id);}g.p.x=g.boss.arena[0]+30;g.p.y=536;g.step(1/120,{});assert(g.bossActive);for(const id of ['arena-back','arena-front'])assert(g.getSolids().some(s=>s.id===id));});
  test('inactive boss cannot take sword/spell damage realm '+i,()=>{const g=fixture('story',i);g.p.x=g.boss.x-65;g.p.y=536;const hp=g.boss.hp;for(let k=0;k<100;k++)g.step(1/120,{attackPressed:true,spellPressed:true});assert.equal(g.boss.hp,hp);assert.equal(g.bossActive,false);});
  for(const side of ['left','right'])test('boss arena clamp '+side+' realm '+i,()=>{const g=fixture('story',i);g.bossActive=true;g.boss.state='idle';g.boss.t=2;g.boss.x=side==='left'?-100:g.current.width+100;g.updateBoss(1/120);assert(g.boss.x>=g.boss.arena[0]+8);assert(g.boss.x<=g.boss.arena[1]-g.boss.w-8);});
  test('living boss prevents exit realm '+i,()=>{const g=fixture('story',i);g.p.x=g.current.exit.x-14;g.p.y=536;g.step(1/120,{interactPressed:true});assert.equal(g.progress.level,i);assert.equal(g.status,'playing');assert(!g.events.some(e=>e.type==='choice'));});
 }
 test('invalid level indices cannot mutate game',()=>{const g=fixture(),before=state(g);for(const i of [-1,3,.5,NaN])assert.equal(g.loadLevel(i),false);assert.deepEqual(state(g),before);});
 test('normal replay evidence comes exclusively from allowed inputs',()=>{const allowed=new Set(['axis','jumpHeld','jumpPressed','drop','attackPressed','spellPressed','healPressed','parryPressed','dashPressed','interactPressed']);for(const r of runs){assert(r.pass);for(const a of r.inputs){assert(Number.isInteger(a.frames)&&a.frames>0);for(const k of Object.keys(a.input||{}))assert(allowed.has(k));if(a.choice)assert.equal(a.choice,'mercy');}assert.equal(r.inputs.reduce((n,a)=>n+a.frames,0),r.frames);}});
 return tests;
}
function replay(record){
 const before=JSON.stringify(LEVELS),g=new EW.Game(LEVELS).newRun(record.difficulty,record.mode);let choice=false;const seen=new WeakSet();let frames=0;
 const drain=()=>{for(const e of g.events){if(seen.has(e))continue;seen.add(e);if(e.type==='realm')choice=false;if(e.type==='choice')choice=true;}};drain();
 for(const a of record.inputs)for(let i=0;i<a.frames;i++){
  if(a.choice){assert(choice,'replay ending must follow actual exit prompt');assert(g.finish(a.choice));}
  else g.step(record.dt,a.input);
  frames++;drain();
 }
 assert.equal(frames,record.frames);assert.equal(g.status,'won');assert.deepEqual(g.snapshot(),record.final);assert.equal(JSON.stringify(LEVELS),before);return {pass:true,mode:record.mode,dt:record.dt,frames};
}
function main(){
 const runs=[play('story',1/120),play('rush',1/120),play('story',1/60),play('rush',1/60)];
 const tests=runRegressions(runs),replays=[];
 for(const r of runs){try{replays.push(replay(r));}catch(e){replays.push({pass:false,mode:r.mode,dt:r.dt,error:e.message});}}
 let deterministic;try{const repeat=play('story',1/120);assert(repeat.pass);assert.deepEqual(repeat.inputs,runs[0].inputs);assert.deepEqual(repeat.final,runs[0].final);assert.deepEqual(repeat.counts,runs[0].counts);deterministic={pass:true,frames:repeat.frames};}catch(e){deterministic={pass:false,error:e.message};}
 const summarize=r=>({pass:r.pass,mode:r.mode,difficulty:r.difficulty,dt:r.dt,frames:r.frames,seconds:r.final.stats.time,kills:r.final.stats.kills,deaths:r.final.stats.deaths,ending:r.final.ending,runes:r.final.flags.runes.length,sigils:r.final.flags.sigils.length,counts:r.counts,error:r.error,last:r.pass?undefined:r.last});
 const result={version:EW.version,hashes,scope:'Exact exported engine simulation only; story difficulty. No browser/render/input-mapping coverage.',completionRuns:runs.map(summarize),replays,deterministic,regressions:{total:tests.length,passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,tests}};
 fs.mkdirSync(reportDir,{recursive:true});fs.writeFileSync(path.join(reportDir,'emberwake-qa-results.json'),JSON.stringify(result,null,2));
 fs.writeFileSync(path.join(reportDir,'emberwake-input-proof.json'),JSON.stringify({version:EW.version,hashes,runs},null,2));
 console.log(JSON.stringify({runs:result.completionRuns,replays,deterministic,regressions:{total:result.regressions.total,passed:result.regressions.passed,failed:result.regressions.failed,failures:tests.filter(t=>!t.pass).map(t=>({name:t.name,error:t.error.slice(0,260)}))}},null,2));
 process.exitCode=runs.every(r=>r.pass)&&replays.every(r=>r.pass)&&deterministic.pass&&tests.every(t=>t.pass)?0:1;
}
if(require.main===module){const arg=process.argv.find(a=>a.startsWith('--replay='));if(arg){const proof=JSON.parse(fs.readFileSync(arg.slice(9),'utf8'));assert.deepEqual(proof.hashes,hashes);console.log(JSON.stringify(proof.runs.map(replay),null,2));}else main();}
module.exports={Controller,play,observe,replay,runRegressions,EW,LEVELS,hashes,clone};
