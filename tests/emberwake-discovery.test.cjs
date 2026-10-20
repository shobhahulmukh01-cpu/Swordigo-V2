'use strict';
/* Synthetic pure/UI fixtures only. These checks do not establish earned play or human discovery. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const data=require('../assets/scripts/chapter-data.js'),levels=require('../assets/scripts/worlds.js');
const M='ch1:main:',R='ch1:room:',water='ch1:delivery:water-remembers',coal='ch1:delivery:summer-coal',charter='ch1:delivery:charter',engine='ch1:enemy:archivist-engine';
const base=(ending=null)=>({mode:'story',level:0,completed:!!ending,ending,flags:{seen:['moonroot'],defeated:[],runes:[],sigils:[],chests:[]},stats:{time:42,kills:1,deaths:2}});
const facts=()=>({active:false,complete:false,discovered:[],items:[],deliveries:[],mechanisms:[],defeated:[],stats:{time:3,kills:0,deaths:0}});
const next=(b,c,scene=M+'moonroot',extra={})=>data.deriveNextAction(b,c,{sceneId:scene,levels,...extra});
const clone=x=>JSON.parse(JSON.stringify(x));
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
test('guidance is pure, DOM/storage-free and ignores browser-wide awards',()=>{
 const b=freeze(base()),c=freeze(facts()),ctx=freeze({sceneId:M+'moonroot',levels,awards:['journey','mercy','caches'],unlockRush:true}),before=JSON.stringify({b,c,ctx});
 const one=data.deriveNextAction(b,c,ctx);for(let i=0;i<20;i++)assert.deepEqual(data.deriveNextAction(b,c,ctx),one);
 assert.equal(JSON.stringify({b,c,ctx}),before);assert.equal(one.track,'campaign');assert.equal(one.target,'m-si0');
 const sandbox={};vm.runInNewContext(fs.readFileSync(require.resolve('../assets/scripts/chapter-data.js'),'utf8'),sandbox);
 assert.equal(sandbox.EW.ChapterData.deriveNextAction(b,c,ctx).stage,one.stage);
});
test('each realm separates sealed, released, collected, guardian and world-gate stages',()=>{
 for(let i=0;i<levels.length;i++){
  const b=base(),c=facts(),l=levels[i];b.level=i;
  let a=next(b,c,M+l.id);assert.equal(a.action,'spell');assert.equal(a.target,l.sigils[0].id);assert.doesNotMatch(a.text,i===0?/gantry rune/:/canopy rune/);
  b.flags.runes=[l.sigils[0].id];a=next(b,c,M+l.id);assert.equal(a.action,'jump');assert.match(a.text,/unsealed/);assert.equal(a.target,l.sigils[0].id);
  b.flags.sigils=[l.sigils[0].id];assert.equal(next(b,c,M+l.id).target,l.sigils[1].id);
  b.flags.runes.push(l.sigils[1].id);assert.match(next(b,c,M+l.id).stage,/collect/);
  b.flags.sigils.push(l.sigils[1].id);assert.equal(next(b,c,M+l.id).target,l.boss.id);
  assert.match(next(b,c,M+l.id,{bossActive:true,bossState:'recover'}).text,/Strike now/);
  b.flags.defeated.push(l.boss.id);assert.equal(next(b,c,M+l.id).stage,'gate');assert.match(next(b,c,M+l.id).text,/world-gate/);
 }
});
test('early optional rooms remain legal and return to campaign default outside rooms',()=>{
 const b=base(),c=facts();for(const slug of ['millpond','cooling-gallery','rootcellar'])assert.deepEqual(data.doors['ch1:door:'+slug+'-enter'].requirements,{});
 assert.equal(data.doors['ch1:door:star-archive-enter'].requirements.completed,true);
 c.active=true;c.discovered.push(R+'millpond');assert.equal(next(b,c,R+'millpond').track,'optional');assert.equal(next(b,c).track,'campaign');
});
test('local room advice follows actual valves, carried item and delivery, without changing facts',()=>{
 const b=base(),c=facts(),room=R+'millpond';const inspect=()=>next(b,c,room);
 assert.equal(inspect().target,'ch1:mechanism:valve-west');c.mechanisms.push('ch1:mechanism:valve-west');assert.equal(inspect().target,'ch1:mechanism:valve-east');
 c.mechanisms.push('ch1:mechanism:valve-east');assert.equal(inspect().target,'ch1:item:water-letter');c.items.push('ch1:item:water-letter');assert.equal(inspect().target,'ch1:door:millpond-return');
 const before=JSON.stringify(c);assert.match(inspect().text,/Mara/);assert.equal(JSON.stringify(c),before);c.deliveries.push(water);assert.equal(inspect().target,'ch1:door:millpond-rootcellar-enter');
 assert.equal(next(b,c,R+'cooling-gallery').target,'ch1:item:summer-coal');assert.match(next(b,c,R+'cooling-gallery').text,/only the west marked channel/);
 assert.match(next(b,c,R+'star-archive',{bossActive:true,bossState:'windup'}).text,/Leave marked/);assert.equal(next(b,c,R+'star-archive',{bossActive:true,bossState:'windup'}).action,null);
});
test('followed deliveries use existing doors, distinguish carrying and never promise unapproved realm travel',()=>{
 const b=base(),c=facts();let a=next(b,c,M+'moonroot',{followDeliveryId:water});assert.equal(a.track,'optional');assert.equal(a.target,'ch1:door:millpond-enter');
 c.items.push('ch1:item:water-letter');a=next(b,c,M+'moonroot',{followDeliveryId:water});assert.equal(a.target,water);assert.match(a.text,/Mara/);
 c.deliveries.push(water);assert.equal(next(b,c,M+'moonroot',{followDeliveryId:water}).track,'campaign');
 c.items.push('ch1:item:charter');a=next(b,c,M+'moonroot',{followDeliveryId:charter});assert.match(a.text,/Continue the original adventure/);assert.match(a.text,/Orin/);assert.doesNotMatch(a.target,/^realm:/);
 b.completed=true;b.ending='mercy';a=next(b,c,M+'moonroot',{followDeliveryId:charter,travelableRealms:[2]});assert.equal(a.target,'realm:2');assert.match(a.reason,/safety checks/);
});
test('completed journey routes toward Archive or coda without forcing delivery completion',()=>{
 const b=base('mercy'),c=facts();c.deliveries=[water,coal,charter];assert.equal(next(b,c,M+'hollowspire').target,'ch1:door:star-archive-enter');
 assert.equal(next(b,c,R+'star-archive').target,'ch1:interaction:archive-opt-in');c.defeated.push(engine);assert.equal(next(b,c,R+'star-archive').target,'ch1:interaction:archive-finish');
 c.complete=true;assert.match(next(b,c,R+'star-archive').text,/open letter/);assert.equal(next(b,c,M+'moonroot').target,'ch1:door:rootcellar-enter');assert.equal(next(b,c,R+'rootcellar').target,'ch1:item:open-letter');
 const partial=facts();assert.equal(next(b,partial,R+'star-archive').target,'ch1:interaction:archive-opt-in');
});
test('unknown door leads differ from discovered destinations and do not mark discovery',()=>{
 const c=facts(),door=data.doors['ch1:door:millpond-enter'];assert.match(data.doorLabel(door,c),/lead/);assert.doesNotMatch(data.doorLabel(door,c),/Millpond/);assert.equal(c.discovered.length,0);
 c.discovered.push(R+'millpond');assert.equal(data.doorLabel(door,c),'Millpond Irrigation Terraces');assert.match(data.doorLabel(data.doors['ch1:door:millpond-return'],c),/Moonroot road/);
});
test('both-ending reread coda names only committed repairs and preserves original story facts',()=>{
 for(const ending of ['mercy','rekindle'])for(const done of [false,true]){
  const b=base(ending),c=facts();c.complete=true;c.defeated=[engine];c.items=['ch1:item:charter'];if(done)c.deliveries=[water,coal,charter];
  const before=JSON.stringify({b,c}),text=data.selectStory(b,c,{type:'interaction',id:'ch1:item:open-letter',phase:'repeat'}).lines.join(' ');
  assert.match(text,/page we write afterward/);assert.match(text,done?/Charter stands in the public record/:/Charter is not yet published/);assert.match(text,ending==='mercy'?/king has a tomorrow/:/palace is fading/);assert.doesNotMatch(text,/king died|Veyr died/);assert.equal(JSON.stringify({b,c}),before);
 }
 const c=facts();assert.doesNotMatch(data.selectStory(base('mercy'),c,{type:'interaction',id:'ch1:item:open-letter'}).lines.join(' '),/page we write afterward/);
});
test('stateless earned return lamp keeps saved rosters and original anchors',()=>{
 const lamp=data.interactions['ch1:interaction:dawnstep-return'];assert.equal(lamp.x,1950);assert.equal(lamp.toAnchor,'ch1:anchor:archive-entry');assert.deepEqual(lamp.requirements.defeated,[engine]);
 for(const list of Object.values(data.rosters))if(Array.isArray(list))assert.ok(!list.includes(lamp.id));
 assert.match(data.selectStory(base('mercy'),facts(),{type:'interaction',id:lamp.id,phase:'locked'}).lines.join(' '),/Engine’s defeat in this journey/);
 assert.match(data.selectStory(base('mercy'),facts(),{type:'interaction',id:lamp.id}).lines.join(' '),/hours remain unfinished/);assert.equal(data.validateData(levels).valid,true);
});
test('rush cannot inherit optional journey guidance even with all facts supplied',()=>{
 const b=base('mercy');b.mode='rush';const c=facts();c.deliveries=[water,coal,charter];assert.equal(next(b,c,R+'millpond',{followDeliveryId:water}).track,'echo');
});
// Lightweight DOM facade: validates dispatch/render contracts, not browser layout or actual input.
function harness(){
 const elements=new Map();function el(id){if(elements.has(id))return elements.get(id);const e={id,hidden:false,textContent:'',innerHTML:'',style:{},dataset:{},children:[],classList:{toggle(){},add(){},contains(){return false;}},focus(){},append(x){this.children.push(x)},querySelector(){return el('focus')},querySelectorAll(){return []},setAttribute(){},addEventListener(){}};elements.set(id,e);return e;}
 const document={getElementById:el,createElement:()=>el('created'+elements.size),querySelector:()=>null,querySelectorAll:()=>[],body:el('body'),head:el('head'),activeElement:el('world')};
 const sandbox={document,console,Image:class{},navigator:{getGamepads:()=>[]}};vm.createContext(sandbox);
 for(const file of ['worlds.js','engine.js','core-v11.js','encounters-v12.js','chapter-data.js','chapter-save.js','chapter-runtime.js','journal-v12.js','client.js','controls-v11.js','journey-v11.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/scripts',file),'utf8'),sandbox,{filename:file});
 const A=sandbox.EWClient.App.prototype,a=Object.create(A),values=new Map();Object.assign(a,{game:new sandbox.EW.Game(sandbox.EW_LEVELS).newRun('adventure'),storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},storyRevision:0,savedStory:null,savedJourney:null,settings:{difficulty:'adventure',sound:false},time:0,held:new Map(),edges:new Set(),bindings:{left:'KeyA',right:'KeyD',spell:'KeyZ',jump:'Space',interact:'KeyE',attack:'KeyJ',dash:'ShiftLeft',heal:'KeyR',parry:'KeyQ',drop:'KeyS'},renderer:{w:1280,cam:0,fx:[],labels:[],event(){}},audio:{activate(){},sfx(){}},awards:[],announce(text){this.announcements=(this.announcements||[]).concat(text)},toast(text){this.lastToast=text},process(){},clearInput(){},modal(title,html,kind){this.modalKind=kind;this.rendered={title,html,kind}},close(){this.modalKind=null},updateHUD:A.updateHUD});a.loadStory();a.attachJourney(a.game);return {a,A,el,sandbox,values};
}
test('actual client dispatch shares HUD, journal and Aster guidance with mapped input labels',()=>{
 const {a,A,el}=harness();A.updateHUD.call(a);assert.match(el('objective-text').textContent,/seal.*Z/);a.act('aster-advice');assert.match(el('aster-advice-text').textContent,/seal.*Z/);assert.match(a.guidanceSummary(),/Original adventure/);
 const before=JSON.stringify(a.game.snapshotJourney());a.act('follow-delivery',{dataset:{delivery:water}});assert.equal(a.followDeliveryId,water);assert.match(a.rendered.html,/Following this delivery/);assert.equal(a.nextAction().track,'optional');assert.equal(JSON.stringify(a.game.snapshotJourney()),before);
 a.act('follow-campaign');assert.equal(a.nextAction().track,'campaign');assert.equal(a.followDeliveryId,null);
});
test('follow selection cannot leak across Game replacement or successful enter boundaries',()=>{
 const {a,A,sandbox}=harness();a._followOwner=a.game;a.followDeliveryId=water;assert.equal(a.nextAction().track,'optional');a.game=new sandbox.EW.Game(sandbox.EW_LEVELS).newRun();assert.equal(a.nextAction().track,'campaign');assert.equal(a.followDeliveryId,null);
 a._followOwner=a.game;a.followDeliveryId=water;A.enterGame.call(a);assert.equal(a.followDeliveryId,null);
});
test('objective announcements are stage-bound, not emitted every HUD tick or combat phase',()=>{
 const {a,A}=harness();A.updateHUD.call(a);const n=a.announcements.length;for(let i=0;i<20;i++)A.updateHUD.call(a);assert.equal(a.announcements.length,n);
 a.game.progress.flags.runes.push('m-si0');A.updateHUD.call(a);assert.equal(a.announcements.length,n+1);
 a.game.progress.flags.sigils=['m-si0','m-si1'];a.game.bossActive=true;a.game.boss.state='windup';A.updateHUD.call(a);const m=a.announcements.length;a.game.boss.state='recover';A.updateHUD.call(a);assert.equal(a.announcements.length,m);
});
test('journal does not duplicate pre-existing realm progress or expose unexplored room names',()=>{
 const {a}=harness();let html=a.chapterJournal();assert.match(html,/No optional rooms explored/);assert.doesNotMatch(html,/Millpond Irrigation Terraces|Cooling Gallery|Rootcellar Charter Desk/);assert.doesNotMatch(html,/Summer Coal/);assert.match(html,/Side rooms offer repairs along the way/);
 a.game.chapter.discovered.push(R+'millpond');assert.match(a.chapterJournal(),/Millpond Irrigation Terraces/);
});
test('map lists descriptive doors and lock reasons without creating any room teleport action',()=>{
 const {a,A}=harness();let html=a.mapPaths();assert.match(html,/Irrigation terraces lead/);assert.doesNotMatch(html,/data-travel|data-act/);a.game.scene={id:M+'hollowspire'};assert.match(a.mapPaths(),/Locked — finish either original ending/);
 a.game.chapterCombatDanger=()=>true;assert.match(a.mapPaths(),/Locked/);a.game.scene={id:M+'moonroot'};assert.match(a.mapPaths(),/Blocked while nearby danger/);A.map.call(a);assert.match(a.rendered.html,/Paths and nearby work/);assert.equal((a.rendered.html.match(/data-travel=/g)||[]).length,3);
});
test('completed-save title separates revisit from validated opt-in saved-anchor continuation',()=>{
 for(const ending of ['mercy','rekindle']){
  const {a,A,sandbox,el}=harness(),g=a.game,q=g.snapshot();q.level=2;q.completed=true;q.ending=ending;q.flags.seen=sandbox.EW_LEVELS.map(l=>l.id);q.flags.defeated=sandbox.EW_LEVELS.map(l=>l.boss.id);q.flags.runes=sandbox.EW_LEVELS.flatMap(l=>l.sigils.map(r=>r.id));q.flags.sigils=q.flags.runes.slice();
  const payload=sandbox.EW.ChapterSave.migrateV3(q,sandbox.EW_LEVELS);payload.chapter.active=true;payload.chapter.discovered=[M+'moonroot',R+'millpond'];payload.chapter.anchor={sceneId:R+'millpond',anchorId:'ch1:anchor:millpond-entry'};
  assert.ok(g.resumeJourney(payload));a.savedJourney=payload;a.savedStory=payload.base;A.refreshMenu.call(a);assert.equal(el('continue-chapter').hidden,false);assert.match(el('continue').textContent,/Revisit your ending/);
  const before=JSON.stringify(g.progress);a.continue();assert.equal(a.rendered.kind,'ending');assert.equal(g.status,'won');a.act('continue-chapter');assert.equal(g.status,'playing');assert.equal(g.scene.id,R+'millpond');assert.match(a.lastToast,/Now help their keepers rebuild/);assert.equal(JSON.stringify(g.progress),before);
 }
});
test('invalid continuation does not discard live journey or fabricate a chapter',()=>{
 const {a}=harness(),before=JSON.stringify(a.game.snapshotJourney());a.savedStory={completed:true};a.savedJourney={bad:true};assert.equal(a.continue(true),false);assert.equal(JSON.stringify(a.game.snapshotJourney()),before);assert.match(a.lastToast,/No valid journey/);
});
test('shrine uses effective preview API, cap, unaffordable and refill truth without purchases',()=>{
 const {a,A}=harness();a.game.progress.rank=4;a.game.progress.gold=200;const before=JSON.stringify(a.game.snapshotJourney());A.shop.call(a);assert.match(a.rendered.html,/Sword: 22 → 29/);assert.match(a.rendered.html,/110 embers remain/);assert.match(a.rendered.html,/not flasks/);assert.equal(JSON.stringify(a.game.snapshotJourney()),before);
 a.game.progress.gold=0;A.shop.call(a);assert.match(a.rendered.html,/Needs 90 more embers/);assert.doesNotMatch(a.rendered.html,/-90 embers remain/);
 a.game.progress.upgrades.blade=3;A.shop.call(a);assert.match(a.rendered.html,/Fully attuned/);assert.doesNotMatch(a.rendered.html,/undefined|NaN/);
});
test('guidance HTML escapes labels even if a future input helper provides markup',()=>{
 const {a}=harness();a.inputLabel=()=>'<img src=x onerror=oops>';assert.match(a.guidanceSummary(),/&lt;img/);assert.doesNotMatch(a.guidanceSummary(),/<img/);
});

test('return-lamp success feedback reaches the actual client event path without claiming completion or refill',()=>{
 const {a,A}=harness();a.awards=['journey','mercy','unbroken','caches'];a.game.progress.completed=true;a.game.progress.ending='mercy';a.game.chapter.defeated=[engine];
 const emit=()=>a.game.events=[{type:'chapterAbility',id:'ch1:interaction:dawnstep-return',fromX:1950,toX:130},{type:'note',text:'Dawnstep · the archive lamps remember your path.'}];
 let before=JSON.stringify(a.game.snapshotJourney());emit();A.process.call(a);assert.match(a.lastToast,/hours remain unfinished/);assert.match(a.lastToast,/No resources are restored/);assert.equal(JSON.stringify(a.game.snapshotJourney()),before);
 a.game.chapter.complete=true;before=JSON.stringify(a.game.snapshotJourney());emit();A.process.call(a);assert.match(a.lastToast,/already released/);assert.equal(JSON.stringify(a.game.snapshotJourney()),before);
});
test('nearby prompt uses the same actual interact label, leaving locked explanations unchanged',()=>{
 const {a,A,el}=harness();a.bindings.interact='KeyV';a.game.near={item:{x:275,y:590},label:'E · Speak to Mara'};A.updateHUD.call(a);assert.equal(el('prompt').textContent,'V · Speak to Mara');
 a.game.near.label='The guardian holds this gate';A.updateHUD.call(a);assert.equal(el('prompt').textContent,'The guardian holds this gate');
});

test('returning welcome has no stale action-key suffix while persistent objective follows active input mode',()=>{
 for(const touchBeforeResume of [false,true]){
  const {a,A,el}=harness();a.savedJourney=a.game.snapshotJourney();a.savedStory=a.savedJourney.base;
  const before=JSON.stringify(a.savedJourney);a._lastInputMode=touchBeforeResume?'touch':'keyboard';
  assert.equal(a.continue(),true);const welcome=a.lastToast;
  assert.equal(welcome,'Welcome back, courier. '+a.nextAction().text);
  assert.doesNotMatch(welcome,/ · (?:K|Z|Tap LUMEN)$/);
  if(!touchBeforeResume)assert.match(el('objective-text').textContent,/ · Z$/);
  a._lastInputMode='touch';A.updateHUD.call(a);assert.match(el('objective-text').textContent,/ · Tap LUMEN$/);assert.equal(a.lastToast,welcome);
  a._lastInputMode='keyboard';a.bindings.spell='KeyV';A.updateHUD.call(a);assert.match(el('objective-text').textContent,/ · V$/);assert.equal(a.lastToast,welcome);
  assert.equal(JSON.stringify(a.savedJourney),before);
 }
});
