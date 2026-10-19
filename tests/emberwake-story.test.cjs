'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const data=require('../assets/scripts/chapter-data.js'),levels=require('../assets/scripts/worlds.js');
const base=ending=>({mode:'story',completed:!!ending,ending,flags:{seen:['moonroot','cinderworks','hollowspire'],defeated:[],runes:[],chests:[]},stats:{time:42,deaths:3}});
const facts=()=>({items:[],deliveries:[],mechanisms:[],defeated:[],discovered:[]});
const pick=(b,c,type,id,extra={})=>data.selectStory(b,c,{type,id,...extra});
const text=r=>r.lines.join(' ');
test('selector is pure, deterministic, DOM/storage-free and excludes global achievements',()=>{
 const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../assets/scripts/chapter-data.js'),'utf8'),context);
 const b=base('mercy'),c=facts(),before=JSON.stringify({b,c});Object.freeze(b);Object.freeze(c);
 const a=pick(b,c,'state');assert.deepEqual(a,pick(b,c,'state'));assert.equal(JSON.stringify({b,c}),before);
 assert.deepEqual(a.state,{ending:'mercy',waterDelivered:false,summerDelivered:false,charterPublished:false,signedTestimony:false,openLetterRead:false,charterWitnessed:false});
 assert.equal(context.EW.ChapterData.selectStory(b,c,{type:'state'}).state.waterDelivered,false);
 assert.equal(pick({...base('mercy'),mode:'rush'},{deliveries:['ch1:delivery:water-remembers']},'state').state.waterDelivered,false);
 assert.equal(pick({...base(),ending:'mercy'},c,'state').state.ending,null);
});
test('both endings × absent/present repairs have truthful independent NPC responses',()=>{
 for(const ending of ['mercy','rekindle'])for(const delivered of [false,true]){
  const b=base(ending),c=facts();if(delivered)c.deliveries=['ch1:delivery:water-remembers','ch1:delivery:summer-coal','ch1:delivery:charter'];
  const mara=text(pick(b,c,'npc',null,{realmId:'moonroot'})),tovan=text(pick(b,c,'npc',null,{realmId:'cinderworks'})),orin=text(pick(b,c,'npc',null,{realmId:'hollowspire'}));
  assert.match(mara,delivered?/measurements are here/:/Bring me Water Remembers/);assert.match(tovan,delivered?/safely banked/:/Bring Summer Coal/);
  assert.match(orin,ending==='mercy'?/king has a tomorrow/:/palace is fading/);assert.match(orin,delivered?/Charter is published/:/carrying a copy is not publication/);
  assert.doesNotMatch(orin,/Veyr died|king died/);
 }
});
test('signature, carried Charter, publication and reading a seal remain different facts',()=>{
 const b=base('rekindle'),c=facts();c.items=['ch1:item:charter','ch1:item:orin-testimony'];c.mechanisms=['ch1:mechanism:seal-charter'];
 let result=pick(b,c,'interaction','ch1:mechanism:seal-charter');assert.match(text(result),/has not been published/);assert.match(text(result),/testimony has been read/);assert.equal(result.state.charterWitnessed,false);
 c.deliveries.push('ch1:delivery:charter');result=pick(b,c,'interaction','ch1:mechanism:seal-charter');assert.match(text(result),/Charter is published/);assert.equal(result.state.charterWitnessed,true);
 c.items=[];assert.equal(pick(b,c,'state').state.charterWitnessed,false);
 for(const seal of ['water','summer'])assert.match(text(pick(b,c,'interaction','ch1:mechanism:seal-'+seal)),/proposed pledge/);
 assert.deepEqual(data.interactions['ch1:interaction:archive-opt-in'].requirements,{completed:true});
});
test('every registered interaction has authored first, repeat and locked responses',()=>{
 for(const id of Object.keys(data.interactions))for(const phase of ['first','repeat','locked']){
  const result=pick(base('mercy'),facts(),'interaction',id,{phase});assert.ok(result.lines.length,id+' '+phase);assert.doesNotMatch(text(result),/small promise, kept/);
 }
 for(const [id,expected] of [['rootbridge',/one shelf/],['vent-west',/Only this marked channel/],['vent-east',/does not cool/]])assert.match(text(pick(base('mercy'),facts(),'interaction','ch1:mechanism:'+id,{phase:'first'})),expected);
 assert.match(text(pick(base(),facts(),'interaction','ch1:mechanism:vent-west',{phase:'locked'})),/both Cinderworks runes/);
 assert.match(text(pick(base('mercy'),facts(),'interaction','ch1:mechanism:vent-east',{phase:'repeat'})),/not the lava/);
});
test('Aster advice follows room facts; switching journeys cannot retain progress',()=>{
 const b=base(),c=facts(),ask=()=>pick(b,c,'advice',null,{sceneId:'ch1:room:millpond'});const before=JSON.stringify({b,c});assert.match(text(ask()),/west valve near/);assert.equal(JSON.stringify({b,c}),before);
 c.mechanisms.push('ch1:mechanism:valve-west');assert.match(text(ask()),/inspect the east valve/);
 c.mechanisms.push('ch1:mechanism:valve-east');assert.match(text(ask()),/Collect Water Remembers/);
 c.items.push('ch1:item:water-letter');assert.match(text(ask()),/to Mara/);
 c.deliveries.push('ch1:delivery:water-remembers');assert.match(text(ask()),/Mara has the measurements/);
 assert.match(text(pick(b,facts(),'advice',null,{sceneId:'ch1:room:millpond'})),/west valve near/);
 assert.match(text(pick(base('mercy'),facts(),'advice',null,{sceneId:'ch1:room:star-archive'})),/Deliveries and signatures never lock/);
});
test('portable clone and repeated story reads preserve ending/statistics/reward state',()=>{
 const b=base('rekindle'),c=facts();c.deliveries=['ch1:delivery:water-remembers'];const original=JSON.stringify({b,c}),reloaded=JSON.parse(original);
 for(let i=0;i<3;i++)assert.deepEqual(pick(b,c,'interaction','ch1:delivery:water-remembers'),pick(reloaded.b,reloaded.c,'interaction','ch1:delivery:water-remembers'));
 assert.equal(JSON.stringify({b,c}),original);
 assert.equal(pick(b,facts(),'state').state.waterDelivered,false,'failed/uncommitted payload never enters the selector');
});
test('NPC journal keeps existing campaign prose and appends only current-journey responses',()=>{
 const context={EW:{ChapterData:data,Game:function(){}}};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../assets/scripts/journal-v12.js'),'utf8'),context);
 const g={progress:base('mercy'),chapter:facts(),sceneRealmIndex:2,current:levels[2],levels};
 assert.match(context.EW_JOURNAL.lines(g).join(' '),/king has a tomorrow/);
 g.progress=base('rekindle');assert.match(context.EW_JOURNAL.lines(g).join(' '),/palace is fading/);assert.doesNotMatch(context.EW_JOURNAL.lines(g).join(' '),/king has a tomorrow/);
});
test('optional advice client action reads current scene at invocation and cannot grant progress',()=>{
 const elements=new Map(),el=id=>{if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id)};
 const context={document:{getElementById:el},EW:{ChapterData:data}};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../assets/scripts/client.js'),'utf8'),context);
 const A=context.EWClient.App.prototype,g={progress:base(),chapter:facts(),scene:{id:'ch1:room:millpond'}},a=Object.create(A);
 Object.assign(a,{game:g,awards:['journey','mercy','caches'],unlockRush:true,modal(title,html,kind){this.rendered={title,html,kind}},announce(message){this.announced=message}});
 assert.match(A.chapterJournal.call(a),/data-act="aster-advice"/);
 const before=JSON.stringify(g);a.act('aster-advice');assert.equal(a.rendered.title,'Aster’s advice');assert.match(el('aster-advice-text').textContent,/west valve near/);assert.match(a.rendered.html,/advice-journal/);assert.equal(JSON.stringify(g),before);
 g.chapter.mechanisms=['ch1:mechanism:valve-west'];a.act('aster-advice');assert.match(el('aster-advice-text').textContent,/inspect the east valve/);
 g.chapter=facts();a.act('aster-advice');assert.match(el('aster-advice-text').textContent,/west valve near/);
 let returned=false;a.codex=()=>returned=true;a.act('advice-journal');assert.equal(returned,true);
});
test('east valve first cannot claim west measurements or dry terraces restored',()=>{
 const r=pick(base(),facts(),'interaction','ch1:mechanism:valve-east',{phase:'first'});assert.match(text(r),/west valve still needs/);assert.doesNotMatch(text(r),/dry terraces begin/);
});
