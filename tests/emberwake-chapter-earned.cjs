#!/usr/bin/env node
'use strict';
/* Earned simulation evidence, NOT positioned/fact-injection fixtures.
 * Controller receives JSON observations only. Runner alone owns Game/storage.
 * The existing campaign Controller/nav/defense are reused without edits.
 */
const Q=require('./emberwake-qa.js'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {EW,LEVELS,clone}=Q,D=EW.ChapterData,clamp=EW.clamp;
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function observe(g,choice,frame,events=[]){return clone({...Q.observe(g,choice,frame),scene:g.scene,geometry:g.current,chapter:g.chapter,progress:g.progress,events,legalTravel:LEVELS.map((_,i)=>g.canTravel(i))});}
function fingerprint(g){return digest({journey:g.snapshotJourney(),scene:g.scene,p:g.p,enemies:g.enemies,boss:g.boss,bossActive:g.bossActive,shots:g.shots,telegraphs:g.bossTelegraphs,clock:g.clock,attackID:g.attackID,status:g.status,cache:[...g.sceneCache.entries()].sort(([a],[b])=>a.localeCompare(b))});}
function goals(data){const out=[],door=id=>out.push({kind:'door',id:'ch1:door:'+id}),fact=(kind,id)=>out.push({kind:'fact',category:kind,id:'ch1:'+id}),clear=()=>out.push({kind:'clear'}),travel=index=>out.push({kind:'travel',index});
 door('millpond-enter');clear();out.push({kind:'fall'});fact('mechanisms','mechanism:valve-west');fact('mechanisms','mechanism:valve-east');fact('items','item:water-letter');door('millpond-return');fact('deliveries','delivery:water-remembers');
 door('millpond-enter');door('millpond-rootcellar-enter');clear();fact('items','item:open-letter');fact('items','item:charter');door('rootcellar-return');
 travel(1);door('cooling-gallery-enter');clear();fact('mechanisms','mechanism:vent-west');fact('mechanisms','mechanism:vent-east');fact('items','item:summer-coal');out.push({kind:'restore'});door('cooling-gallery-return');fact('deliveries','delivery:summer-coal');
 travel(2);fact('items','item:orin-testimony');fact('deliveries','delivery:charter');door('star-archive-enter');out.push({kind:'deathTrial'});clear();for(const id of ['water','summer','charter'])fact('mechanisms','mechanism:seal-'+id);out.push({kind:'boss'});out.push({kind:'ability',id:'ch1:interaction:dawnstep-return'});out.push({kind:'complete'});return out;
}
class ChapterController{
 constructor(ending='mercy',data=D){this.ending=ending;this.data=clone(data);this.campaign=new Q.Controller(LEVELS,'story');this.plan=null;this.ix=0;this.age=0;this.recoveries=0;this.trial=null;}
 nav(s,x,foot,input){return Q.Controller.prototype.nav.call({levels:[s.geometry],mode:'story'},{...s,level:0},x,foot,input);}
 defense(s,input,target){Q.Controller.prototype.defense.call(this,s,input,target);}
 fight(s,target,input){const l=s.geometry;let floor;if(target.type==='wisp')floor=l.solids.filter(q=>q.oneWay&&Math.abs(q.y-(target.baseY+65))<100).sort((a,b)=>Math.abs(clamp(target.x,a.x,a.x+a.w)-target.x)-Math.abs(clamp(target.x,b.x,b.x+b.w)-target.x))[0];else floor=l.solids.find(q=>!q.oneWay&&q.y===590&&target.homeX>=q.x&&target.homeX<q.x+q.w);if(!floor)throw Error('No fighting surface '+target.id);const x=clamp(target.x+target.w/2-104,floor.x+4,floor.x+floor.w-28);this.nav(s,x,floor.y,input);if(Math.abs(target.x-s.p.x)<260){input.attackPressed=true;input.spellPressed=true;}if(Math.abs(x-s.p.x)<8)input.axis=Math.sign(target.x+target.w/2-s.p.x-14)||s.p.face;this.defense(s,input,target);}
 tick(s){
  if(!s.progress.completed){const a=this.campaign.tick(s);if(a.choice)a.choice=this.ending;return a;}
  if(!this.plan)this.plan=goals(this.data);
  if(s.status==='won')return {ui:'continue'};
  if(s.status==='dead'){if(this.plan[this.ix]?.kind==='deathTrial'){this.ix++;this.age=0;this.trial=null;}if(++this.recoveries>5)throw Error('Recovery budget exceeded');return {ui:'respawn'};}
  const w=this.plan[this.ix];if(!w)return {done:true};if(++this.age>12000)throw Error('Chapter goal timeout '+JSON.stringify({goal:w,scene:s.scene,p:s.p,enemies:s.enemies,boss:s.boss,near:s.near}));
  const input={axis:0,jumpHeld:true};let done=false;
  if(w.kind==='clear'){const target=s.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.abs(a.x-s.p.x)-Math.abs(b.x-s.p.x))[0];if(target)this.fight(s,target,input);else done=true;}
  else if(w.kind==='travel'){if(s.scene.id==='ch1:main:'+LEVELS[w.index].id)done=true;else if(s.legalTravel[w.index])return {ui:'travel',index:w.index};}
  else if(w.kind==='restore'){this.ix++;this.age=0;return {ui:'restore'};}
  else if(w.kind==='fall'){
   if(!this.trial){if(this.nav(s,790,590,input))this.trial={hp:s.p.hp,flasks:s.p.flasks,mp:s.p.mp};}
   else if(s.events.some(e=>e.type==='respawn')){assert(s.p.hp<this.trial.hp,'nonlethal fall must lose vitality');assert.equal(s.p.flasks,this.trial.flasks);this.trial=null;done=true;}
   else input.axis=clamp((865-s.p.x)/24,-1,1);
  }else if(w.kind==='deathTrial'){if(!this.trial){if(this.nav(s,610,590,input))this.trial=true;}else input.axis=clamp((610-s.p.x)/24,-1,1);/* Reapproach after knockback; endure authored attacks, never inject damage. */}
  else if(w.kind==='boss'){
   if(s.chapter.defeated.includes('ch1:enemy:archivist-engine'))done=true;
   else if(!s.bossActive){const m=this.data.interactions['ch1:interaction:archive-opt-in'];if(this.nav(s,m.x-14,m.y,input))input.interactPressed=true;}
   else{const target=s.boss,x=clamp(target.x-66,target.arena[0]+12,target.arena[1]-40);this.nav(s,x,590,input);input.attackPressed=true;if(Math.abs(target.x-s.p.x)<420)input.spellPressed=true;if(Math.abs(x-s.p.x)<8)input.axis=Math.sign(target.x+48-s.p.x-14)||s.p.face;this.defense(s,input,target);
    const danger=s.telegraphs.find(m=>m.kind==='light'&&m.phase!=='spent'&&Math.abs(m.x-s.p.x-14)<m.radius+28);if(danger){input.axis=s.p.x+14<danger.x?-1:1;input.dashPressed=s.p.dashCD===0&&danger.remaining<.18;}
   }
  }else if(w.kind==='ability'){done=s.events.some(e=>e.type==='chapterAbility'&&e.id===w.id);if(!done){const m=this.data.interactions[w.id];assert(m,'return lamp must be authored');assert.equal(s.scene.id,m.sceneId);if(this.nav(s,m.x-14,m.y,input))input.interactPressed=true;}}else if(w.kind==='door'){const d=this.data.doors[w.id];if(s.scene.id===d.destScene)done=true;else{assert.equal(s.scene.id,d.sourceScene);if(this.nav(s,d.source.x+d.source.w/2-14,d.source.y+d.source.h,input))input.interactPressed=true;}}
  else{const id=w.kind==='complete'?'ch1:interaction:archive-finish':w.id,m=this.data.interactions[id];done=w.kind==='complete'?s.chapter.complete:s.chapter[w.category].includes(id);if(!done){assert.equal(s.scene.id,m.sceneId);if(this.nav(s,m.x-14,m.y,input))input.interactPressed=true;}}
  if(done){this.ix++;this.age=0;return this.tick(s);}return {input};
 }
}
function makeRunner(difficulty,dt){let g=new EW.Game(LEVELS).newRun(difficulty,'story');const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};let revision=0,choice=false,frame=0,lastEvents=[],earned=null,economy=null,resumeAnchor=null;const milestones=[],transitions=[],checks=[];let seen=new WeakSet();
 const attach=()=>{g.commitJourney=payload=>{const result=EW.ChapterSave.write(storage,payload,LEVELS,revision);if(result.ok)revision=result.envelope.revision;return result;};};attach();
 const save=()=>{const r=g.commitJourney(g.snapshotJourney());assert(r.ok,r.error);};
 const drain=()=>{lastEvents=[];for(const e of g.events){if(seen.has(e))continue;seen.add(e);lastEvents.push(clone(e));if(e.type==='choice')choice=true;if(e.type==='realm')choice=false;if(['ending','chapterScene','death','respawn','defeat','bossIntro','bossVictory'].includes(e.type))milestones.push({frame,...clone(e)});if(e.type==='save')save();}};drain();
 const canonical=()=>({level:g.progress.level,ending:g.progress.ending,completed:g.progress.completed,checkpoint:g.progress.checkpoint,stats:clone(g.progress.stats)});
 const perform=a=>{const before=canonical(),vitals=clone(g.p),scene=g.scene.id;assert(Object.keys(a).every(k=>['input','choice','ui','index'].includes(k)),'action whitelist');if(a.input){const allowed=new Set(['axis','jumpHeld','jumpPressed','drop','attackPressed','spellPressed','healPressed','parryPressed','dashPressed','interactPressed']);assert(Object.keys(a.input).every(k=>allowed.has(k)),'input whitelist');}if(a.ui)assert(['continue','travel','respawn','restore'].includes(a.ui),'UI action whitelist');
  if(a.choice){assert(choice,'finish must follow earned choice');assert(g.finish(a.choice));choice=false;earned=canonical();economy={gold:g.progress.gold,xp:g.progress.xp,rank:g.progress.rank,upgrades:clone(g.progress.upgrades)};for(const l of LEVELS){for(const e of [...l.enemies,l.boss])assert(g.has('defeated',e.id),'original defeat '+e.id);for(const rune of l.sigils)assert(g.has('runes',rune.id)&&g.has('sigils',rune.id),'original rune '+rune.id);}}
  else if(a.ui==='continue'){assert(g.continueDeliveries());if(resumeAnchor){const anchor=D.anchors[resumeAnchor.anchorId];assert.equal(g.scene.id,resumeAnchor.sceneId);assert.deepEqual([g.p.x,g.p.y],[anchor.x,anchor.y-54]);assert.equal(g.bossActive,false);checks.push({kind:'explicit-earned-anchor-resume',frame,anchor:resumeAnchor});resumeAnchor=null;}}
  else if(a.ui==='travel')assert(g.travel(a.index));
  else if(a.ui==='respawn'){assert.equal(g.status,'dead');const deaths=g.chapter.stats.deaths;g.respawn();assert.equal(g.chapter.stats.deaths,deaths);assert.deepEqual([g.p.hp,g.p.mp,g.p.flasks],[g.maxHP,g.maxMP,3]);checks.push({kind:'authored-lethal-recovery',frame,deaths});}
  else if(a.ui==='restore'){save();const payload=clone(EW.ChapterSave.read(storage,LEVELS).envelope.current),anchor=payload.chapter.anchor;assert(anchor);resumeAnchor=anchor;const next=new EW.Game(LEVELS);assert(next.resumeJourney(payload));g=next;attach();seen=new WeakSet();assert.equal(g.status,'won');assert.equal(g.chapter.anchor.anchorId,anchor.anchorId);checks.push({kind:'earned-save-restore',frame,anchor});}
  else{assert(a.input);g.step(dt,a.input);}
  frame++;drain();for(const e of lastEvents.filter(e=>e.type==='chapterAbility'&&e.id==='ch1:interaction:dawnstep-return')){
   assert(g.chapter.defeated.includes('ch1:enemy:archivist-engine'));assert.equal(g.bossActive,false);assert.equal(g.scene.id,scene);assert(e.fromX-e.toX>1500,'earned lamp must meaningfully shorten return');
   assert.equal(g.p.hp,vitals.hp);assert.equal(g.p.flasks,vitals.flasks);assert(g.p.mp<=Math.min(g.maxMP,vitals.mp+(12+g.progress.upgrades.focus*3)*dt)+1e-8);assert.equal(g.p.x,D.anchors[D.interactions[e.id].toAnchor].x);assert.equal(g.chapter.complete,false,'return before release does not complete chapter');checks.push({kind:'earned-post-engine-dawnstep-return',frame,fromX:e.fromX,toX:e.toX});
  }if(earned)assert.deepEqual(canonical(),earned,'optional play must preserve canonical completed campaign');
  if(a.ui==='travel'||a.ui==='continue'){for(const k of ['hp','mp','flasks','attackCD','spellCD','dashCD'])assert.equal(g.p[k],vitals[k],k+' changed at UI transition');transitions.push({frame,action:a.ui,from:scene,to:g.scene.id});}
  if(before.completed&&g.scene.id!==scene&&!a.ui){assert(g.p.hp<=vitals.hp,'door cannot heal');assert(g.p.mp<=Math.min(g.maxMP,vitals.mp+(12+g.progress.upgrades.focus*3)*dt)+1e-8,'door cannot refill MP');assert.equal(g.p.flasks,vitals.flasks);}
 };
 return {get game(){return g;},get frame(){return frame;},get earned(){return earned;},get economy(){return economy;},milestones,transitions,checks,observation:()=>observe(g,choice,frame,lastEvents),perform};
}
function assertComplete(r,ending){const g=r.game,c=g.chapter;assert.equal(g.progress.ending,ending);assert(g.progress.completed&&c.complete);for(const room of Object.keys(D.rooms))assert(c.discovered.includes(room),room);for(const id of Object.keys(D.deliveries))assert(c.deliveries.includes(id),id);for(const id of Object.keys(D.items))assert(c.items.includes(id),id);for(const id of ['water','summer','charter'])assert(c.mechanisms.includes('ch1:mechanism:seal-'+id));assert(c.defeated.includes('ch1:enemy:archivist-engine'));assert.equal(c.stats.deaths,1);assert(r.checks.some(c=>c.kind==='earned-post-engine-dawnstep-return'));assert(r.checks.some(c=>c.kind==='earned-save-restore'));assert(r.checks.some(c=>c.kind==='explicit-earned-anchor-resume'));assert(r.checks.some(c=>c.kind==='authored-lethal-recovery'));assert(r.milestones.filter(e=>e.type==='respawn').length>=2,'nonlethal and lethal authored recovery');assert.equal(g.progress.gold,r.economy.gold+140,'exact two paid deliveries, Charter and room kills add zero');assert.equal(g.progress.xp,r.economy.xp);assert.equal(g.progress.rank,r.economy.rank);assert.deepEqual(g.progress.upgrades,r.economy.upgrades);assert(EW.ChapterSave.normalizePayload(g.snapshotJourney(),LEVELS));}
function run(ending='mercy',dt=1/120,difficulty='story'){
 const r=makeRunner(difficulty,dt),controller=new ChapterController(ending),actions=[],hashes=[];const worldBefore=digest(LEVELS);let error=null;
 try{for(let n=0;n<120000;n++){const a=controller.tick(r.observation());if(a.done)break;r.perform(a);const key=JSON.stringify(a);if(actions.at(-1)?.key===key)actions.at(-1).frames++;else actions.push({key,frames:1});if(r.frame%240===0)hashes.push({frame:r.frame,hash:fingerprint(r.game)});}assertComplete(r,ending);assert.equal(digest(LEVELS),worldBefore);}catch(e){error=e.stack;}
 return {pass:!error,error,ending,dt,difficulty,frames:r.frame,actions:actions.map(a=>({frames:a.frames,...JSON.parse(a.key)})),hashes,final:r.game.snapshotJourney(),earned:r.earned,milestones:r.milestones,transitions:r.transitions,checks:r.checks,last:{scene:r.game.scene,p:r.game.p,goal:controller.plan?.[controller.ix]}};
}
function replay(record){const r=makeRunner(record.difficulty,record.dt),hashes=[];for(const a of record.actions)for(let i=0;i<a.frames;i++){const {frames,...action}=a;r.perform(action);if(r.frame%240===0)hashes.push({frame:r.frame,hash:fingerprint(r.game)});}assertComplete(r,record.ending);assert.deepEqual(hashes,record.hashes);assert.deepEqual(r.game.snapshotJourney(),record.final);return {pass:true,frames:r.frame,stateChecks:hashes.length};}
function main(){const output=process.env.EW_CHAPTER_EARNED_OUTPUT||'qa/correction/chapter-earned',cases=process.env.EW_CHAPTER_EARNED_QUICK?[['mercy',1/120]]:['mercy','rekindle'].flatMap(e=>[[e,1/120],[e,1/60]]),runs=[];for(const [ending,dt]of cases){const result=run(ending,dt);if(result.pass){try{result.replay=replay(result);}catch(e){result.pass=false;result.error='Replay: '+e.stack;}}runs.push(result);console.log(JSON.stringify({ending,dt,pass:result.pass,frames:result.frames,error:result.error,last:result.pass?undefined:result.last,replay:result.replay}));if(!result.pass)break;}
 fs.mkdirSync(output,{recursive:true});const sourceHashes=Object.fromEntries(['engine.js','core-v11.js','encounters-v12.js','worlds.js','chapter-runtime.js','chapter-data.js','chapter-save.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/scripts',f))).digest('hex')]));fs.writeFileSync(path.join(output,'input-proof.json'),JSON.stringify({scope:'Ordinary-input earned simulation, not browser/human pacing proof. Both original endings earned independently. Explicit UI continuation/travel/respawn and validated earned save restore. No fact/pose/resource/enemy injection.',sourceHashes,runs},null,2));if(runs.some(r=>!r.pass))process.exitCode=1;
}
if(require.main===module)main();module.exports={ChapterController,observe,run,replay,makeRunner};
