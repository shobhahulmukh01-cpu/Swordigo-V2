/* EMBERWAKE — optional First Unwritten Day. Authored data, not a fourth level.
 * Coordinates: anchors/interactions use player-left x and feet y (28 × 54).
 * Requirements are conjunctive objects; {} means free. A room return is always free.
 * Consumers own combat authorization, atomic rewards, saves and transient state.
 */
(function(root){'use strict';
const mainScenes={
 'ch1:main:moonroot':0,'ch1:main:cinderworks':1,'ch1:main:hollowspire':2
};
const rooms={},doors={},anchors={},interactions={},mechanisms={},items={},deliveries={},defeated={};
const R={mill:'ch1:room:millpond',gallery:'ch1:room:cooling-gallery',cellar:'ch1:room:rootcellar',archive:'ch1:room:star-archive'};
const M={moon:'ch1:main:moonroot',cinder:'ch1:main:cinderworks',spire:'ch1:main:hollowspire'};
const realmStyles={
 moonroot:{realmIndex:0,heart:'Rootheart',palette:{bg:'#0b2426',far:'#174440',near:'#285c4c',ground:'#254b41',accent:'#8bf0cf',hazard:'#bd7492'}},
 cinderworks:{realmIndex:1,heart:'Forgeheart',palette:{bg:'#271918',far:'#553027',near:'#75452d',ground:'#554233',accent:'#ffc67c',hazard:'#ff6a36'}},
 hollowspire:{realmIndex:2,heart:'Dawnheart',palette:{bg:'#141d2a',far:'#303c50',near:'#526071',ground:'#3f4d60',accent:'#cbdfff',hazard:'#a87991'}}
};
const req=(category,id)=>({category,id});
const completed=[req('campaign','completed')];
function platform(id,x,y,w){return {id,x,y,w,h:18,oneWay:true};}
function room(sceneId,realmId,name,width,floors,shelves,hazards,enemies){
 const slug=sceneId.slice(9);
 return rooms[sceneId]={id:sceneId,sceneId,realmId,...realmStyles[realmId],name,width,height:760,
  subtitle:'The First Unwritten Day',optional:true,asset:'assets/images/emberwake_panorama.png',
  solids:floors.map(([x,w],i)=>({id:'ch1:solid:'+slug+'-floor-'+i,x,y:590,w,h:170})).concat(shelves.map(([x,y,w],i)=>platform('ch1:solid:'+slug+'-shelf-'+i,x,y,w))),
  hazards,enemies,doors:[],interactions:[],anchors:[],checkpoints:[],shrines:[],chests:[],sigils:[],npc:null,boss:null,exit:null,
  rewardPolicy:{storage:'chapter.defeated',gold:0,xp:0},
  objective:'Explore the optional room and return through its marked door.'};
}
function foe(slug,n,x,type,patrol,phase='exploration'){
 const id='ch1:enemy:'+slug+'-'+String(n).padStart(2,'0');
 const enemy={id,x,y:type==='sentinel'?532:type==='crawler'?556:365,type,patrol,phase,gold:0,xp:0};
 defeated[id]={id,sceneId:Object.values(R).find(s=>s.endsWith(slug)),phase,type,gold:0,xp:0};
 return enemy;
}
room(R.mill,'moonroot','Millpond Irrigation Terraces',1900,[[0,820],[920,980]],[[580,480,200],[810,520,120],[1080,480,220],[1280,370,200]],
 [{x:820,y:615,w:100,h:145,type:'spikes'}],
 [foe('millpond',1,620,'crawler',[560,710]),foe('millpond',2,1140,'sentinel',[1060,1230]),foe('millpond',3,1440,'wisp',[1440,1440])]);
room(R.gallery,'cinderworks','Cooling Gallery',2050,[[0,860],[980,1070]],[[570,480,200],[850,520,140],[1120,480,230],[1370,370,210]],
 [{x:860,y:615,w:120,h:145,type:'lava',ventId:'ch1:mechanism:vent-west'}],
 [foe('cooling-gallery',1,650,'sentinel',[570,730]),foe('cooling-gallery',2,1210,'crawler',[1120,1280]),foe('cooling-gallery',3,1490,'wisp',[1490,1490])]);
room(R.cellar,'moonroot','Rootcellar Charter Desk',1900,[[0,1900]],[[560,480,180],[790,370,190],[1060,480,210]],[],
 [foe('rootcellar',1,600,'crawler',[520,690]),foe('rootcellar',2,1070,'sentinel',[1000,1160]),foe('rootcellar',3,1290,'wisp',[1290,1290])]);
room(R.archive,'hollowspire','Star Archive',2200,[[0,2200]],[[610,480,180],[910,480,190],[1200,480,190],[1500,480,180]],[],
 [foe('star-archive',1,660,'crawler',[570,740]),foe('star-archive',2,1040,'sentinel',[960,1110]),foe('star-archive',3,1350,'wisp',[1350,1350])]);
rooms[R.mill].hint='Jump over the irrigation channel or use the low terrace. Inspect both valves and carry the water letter back to Mara.';
rooms[R.gallery].hint='Jump onto the low service shelf over the hot channel. The marked vents are optional; Cinderseal is not lava immunity.';
rooms[R.cellar].hint='The Charter desk and both return doors are on the floor. Read the public letter; testimony never locks the old ending.';
rooms[R.archive].hint='Read the three testimony seals, or challenge the Engine directly. Avoid marked falling light, strike during recovery, and use lumen bolts.';
function anchor(id,sceneId,x,y=590){
 anchors[id]={id,sceneId,x,y,safe:true,rest:false,requirements:sceneId===R.archive?completed:[],coordinateSystem:'player-left/feet'};
 if(rooms[sceneId])rooms[sceneId].anchors.push(id);
 return id;
}
const A={
 moon:anchor('ch1:anchor:moonroot-mill',M.moon,730),
 moonCellar:anchor('ch1:anchor:moonroot-cellar',M.moon,2030),
 cinder:anchor('ch1:anchor:cinderworks-gallery',M.cinder,600),
 spire:anchor('ch1:anchor:hollowspire-archive',M.spire,600),
 mill:anchor('ch1:anchor:millpond-entry',R.mill,130),
 gallery:anchor('ch1:anchor:gallery-entry',R.gallery,130),
 cellar:anchor('ch1:anchor:rootcellar-entry',R.cellar,130),
 cellarMill:anchor('ch1:anchor:rootcellar-millpond',R.cellar,1680),
 millCellar:anchor('ch1:anchor:millpond-rootcellar',R.mill,1840),
 archive:anchor('ch1:anchor:archive-entry',R.archive,130),
 archiveCellar:anchor('ch1:anchor:archive-lamp',R.archive,330),
 millRecovery:anchor('ch1:anchor:millpond-recovery',R.mill,1680),
 galleryRecovery:anchor('ch1:anchor:gallery-recovery',R.gallery,1830),
 cellarRecovery:anchor('ch1:anchor:rootcellar-recovery',R.cellar,1460),
 archiveRecovery:anchor('ch1:anchor:archive-recovery',R.archive,1950)
};
function pair(slug,left,right,enterRequirements=[]){
 const pairId='ch1:door-pair:'+slug;
 for(const [suffix,from,to,requirements] of [['enter',left,right,enterRequirements],['return',right,left,[]]]){
  const a=anchors[from],b=anchors[to],id='ch1:door:'+slug+'-'+suffix;
  doors[id]={id,pairId,reverseId:'ch1:door:'+slug+'-'+(suffix==='enter'?'return':'enter'),sourceScene:a.sceneId,destScene:b.sceneId,
   source:{x:a.x-18,y:a.y-72,w:64,h:72},x:a.x,y:a.y,destAnchor:to,requirements,optional:true,rest:false};
  if(rooms[a.sceneId])rooms[a.sceneId].doors.push(id);
 }
}
pair('millpond',A.moon,A.mill);
pair('cooling-gallery',A.cinder,A.gallery);
pair('rootcellar',A.moonCellar,A.cellar);
pair('star-archive',A.spire,A.archive,completed);
pair('millpond-rootcellar',A.millCellar,A.cellarMill);
function interaction(id,sceneId,type,x,y,extra={}){
 interactions[id]={id,sceneId,type,x,y,radius:86,requirements:[],optional:true,...extra};
 if(rooms[sceneId])rooms[sceneId].interactions.push(id);
 return id;
}
function mechanism(slug,sceneId,x,y,label,extra={}){
 const id='ch1:mechanism:'+slug;
 mechanisms[id]={id,sceneId,phase:'exploration',label,...extra};
 interaction(id,sceneId,'mechanism',x,y,{label,mechanismId:id,...extra});return id;
}
const valveWest=mechanism('valve-west',R.mill,400,590,'Inspect the west irrigation valve');
const valveEast=mechanism('valve-east',R.mill,1550,590,'Inspect the east irrigation valve');
mechanism('rootbridge',R.mill,1000,590,'Rootbinding shortcut',{
 requirements:[req('ability','rootbinding')],ability:'rootbinding',
 geometry:[platform('ch1:solid:rootbridge',800,480,140)],clearFootprint:{x:800,y:420,w:140,h:78},waitIfOccupied:true});
const ventWest=mechanism('vent-west',R.gallery,420,590,'Bank the west marked vent',{
 requirements:[req('ability','cinderseal')],ability:'cinderseal',hazardIds:['ch1:hazard:gallery-west'],effect:'cool-marked-vent'});
const ventEast=mechanism('vent-east',R.gallery,1740,590,'Bank the east cooling vent',{
 requirements:[req('ability','cinderseal')],ability:'cinderseal',effect:'vent-visual-only'});
rooms[R.gallery].hazards[0].id='ch1:hazard:gallery-west';
for(const [slug,x,label] of [['water',560,'Mara: water belongs to those who tend it.'],['summer',1160,'Tovan: warmth must not steal tomorrow.'],['charter',1780,'Orin: publish my signature beside the crown’s.']]){
 mechanism('seal-'+slug,R.archive,x,590,label,{phase:'testimony',effect:'record-testimony',testimony:slug});
}
function item(slug,sceneId,x,y,label,requirements=[]){
 const id='ch1:item:'+slug;
 items[id]={id,sceneId,phase:'exploration',label,nonconsumable:true,requirements};
 interaction(id,sceneId,'item',x,y,{itemId:id,label,requirements});return id;
}
const water=item('water-letter',R.mill,1710,590,'Water Remembers',[req('mechanisms',valveWest),req('mechanisms',valveEast)]);
const coal=item('summer-coal',R.gallery,1870,590,'Summer Coal');
const charter=item('charter',R.cellar,1460,590,'Common Hearth Charter');
const testimony=item('orin-testimony',M.spire,1000,590,'Orin’s signed testimony');
const letter=item('open-letter',R.cellar,390,590,'Lyra’s open letter');
function delivery(slug,itemId,sceneId,x,label,gold){
 const id='ch1:delivery:'+slug;
 deliveries[id]={id,itemId,sceneId,phase:'delivery',label,gold,xp:0,requirements:[req('items',itemId)],optional:true,
  reward:{gold,xp:0},transaction:'delivery-fact-and-gold-together'};
 interaction(id,sceneId,'delivery',x,590,{deliveryId:id,label,requirements:deliveries[id].requirements});return id;
}
const waterDelivery=delivery('water-remembers',water,M.moon,275,'Deliver Water Remembers to Mara',60);
const coalDelivery=delivery('summer-coal',coal,M.cinder,275,'Deliver Summer Coal to Tovan',80);
const charterDelivery=delivery('charter',charter,M.spire,275,'Publish the Common Hearth Charter with Orin',0);
const engineId='ch1:enemy:archivist-engine';
defeated[engineId]={id:engineId,sceneId:R.archive,phase:'encounter',type:'regent',gold:0,xp:0};
// Existing regent moves/telegraphs only. This guardian never owns a campaign rune,
// heart, gate or exit; explicit activation is independent of optional testimony.
rooms[R.archive].boss={id:engineId,name:'The Archivist Engine',type:'regent',x:1450,y:450,hp:260,arena:[750,1850],
 phase:'encounter',optIn:true,requirements:completed,gold:0,xp:0,rewardPolicy:'chapter-only',moves:['falling-light','bolt','recovery'],
 instruction:'Move away from marked falling light. Strike during recovery; lumen bolts and guard remain available.'};
rooms[R.archive].bossIntro=['The Archivist Engine: A record is not a command.','Aster: Move away from the marked falling light; strike during recovery.'];
interaction('ch1:interaction:archive-opt-in',R.archive,'encounter',790,590,{label:'Challenge the Archivist Engine',encounterId:engineId,requirements:completed,
 confirmation:'Begin an optional encounter? It does not change your ending.',startPosition:{x:790,y:590},startInsideArena:true});
interaction('ch1:interaction:archive-finish',R.archive,'complete',2030,590,{label:'Release the archived hours',
 requirements:[...completed,req('defeated',engineId)],effect:'complete-chapter',reward:{gold:0,xp:0},preserveCampaignEnding:true});
interaction('ch1:interaction:dawnstep',R.archive,'ability',370,590,{label:'Dawnstep between the archive lamps',
 requirements:[req('ability','dawnstep')],ability:'dawnstep',fromAnchor:A.archiveCellar,toAnchor:A.archive,
 sameSceneOnly:true,requireNoCombat:true,waitIfOccupied:true});
interaction('ch1:interaction:dawnstep-return',R.archive,'ability',1950,590,{label:'Dawnstep back to the entry lamp',
 requirements:[req('ability','dawnstep'),req('defeated',engineId)],ability:'dawnstep',fromAnchor:A.archiveRecovery,toAnchor:A.archive,
 sameSceneOnly:true,requireNoCombat:true,waitIfOccupied:true});
const abilities={
 rootbinding:{id:'rootbinding',requirements:[req('campaignDefeated','m-boss'),req('campaignRunes','m-si0'),req('campaignRunes','m-si1')],optional:true},
 cinderseal:{id:'cinderseal',requirements:[req('campaignDefeated','c-boss'),req('campaignRunes','c-si0'),req('campaignRunes','c-si1')],optional:true},
 dawnstep:{id:'dawnstep',requirements:[req('campaignDefeated','h-boss'),req('campaignRunes','h-si0'),req('campaignRunes','h-si1'),...completed],optional:true}
};
const sceneIds=[...Object.keys(mainScenes),...Object.keys(rooms)];
const rosters={discovered:sceneIds,scenes:sceneIds,mechanisms:Object.keys(mechanisms),items:Object.keys(items),deliveries:Object.keys(deliveries),defeated:Object.keys(defeated),anchors:Object.keys(anchors)};
// Save dependency maps use conjunction objects; runtime interactions use predicates.
// Neither is a second inventory/status machine. Every fact is scene-bound, including
// dormant encounter/testimony IDs. The save adapter validates these before commit.
const requirements={discovered:{},mechanisms:{},items:{},deliveries:{},defeated:{}};
for(const id of sceneIds){
 const realm=rooms[id]?.realmId||['moonroot','cinderworks','hollowspire'][mainScenes[id]];
 requirements.discovered[id]={seen:[realm],...(id===R.archive?{completed:true}:{})};
}
function savedRequirements(sceneId,list=[]){
 const result={discovered:[sceneId]};
 for(const r of list){
  if(r.category==='campaign')result.completed=true;
  else if(r.category==='ability'){
   for(const p of abilities[r.id].requirements){
    if(p.category==='campaign')result.completed=true;
    else {const key=p.category==='campaignRunes'?'runes':'campaignDefeated';(result[key]||=[]).push(p.id);}
   }
  }else (result[r.category]||=[]).push(r.id);
 }
 return result;
}
for(const [category,table] of Object.entries({mechanisms,items,deliveries,defeated}))for(const entry of Object.values(table)){
 const runtime=interactions[entry.id]?.requirements||entry.requirements||[];
 requirements[category][entry.id]=savedRequirements(entry.sceneId,runtime);
 if(entry.id===engineId)requirements[category][entry.id].completed=true;
 entry.requires=requirements[category][entry.id];
}
for(const a of Object.values(anchors)){a.anchorId=a.id;a.requires=savedRequirements(a.sceneId,a.requirements);}
const completeRequires={completed:true,discovered:[R.archive],defeated:[engineId]};
// Native runtime predicate contract. Preserve strict save .requires separately.
function runtimeRequirements(list){
 const result={};
 for(const r of list){
  if(r.category==='campaign')result.completed=true;
  else if(r.category==='ability'){
   for(const p of abilities[r.id].requirements){
    if(p.category==='campaign')result.completed=true;
    else if(p.category==='campaignDefeated')result.boss=p.id;
    else (result.runes||=[]).push(p.id);
   }
  }else (result[r.category]||=[]).push(r.id);
 }
 return result;
}
for(const i of Object.values(interactions)){
 i.requirements=runtimeRequirements(i.requirements);
 if(i.type==='mechanism')i.effects={mechanisms:[i.mechanismId]};
 if(i.type==='item')i.effects={items:[i.itemId]};
 if(i.geometry)i.bridge=i.geometry;
 if(i.effect==='cool-marked-vent')i.cooledHazardIds=i.hazardIds;
}
for(const d of Object.values(doors)){d.requirements=runtimeRequirements(d.requirements);d.label=rooms[d.destScene]?.name||'Return to the main road';}

const registry={scenes:Object.fromEntries(sceneIds.map(id=>[id,rooms[id]||{id,sceneId:id,realmId:['moonroot','cinderworks','hollowspire'][mainScenes[id]],campaignIndex:mainScenes[id]}])),mechanisms,items,deliveries,defeated,anchors,doors,interactions};
function deriveAbilities(base){
 const flags=base?.flags||{};
 const heart=(prefix)=>base?.mode==='story'&&Array.isArray(flags.defeated)&&flags.defeated.includes(prefix+'-boss')&&Array.isArray(flags.runes)&&[0,1].every(n=>flags.runes.includes(prefix+'-si'+n));
 return {rootbinding:heart('m'),cinderseal:heart('c'),dawnstep:heart('h')&&base?.completed===true};
}
function deriveObjectives(facts={},base={}){
 const has=(category,id)=>Array.isArray(facts[category])&&facts[category].includes(id);
 const objectives=Object.values(deliveries).map(d=>({id:d.id,label:d.label,sceneId:d.sceneId,itemId:d.itemId,gold:d.gold,
  status:has('deliveries',d.id)?'delivered':has('items',d.itemId)?'ready':'find-item'}));
 objectives.push({id:'ch1:objective:archive',label:'Opt in to the Archivist Engine',sceneId:R.archive,
  status:facts.complete===true&&has('defeated',engineId)?'complete':has('defeated',engineId)?'release-hours':base.completed===true&&base.mode==='story'?'available':'finish-story'});
 return {objectives,abilities:deriveAbilities(base),testimony:{water:has('deliveries',waterDelivery),summer:has('deliveries',coalDelivery),
  charter:has('deliveries',charterDelivery)&&has('items',testimony),openLetter:has('items',letter)},
  sealsReady:['water','summer','charter'].every(s=>has('mechanisms','ch1:mechanism:seal-'+s))};
}
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function safeAnchor(a,levels=root.EW_LEVELS){
 const scene=rooms[a?.sceneId]||levels?.[mainScenes[a?.sceneId]];
 if(!scene||!Number.isFinite(a.x)||!Number.isFinite(a.y))return false;
 const body={x:a.x,y:a.y-54,w:28,h:54};
 return body.x>=0&&body.x+body.w<=scene.width&&body.y>=0&&a.y<=590&&
  scene.solids.some(s=>Math.abs(s.y-a.y)<.01&&s.x<=body.x&&s.x+s.w>=body.x+body.w)&&
  !scene.solids.some(s=>overlaps(body,s))&&!scene.hazards.some(h=>overlaps({...body,x:body.x-12,w:52,h:66},h));
}
function validateData(levels=root.EW_LEVELS){
 const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);};
 check(sceneIds.length===7&&Object.keys(rooms).length===4,'four rooms / three main scenes required');
 const allIds=new Set();
 for(const table of [doors,anchors,interactions,defeated])for(const id of Object.keys(table)){check(!allIds.has(id),'duplicate authored id '+id);allIds.add(id);}
 for(const a of Object.values(anchors))check(safeAnchor(a,levels),'unsafe anchor '+a.id);
 for(const d of Object.values(doors)){
  const reverse=doors[d.reverseId],a=anchors[d.destAnchor];
  check(sceneIds.includes(d.sourceScene)&&sceneIds.includes(d.destScene),'unknown door scene '+d.id);
  check(a?.sceneId===d.destScene&&safeAnchor(a,levels),'invalid landing '+d.id);
  check(reverse?.reverseId===d.id&&reverse.sourceScene===d.destScene&&reverse.destScene===d.sourceScene,'unpaired door '+d.id);
  check(d.source.w>0&&d.source.h>0&&Number.isFinite(d.source.x+d.source.y),'invalid door box '+d.id);
 }
 for(const i of Object.values(interactions)){
  check(sceneIds.includes(i.sceneId),'unknown interaction scene '+i.id);
  const scene=rooms[i.sceneId]||levels?.[mainScenes[i.sceneId]];
  check(scene&&i.x>=0&&i.x+28<=scene.width&&Number.isFinite(i.y),'invalid interaction '+i.id);
  check(safeAnchor({sceneId:i.sceneId,x:i.x,y:i.y},levels),'unsupported interaction '+i.id);
 }
 for(const room of Object.values(rooms)){
  check(room.doors.some(id=>Object.keys(doors[id].requirements).length===0),'room has no unconditional exit '+room.id);
  for(const s of [...room.solids,...room.hazards])check(Number.isFinite(s.x+s.y+s.w+s.h)&&s.w>0&&s.h>0&&s.x>=0&&s.x+s.w<=room.width,'invalid geometry '+room.id);
  for(const e of room.enemies)check(defeated[e.id]?.sceneId===room.id,'unregistered enemy '+e.id);
 }
 for(const i of Object.values(interactions))for(const [category,ids] of Object.entries(i.requirements)){
  if(rosters[category])check(Array.isArray(ids)&&ids.every(id=>rosters[category].includes(id)),'unknown requirement '+i.id);
  else check(['completed','boss','runes'].includes(category),'unknown requirement category '+category);
 }
 return {valid:errors.length===0,errors};
}
// Read-only journey guidance. Targets describe authored places; they never authorize travel.
const leads={
 [R.mill]:'Irrigation terraces lead',[R.gallery]:'Cooling service passage lead',
 [R.cellar]:'Public letter desk lead',[R.archive]:'Archive records lead'
};
function doorLabel(door,facts={}){
 const room=rooms[door.destScene];
 return !room?'Return to '+({[M.moon]:'Moonroot road',[M.cinder]:'Cinderworks road',[M.spire]:'Hollow Spire road'}[door.destScene]||'the main road'):
  facts.discovered?.includes(room.id)?room.name:leads[room.id];
}
function deriveNextAction(base={},facts={},context={}){
 const scene=context.sceneId||Object.keys(mainScenes).find(id=>mainScenes[id]===(base.level||0)),levels=context.levels||root.EW_LEVELS||[];
 const has=(k,id)=>Array.isArray(facts[k])&&facts[k].includes(id),flag=(k,id)=>Array.isArray(base.flags?.[k])&&base.flags[k].includes(id);
 const result=(track,stage,text,target=null,reason='',action=null)=>({track,stage,text,target,reason,action});
 if(base.mode!=='story')return result('echo','gauntlet','Overcome the three guardians. Your time stays on this browser.');
 const local=rooms[scene];
 if(local){
  let target=null,action='interact',stage='explore';
  if(scene===R.mill){target=!has('mechanisms',valveWest)?valveWest:!has('mechanisms',valveEast)?valveEast:!has('items',water)?water:!has('deliveries',waterDelivery)?'ch1:door:millpond-return':'ch1:door:millpond-rootcellar-enter';stage=target;}
  if(scene===R.gallery){target=!has('items',coal)?coal:'ch1:door:cooling-gallery-return';stage=target;}
  if(scene===R.cellar){target=base.completed&&facts.complete?letter:!has('items',charter)?charter:!has('deliveries',charterDelivery)?'ch1:door:rootcellar-return':!has('items',letter)?letter:'ch1:door:rootcellar-return';stage=target;}
  if(scene===R.archive){target=facts.complete?'ch1:door:star-archive-return':has('defeated',engineId)?'ch1:interaction:archive-finish':'ch1:interaction:archive-opt-in';stage=target;if(context.bossActive){action=context.bossState==='recover'?'attack':null;return result('optional','engine-combat',context.bossState==='recover'?'The Engine is recovering. Strike now.':'Leave marked falling light; strike when the Engine recovers.',engineId,'Optional encounter',action);}}
  let text=selectStory(base,facts,{type:'advice',sceneId:scene}).lines.join(' ');
  if(scene===R.cellar&&base.completed&&facts.complete)text='Return to Lyra’s open letter at the western desk. Read what this journey has made possible.';
  if(scene===R.archive&&facts.complete)text='The hours are released. Return by either door; Lyra’s open letter in the Rootcellar has a new last page.';
  return result('optional',stage,text,target,'Optional room; your original ending is unchanged.',action);
 }
 const i=mainScenes[scene]??base.level??0,l=levels[i],following=deliveries[context.followDeliveryId];
 if(!base.completed&&(!following||has('deliveries',following.id))){
  if(!l)return result('campaign','seek-heart','Explore this realm. Restore its two world-runes, then face its guardian.');
  const missing=(l.sigils||[]).filter(r=>!flag('sigils',r.id)),released=missing.find(r=>flag('runes',r.id)),sealed=missing.find(r=>!flag('runes',r.id));
  if(released)return result('campaign','collect-'+released.id,'The rune is unsealed. Climb to its freed light and touch it.',released.id,'Released is not collected.','jump');
  if(sealed)return result('campaign','release-'+sealed.id,'Climb toward the '+(sealed===l.sigils[0]?'first':'second')+' '+['canopy','gantry','hall'][i]+' rune and cast lumen at its seal.',sealed.id,'Collect both freed lights to open the guardian’s arena.','spell');
  if(l.boss&&!flag('defeated',l.boss.id))return result('campaign',context.bossActive?'guardian-combat':'guardian',context.bossActive?(context.bossState==='recover'?'The guardian is recovering. Strike now.':'Watch the warning; move clear, then strike during recovery.'):'Both runes are collected. Approach the eastern guardian.',l.boss.id,'The guardian holds the world-gate.',context.bossActive&&context.bossState==='recover'?'attack':null);
  return result('campaign','gate',i===2?'Enter the eastern world-gate to write your original ending.':'The heart is restored. Enter the eastern world-gate.',l.exit?.id||null,'Optional deliveries never gate this journey.','interact');
 }
 let delivery=following&&!has('deliveries',following.id)?following:null;
 if(!delivery){const pending=Object.values(deliveries).filter(d=>!has('deliveries',d.id));delivery=pending.find(d=>has('items',d.itemId))||pending.find(d=>d.sceneId===scene)||pending[0];}
 let dest,target,text,stage;
 if(delivery){const carried=has('items',delivery.itemId),item=items[delivery.itemId];dest=carried?delivery.sceneId:item.sceneId;target=carried?delivery.id:item.id;stage=(carried?'deliver-':'find-')+delivery.id;text=carried?delivery.label+'.':'Find '+item.label+'; then '+delivery.label.charAt(0).toLowerCase()+delivery.label.slice(1)+'.';}
 else if(!facts.complete){dest=R.archive;target=has('defeated',engineId)?'ch1:interaction:archive-finish':'ch1:interaction:archive-opt-in';stage='archive';text=has('defeated',engineId)?'Return to the Archive’s eastern desk to release the hours.':'Visit the Star Archive on the Hollow Spire road. Challenge its Engine only if you wish.';}
 else{dest=R.cellar;target=letter;stage='coda';text='Return to Lyra’s open letter in the Rootcellar for this journey’s last page.';}
 if(scene===dest)return result('optional',stage,text,target,'Followed task; change it in the journal.','interact');
 // Door graph has no teleport edges. Unknown leads remain descriptions, not discoveries.
 const queue=[[scene,[]]],seen=new Set([scene]);let route=null;
 while(queue.length){const [at,path]=queue.shift();if(at===dest){route=path;break;}for(const d of Object.values(doors)){if(d.sourceScene!==at||seen.has(d.destScene)||d.requirements.completed&&!base.completed)continue;seen.add(d.destScene);queue.push([d.destScene,[...path,d]]);}}
 if(route?.length){const door=route[0];return result('optional',stage,'Take the '+doorLabel(door,facts)+'. '+text,door.id,'Walk to the marked door; nearby danger may block passage.','interact');}
 const destinationRealm=rooms[dest]?.realmIndex??mainScenes[dest],realm=levels[destinationRealm];
 if(Number.isInteger(destinationRealm)&&destinationRealm!==i){
  const canTravel=context.travelableRealms?.includes(destinationRealm);
  return result('optional',stage,(canTravel?'Use Map to revisit ':'Continue the original adventure toward ')+(realm?.name||'the recipient’s realm')+'. '+text,canTravel?'realm:'+destinationRealm:dest,canTravel?'Map travel remains subject to its normal safety checks.':'This lead does not unlock a realm or bypass a guardian.');
 }
 return result('optional',stage,text,target,'Optional; no deliveries or testimony gate the original ending.','interact');
}

// Authored chapter dialogue: practical repairs, not another stolen world-heart.
const story={
 'ch1:mechanism:valve-west':['Mara marked this valve with a seed. The crown conduit has been drinking the garden’s water.', 'Lyra: I can change a channel without commanding the river.'],
 'ch1:mechanism:valve-east':['The second valve answers the first. Beyond the mill, the dry terraces begin to darken.', 'Aster: No throne is needed for this. Just someone willing to come back.'],
 'ch1:item:water-letter':['Water Remembers. Mara’s measurements show how each terrace can take its share without starving the next.', 'Carry the letter to Mara on the Moonroot road.'],
 'ch1:item:summer-coal':['This coal bears no stolen year. Tovan has learned to bank a fire and let the furnace sleep.', 'Carry Summer Coal to Tovan on the Cinderworks road.'],
 'ch1:item:charter':['The Common Hearth Charter names gardens, workshops and archives as their own keepers.', 'Orin must publish it beside the records he once kept for the crown.'],
 'ch1:item:orin-testimony':['Orin’s signature is here, beneath the orders he recorded. He has not crossed it out.', 'Orin: A record that hides my part in it would only be another locked door.'],
 'ch1:item:open-letter':['Lyra: Tomorrow is not a promise that nothing will hurt. It is a promise that the next page is ours.', 'The letter remains open. None of the optional deliveries can take your original ending away.'],
 'ch1:mechanism:seal-water':['Mara: A garden needs water that moves. I will not ask the Rootheart to hold spring still.'],
 'ch1:mechanism:seal-summer':['Tovan: Some nights the forge will be cold. We will build warmth without burning another person’s years.'],
 'ch1:mechanism:seal-charter':['Orin: Publish my signature beside the crown’s. Let the record be useful, not flattering.'],
 'ch1:interaction:archive-finish':['The Engine releases the hours it was still counting. Their owners cannot be restored by another cage.', 'Lyra: Let them belong to what comes next. The Common Hearth will keep a place for them.']
};
for(const [id,lines] of Object.entries(story))if(interactions[id]){interactions[id].lines=lines;interactions[id].speaker='The First Unwritten Day';}
rooms[R.archive].bossIntro=['The Archivist Engine still counts futures under the old royal order.', 'Aster: Both light lanes are marked before they fire. Leave the marks, then strike while the Engine cools.'];
rooms[R.archive].victory=['The last counters fall silent. No fourth world-heart waits inside this machine—only hours that were never its own.', 'Lyra: The old ending is ours. This is what we do after it. Take the eastern desk to release the archived hours.'];
// A pure view of THIS journey. Never infer story from browser-wide awards/unlocks.
function selectStory(base={},facts={},context={}){
 const storyMode=base.mode==='story',has=(k,id)=>storyMode&&Array.isArray(facts[k])&&facts[k].includes(id);
 const state={ending:storyMode&&base.completed===true&&['mercy','rekindle'].includes(base.ending)?base.ending:null,
  waterDelivered:has('deliveries',waterDelivery),summerDelivered:has('deliveries',coalDelivery),
  charterPublished:has('deliveries',charterDelivery),signedTestimony:has('items',testimony),openLetterRead:has('items',letter)};
 state.charterWitnessed=state.charterPublished&&state.signedTestimony;
 const response=(lines=[],speaker='Aster')=>({speaker,lines,state});
 const endingLine=state.ending==='mercy'?'The king has a tomorrow. His orders stay in the public record.':state.ending==='rekindle'?'The palace is fading. Its orders stay in the public record.':null;
 if(context.type==='state'||!storyMode)return response([]);
 if(context.type==='npc'){
  let lines=[];
  if(context.realmId==='moonroot')lines=[state.waterDelivered?'Mara: Your measurements are here. Each terrace takes its share; I have planted beside the channel.':'Mara: Bring me Water Remembers from the irrigation terraces. We must measure each garden’s share.'];
  if(context.realmId==='cinderworks')lines=[state.summerDelivered?'Tovan: Summer Coal is safely banked. Tonight the hearth will warm a home without burning anyone’s years.':'Tovan: Bring Summer Coal from the Cooling Gallery. I want warmth we can let go cold.'];
  if(context.realmId==='hollowspire')lines=[...(endingLine?['Orin: '+endingLine]:[]),state.charterPublished?'Orin: The Common Hearth Charter is published beside the crown’s orders.':'Orin: The Charter must be brought here and published; carrying a copy is not publication.',state.signedTestimony?'Orin: You have read my signed testimony. I will not hide my part in those orders.':'Orin: My signed testimony waits farther along this road. Read it before you speak for me.'];
  return response(lines,'');
 }
 const scene=context.sceneId,id=context.id,m=interactions[id],done=m&&(m.type==='item'?has('items',m.itemId||id):m.type==='delivery'?has('deliveries',m.deliveryId||id):m.type==='complete'?facts.complete===true:has('mechanisms',m.mechanismId||id));
 if(context.type==='advice'){
  let text='The optional delivery doors are marked on the realm roads. Your journal remembers this journey only.';
  if(scene===R.mill)text=!has('mechanisms',valveWest)?'Inspect the west valve near the entrance, then cross to the east valve.':!has('mechanisms',valveEast)?'The west valve is inspected. Cross the channel and inspect the east valve.':!has('items',water)?'Both valves are inspected. Collect Water Remembers at the eastern terrace.':!state.waterDelivered?'Carry Water Remembers through the return door to Mara on the Moonroot road.':'Mara has the measurements. The eastern door leads to the Charter desk.';
  else if(scene===R.gallery)text=!has('items',coal)?'Take the low service shelves over the hot channel to Summer Coal. Vents are optional; only the west marked channel can be cooled.':!state.summerDelivered?'Return Summer Coal to Tovan on the Cinderworks road. Doors do not refill flasks.':'Tovan has Summer Coal. The east vent releases steam only; it is not a lava shortcut.';
  else if(scene===R.cellar)text=!has('items',charter)?'Read the Charter at the eastern desk. Both return doors remain usable.':!state.charterPublished?'Take the Charter to Orin on the Hollow Spire road for publication.':!state.openLetterRead?'The Charter is published. Lyra’s open letter still waits near the western desk.':'The Charter is published and Lyra’s letter is read. Return by either door.';
  else if(scene===R.archive)text=facts.complete?'The archived hours are released. Your original ending is unchanged.':has('defeated',engineId)?'The Engine is quiet. Release its hours at the eastern desk.':'Read any testimony you wish, or challenge the Engine directly. Deliveries and signatures never lock that choice.';
  else if(scene===M.moon)text=has('items',water)&&!state.waterDelivered?'Mara is waiting near the start of this road for Water Remembers.':'The Millpond door leads to the irrigation valves; both must be inspected before collecting the letter.';
  else if(scene===M.cinder)text=has('items',coal)&&!state.summerDelivered?'Tovan is waiting near the start of this road for Summer Coal.':'Use the Cooling Gallery door from this road. The low shelves cross its hot channel.';
  else if(scene===M.spire)text=has('items',charter)&&!state.charterPublished?'Publish the Charter with Orin near the start of this road. His signed testimony waits farther east.':state.ending?'The Star Archive door is open. Its Engine is optional, regardless of deliveries or testimony.':'The Star Archive opens after either original ending. No delivery is required to finish that story.';
  return response([text]);
 }
 if(!m)return response([]);
 const repeat=context.phase==='repeat'||(!context.phase&&done);
 const mechanismText={
  [valveWest]:['The west valve marks the first share of water. Inspect the east valve before taking the water letter.','The west valve is already inspected. The east valve and water letter remain separate tasks.'],
  [valveEast]:['The east valve completes the measurements only when the west valve is inspected too. The letter waits on the eastern terrace.','The east valve is already inspected. Take the letter only after both valves are recorded.'],
  'ch1:mechanism:rootbridge':['Rootbinding grows one shelf above the channel. Move clear of its footprint first; your ordinary jumps still work.','The Rootbinding shelf remains above the channel. Inspecting again grows no second shelf.'],
  [ventWest]:['The west marked vent is banked. Only this marked channel is cooled; other lava still burns.','The west marked channel remains cooled. No other lava has changed.'],
  [ventEast]:['The east vent releases steam only. It does not cool the channel or create a shortcut.','The east vent is already banked. Its steam has changed, not the lava.']
 };
 if(id==='ch1:interaction:dawnstep-return')return response([context.phase==='locked'?'This return lamp needs Dawnstep and the Archivist Engine’s defeat in this journey.':facts.complete?'Dawnstep returns to the entry lamp only. The archived hours are already released; no resources are restored.':'Dawnstep returns to the entry lamp only. You may leave now, but the archived hours remain unfinished at the eastern desk. No resources are restored.']);
 if(context.phase==='locked'){
  const text=m.ability==='rootbinding'?'Rootbinding needs the Rootheart guardian and both Moonroot runes. You can cross with ordinary jumps.':m.ability==='cinderseal'?'Cinderseal needs the Forgeheart guardian and both Cinderworks runes. Use the service shelves; other lava remains dangerous.':m.ability==='dawnstep'?'Dawnstep needs the Dawnheart guardian, both Spire runes and an original ending. It links only these archive lamps.':id===water?'Inspect both the west and east irrigation valves before collecting Water Remembers.':m.type==='complete'?'Defeat the optional Archivist Engine before releasing its hours. Testimony is not required.':m.type==='encounter'?'The Archive encounter is available after either original ending, without deliveries or testimony.':m.type==='delivery'?'Carry the named item to its recipient before delivering it.':'This optional interaction is not ready. Check the current room in Aster’s advice.';
  return response([text]);
 }
 if(id===valveEast&&!has('mechanisms',valveWest))return response(['The east valve is inspected, but the west valve still needs your measurements. Inspect both before collecting Water Remembers.']);
 if(mechanismText[id])return response(repeat?[mechanismText[id][1]]:[...(story[id]||[]),mechanismText[id][0]]);
 if(id==='ch1:mechanism:seal-water')return response([state.waterDelivered?'Mara’s recorded repair: Water Remembers has been delivered. Each terrace can take its measured share.':'Mara’s proposed pledge: share the moving water. Water Remembers has not been delivered in this journey.',...(repeat?['You have already read this seal. Reading is not a delivery.']:[])]);
 if(id==='ch1:mechanism:seal-summer')return response([state.summerDelivered?'Tovan’s recorded repair: Summer Coal has been delivered. The hearth can rest without burning another person’s years.':'Tovan’s proposed pledge: warmth without stolen years. Summer Coal has not been delivered in this journey.',...(repeat?['You have already read this seal. Reading is not a delivery.']:[])]);
 if(id==='ch1:mechanism:seal-charter')return response([state.charterPublished?'The Common Hearth Charter is published beside the crown’s orders.':'The Charter is a proposed public promise; it has not been published in this journey.',state.signedTestimony?'Orin’s signed testimony has been read. His part in those orders remains named.':'Orin’s signed testimony has not been read in this journey.',...(endingLine?[endingLine]:[])]);
 if(m.type==='delivery')return selectStory(base,facts,{type:'npc',realmId:m.sceneId===M.moon?'moonroot':m.sceneId===M.cinder?'cinderworks':'hollowspire'});
 if(id===letter&&facts.complete===true&&state.ending)return response([
  'Lyra: The hearts are free, and the archived hours belong to their keepers. This is the page we write afterward.',
  state.waterDelivered?'Mara’s terraces have their measured share.':'Mara’s measurements can still be brought home; freedom is not the same as finished repair.',
  state.summerDelivered?'Tovan’s banked hearth warms a home without stolen years.':'Tovan’s hearth is still waiting for Summer Coal.',
  state.charterPublished?'The Common Hearth Charter stands in the public record.':'The Charter is not yet published. That work remains ours to choose.',
  state.signedTestimony?'Orin’s signed testimony remains named beside his part in the orders.':'Orin’s signed testimony is still there to read.',
  endingLine,'Lyra: No new crown. No perfect tomorrow. Just people who can choose what comes next.'
 ],'');
 if(id==='ch1:interaction:archive-finish')return response([...(repeat?['The archived hours are already released.']:story[id]),...(endingLine?[endingLine]:[]),'Lyra: '+(state.charterPublished?'The published Charter belongs to its keepers.':'The Charter can still be published. This release does not publish it for us.')],'');
 if(id==='ch1:interaction:dawnstep')return response(['Dawnstep links the two lamps in this room only. It never refills resources.']);
 if(id==='ch1:interaction:archive-opt-in')return response(['Challenge the Engine only if you wish. Neither deliveries nor testimony are required. Leave marked light; strike during recovery.']);
 return response(repeat?['Already read: '+m.label,...(story[id]||[])]:story[id]||[m.label],'The First Unwritten Day');
}

for(const m of Object.values(interactions)){
 const first=selectStory({mode:'story'},{},{type:'interaction',id:m.id,phase:'first'});
 if(!m.lines)m.lines=first.lines;
 if(!m.speaker)m.speaker=first.speaker;
 m.lockedText=selectStory({mode:'story'},{},{type:'interaction',id:m.id,phase:'locked'}).lines.join(' ');
}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const data=freeze({version:1,campaignId:'hollow-crown-v3',coordinateSystem:'player-left/feet',rooms,sceneIds,mainScenes,doors,anchors,interactions,
 registry,rosters,roster:rosters,requirements,completeRequires,mechanisms,items,deliveries,defeated,abilities,deriveAbilities,deriveObjectives,deriveNextAction,doorLabel,selectStory,safeAnchor,validateData,
 recoveryAnchor:A.mill,continueAnchor:A.moon,limits:{scenes:7,mechanisms:8,items:5,deliveries:3,defeated:13,anchors:15},
 invariants:{optional:true,changesCampaign:false,requiresNewMoves:false,doorRestoresVitals:false,archiveTestimonyRequired:false}});
root.EW=root.EW||{};root.EW.ChapterData=data;
if(typeof module!=='undefined'&&module.exports)module.exports=data;
})(typeof window!=='undefined'?window:globalThis);
