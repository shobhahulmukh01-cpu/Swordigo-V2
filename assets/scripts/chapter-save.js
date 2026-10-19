/* Emberwake chapter envelope. Dependency-free; storage visibility is single-key,
   not a disk-durability guarantee. Never writes legacy or rush keys. */
(function(root){
'use strict';
const EW=root.EW;if(!EW)throw new Error('ChapterSave requires EW.');
const KEY='EW_STORY_V4',MAX_BYTES=512*1024,CAMPAIGN='hollow-crown-v3';
const MAIN=['ch1:main:moonroot','ch1:main:cinderworks','ch1:main:hollowspire'];
const ROOMS=['ch1:room:millpond','ch1:room:cooling-gallery','ch1:room:rootcellar','ch1:room:star-archive'];
const FACTS=['discovered','mechanisms','items','deliveries','defeated'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const obj=o=>!!o&&typeof o==='object'&&!Array.isArray(o)&&[Object.prototype,null].includes(Object.getPrototypeOf(o));
const keys=(o,allowed)=>obj(o)&&Object.keys(o).every(k=>allowed.includes(k));
const number=(n,max,integer=false)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max&&(!integer||Number.isInteger(n));
const id=s=>typeof s==='string'&&s.length>0&&s.length<=100;
function bytes(s){let n=0;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c<128)n++;else if(c<2048)n+=2;else if(c>=0xd800&&c<=0xdbff&&i+1<s.length&&s.charCodeAt(i+1)>=0xdc00&&s.charCodeAt(i+1)<=0xdfff){n+=4;i++;}else n+=3;}return n;}
function decode(raw){try{const text=typeof raw==='string'?raw:JSON.stringify(raw);if(typeof text!=='string'||bytes(text)>MAX_BYTES)return {error:'Save exceeds the 512 KiB UTF-8 budget.',code:'oversize'};return {value:JSON.parse(text)};}catch(_){return {error:'Save is not serializable JSON.',code:'invalid'};}}
function fail(code,error){return {ok:false,code,error};}
function blankChapter(){return {active:false,complete:false,discovered:[],mechanisms:[],items:[],deliveries:[],defeated:[],anchor:null,stats:{time:0,kills:0,deaths:0}};}
// A bounded authored roster is resolved at call time, allowing script load order.
function roster(){const data=EW.ChapterData;if(!data)return null;const r=data.roster||data.rosters;if(!obj(r))return null;const out={};for(const k of FACTS){const a=k==='discovered'?(r.discovered||r.scenes):r[k];if(!Array.isArray(a)||a.length>256||a.some(x=>!id(x))||new Set(a).size!==a.length)return null;out[k]=a;}
 if(out.discovered.length!==7||[...MAIN,...ROOMS].some(s=>!out.discovered.includes(s)))return null;return {facts:out,data};}
function normalizeBase(raw,levels){
 if(!obj(raw)||raw.version!==3||raw.mode!=='story'||!Array.isArray(levels)||levels.length!==3||typeof EW.validateSave!=='function')return null;
 let b;try{b=EW.validateSave(raw,levels);}catch(_){return null;}if(!b||typeof raw.completed!=='boolean'||!number(raw.gold,999999,true)||!number(raw.stats?.kills,10000000,true)||!number(raw.stats?.deaths,10000000,true))return null;
 const sets={chests:levels.flatMap(l=>l.chests.map(x=>x.id)),runes:levels.flatMap(l=>l.sigils.map(x=>x.id)),sigils:levels.flatMap(l=>l.sigils.map(x=>x.id)),defeated:levels.flatMap(l=>[...l.enemies,l.boss].map(x=>x.id)),seen:levels.map(l=>l.id)};
 for(const k of Object.keys(sets))if(!Array.isArray(raw.flags?.[k])||raw.flags[k].some(x=>!sets[k].includes(x)))return null;
 if(b.flags.sigils.some(x=>!b.flags.runes.includes(x))||!b.flags.seen.includes(levels[b.level].id))return null;
 const furthest=Math.max(b.level,...b.flags.seen.map(x=>levels.findIndex(l=>l.id===x)));
 for(let i=0;i<furthest;i++)if(!b.flags.defeated.includes(levels[i].boss.id)||!levels[i].sigils.every(x=>b.flags.sigils.includes(x.id)))return null;
 if(b.completed){if(b.level!==2||!b.ending||!levels.every(l=>b.flags.defeated.includes(l.boss.id)&&l.sigils.every(x=>b.flags.sigils.includes(x.id))))return null;}else if(raw.ending!==null&&raw.ending!==undefined)return null;
 return b;
}
// Only certified anchors are accepted; positions never come from save input.
function requirementMet(req,chapter,base,levels){
 if(Array.isArray(req))return req.length<=256&&req.every(r=>{
  if(!keys(r,['category','id'])||!id(r.id))return false;
  if(FACTS.includes(r.category))return chapter[r.category].includes(r.id);
  if(r.category==='scenes')return chapter.discovered.includes(r.id);
  if(r.category==='campaign')return r.id==='completed'&&base.completed;
  if(r.category==='campaignDefeated')return base.flags.defeated.includes(r.id);
  if(r.category==='campaignRunes')return base.flags.runes.includes(r.id);
  if(r.category==='ability'){
   const i=['rootbinding','cinderseal','dawnstep'].indexOf(r.id),l=levels[i];
   return !!l&&base.flags.defeated.includes(l.boss.id)&&l.sigils.every(x=>base.flags.runes.includes(x.id))&&(i!==2||base.completed);
  }
  return false;
 });
 if(!obj(req))return false;
 for(const [k,values] of Object.entries(req)){
  if(k==='completed'){if(typeof values!=='boolean'||base.completed!==values)return false;}
  else if(FACTS.includes(k)){if(!Array.isArray(values)||values.some(x=>!chapter[k].includes(x)))return false;}
  else if(k==='seen'){if(!Array.isArray(values)||values.some(x=>!base.flags.seen.includes(x)))return false;}
  else if(k==='runes'||k==='sigils'||k==='campaignDefeated'){const f=k==='campaignDefeated'?'defeated':k;if(!Array.isArray(values)||values.some(x=>!base.flags[f].includes(x)))return false;}
  else return false;
 }
 return true;
}
function sceneAllowed(sceneId,base,levels,data){
 const main=MAIN.indexOf(sceneId),room=data?.rooms?.[sceneId];
 const realm=main>=0?levels[main]?.id:room?.realmId;
 return !!realm&&base.flags.seen.includes(realm)&&(sceneId!=='ch1:room:star-archive'||base.completed);
}
function entries(table){return Array.isArray(table)?table:Object.values(table||{});}
function normalizeChapter(raw,base,levels){try{
 base=normalizeBase(base,levels);if(!base)return null;
 if(!keys(raw,[...FACTS,'active','complete','anchor','stats'])||typeof raw.active!=='boolean'||typeof raw.complete!=='boolean'||!keys(raw.stats,['time','kills','deaths'])||!number(raw.stats.time,10000000)||!number(raw.stats.kills,10000000,true)||!number(raw.stats.deaths,10000000,true))return null;
 const r=roster(),c={active:raw.active,complete:raw.complete};
 for(const k of FACTS){const a=raw[k];if(!Array.isArray(a)||a.length>(r?r.facts[k].length:0)||a.some(x=>!id(x)||!r?.facts[k].includes(x)))return null;c[k]=[...new Set(a)].sort();}
 c.anchor=null;c.stats={time:raw.stats.time,kills:raw.stats.kills,deaths:raw.stats.deaths};
 if(c.complete&&(!c.active||!base.completed))return null;
 for(let i=0;i<MAIN.length;i++)if(c.discovered.includes(MAIN[i])&&!base.flags.seen.includes(levels[i].id))return null;
 // Optional data-level dependency maps certify dormant as well as current IDs.
 if(r){for(const k of FACTS)for(const fact of c[k]){
  const authored=r.data[k]?.[fact],req=r.data.requirements?.[k]?.[fact]||authored?.requirements;
  if(k==='discovered'&&r.data.rooms&&!sceneAllowed(fact,base,levels,r.data))return null;
  if(authored){if(authored.id!==fact||!c.discovered.includes(authored.sceneId)||!sceneAllowed(authored.sceneId,base,levels,r.data))return null;}
  if(req&&!requirementMet(req,c,base,levels))return null;
 }}
 if(raw.anchor!==null){if(!keys(raw.anchor,['sceneId','anchorId'])||!id(raw.anchor.sceneId)||!id(raw.anchor.anchorId)||!c.discovered.includes(raw.anchor.sceneId))return null;
  const a=entries(r?.data.anchors).find(x=>x.sceneId===raw.anchor.sceneId&&(x.anchorId||x.id)===raw.anchor.anchorId);
  if(!a||a.safe!==true||!requirementMet(a.requires||a.requirements||{},c,base,levels)||r.data.rooms&&(!sceneAllowed(a.sceneId,base,levels,r.data)||typeof r.data.safeAnchor!=='function'||!r.data.safeAnchor(a,levels)))return null;c.anchor={sceneId:raw.anchor.sceneId,anchorId:raw.anchor.anchorId};
 }
 if(r?.data.completeRequires&&c.complete&&!requirementMet(r.data.completeRequires,c,base,levels))return null;
 if(r?.data.interactions&&c.complete){const finish=entries(r.data.interactions).find(x=>x.effect==='complete-chapter');if(!finish||!requirementMet(finish.requirements,c,base,levels))return null;}
 return c;
 }catch(_){return null;}}
function normalizePayload(raw,levels){const d=decode(raw);if(d.error)return null;const p=d.value;if(!keys(p,['campaignId','base','chapter'])||p.campaignId!==CAMPAIGN)return null;const b=normalizeBase(p.base,levels);if(!b)return null;const c=normalizeChapter(p.chapter,b,levels);return c?{campaignId:CAMPAIGN,base:b,chapter:c}:null;}
function migrateV3(raw,levels){const d=decode(raw);if(d.error)return null;const b=normalizeBase(d.value,levels);return b?{campaignId:CAMPAIGN,base:b,chapter:blankChapter()}:null;}
function parseEnvelope(raw,levels){const d=decode(raw);if(d.error)return null;const e=d.value;if(!keys(e,['game','version','current','previous','revision'])||e.game!=='emberwake'||e.version!==4||!number(e.revision,Number.MAX_SAFE_INTEGER,true)||e.revision<1)return null;const current=normalizePayload(e.current,levels);const previous=e.previous===null?null:normalizePayload(e.previous,levels);return current&&(e.previous===null||previous)?{game:'emberwake',version:4,current,previous,revision:e.revision}:null;}
function createEnvelope(payload,prior,levels){const p=normalizePayload(payload,levels);if(!p)return null;const old=prior===null?null:parseEnvelope(prior,levels);if(prior!==null&&!old)return null;if(old&&JSON.stringify(p)===JSON.stringify(old.current))return old;if(old?.revision===Number.MAX_SAFE_INTEGER)return null;const e={game:'emberwake',version:4,current:p,previous:old?old.current:null,revision:old?old.revision+1:1};return decode(e).error?null:e;}
function read(storage,levels){let raw;try{raw=storage.getItem(KEY);}catch(_){return fail('storage','Browser storage cannot be read.');}if(raw===null)return {ok:true,envelope:null};const d=decode(raw);if(d.error)return fail(d.code,d.error);if(d.value?.version>4)return fail('future-version','This save uses an unsupported future version.');const e=parseEnvelope(d.value,levels);if(e)return {ok:true,envelope:e};
 const v=d.value;let recovery=null;if(keys(v,['game','version','current','previous','revision'])&&v.game==='emberwake'&&v.version===4&&number(v.revision,Number.MAX_SAFE_INTEGER,true)&&v.revision>=1)recovery=normalizePayload(v.previous,levels);
 return {...fail('invalid','Chapter envelope validation failed. No save was replaced.'),recovery,recoveryToken:recovery?raw:null};}
// Called only after a human confirmation. Exact raw bytes bind that confirmation
// to the observed corrupt envelope; a competing write invalidates recovery.
function recoverPrevious(storage,levels,token){
 if(typeof token!=='string'||bytes(token)>MAX_BYTES)return fail('recovery','A validated recovery confirmation is required.');
 let actual;try{actual=storage.getItem(KEY);}catch(_){return fail('storage','Browser storage cannot be read.');}
 if(actual!==token)return fail('conflict','Stored journey changed after recovery was offered.');
 const observed=read(storage,levels);if(observed.ok||observed.code!=='invalid'||!observed.recovery||observed.recoveryToken!==token)return fail('recovery','No validated previous journey is available for this confirmation.');
 const d=decode(token),revision=d.value?.revision;if(!number(revision,Number.MAX_SAFE_INTEGER,true)||revision===Number.MAX_SAFE_INTEGER)return fail('revision','Recovery revision cannot be advanced.');
 const envelope={game:'emberwake',version:4,current:observed.recovery,previous:null,revision:revision+1};if(!parseEnvelope(envelope,levels))return fail('invalid','Recovery could not be validated.');
 try{storage.setItem(KEY,JSON.stringify(envelope));}catch(_){return fail('storage','Recovery could not be written. Stored data remains unchanged.');}
 return {ok:true,envelope};
}
function write(storage,payload,levels,expectedRevision){if(!number(expectedRevision,Number.MAX_SAFE_INTEGER,true))return fail('revision','An explicit expected revision is required (0 for an absent key).');const before=read(storage,levels);if(!before.ok)return before;const actual=before.envelope?.revision||0;if(actual!==expectedRevision)return fail('conflict','Stored journey revision changed. Reload or export before replacing it.');const envelope=createEnvelope(payload,before.envelope,levels);if(!envelope)return fail('invalid','Journey validation or envelope budget failed.');try{storage.setItem(KEY,JSON.stringify(envelope));}catch(_){return fail('storage','Browser storage write failed. Keep the live journey and export it.');}return {ok:true,envelope};}
function prepareDelivery(payload,deliveryId,levels){const p=normalizePayload(payload,levels);if(!p)return fail('invalid','Journey validation failed.');const r=roster(),delivery=entries(r?.data.deliveries).find(x=>x.id===deliveryId),reward=typeof delivery?.reward==='number'?delivery.reward:delivery?.reward?.gold;const rewards={'ch1:delivery:water-remembers':60,'ch1:delivery:summer-coal':80,'ch1:delivery:charter':0};if(!delivery||!own(rewards,deliveryId)||reward!==rewards[deliveryId])return fail('delivery','Unknown delivery.');if(p.chapter.deliveries.includes(deliveryId))return {ok:true,payload:p,reward:0};if(!requirementMet(delivery.requires||delivery.requirements||{},p.chapter,p.base,levels))return fail('prerequisite','Delivery requirements are not met.');if(p.base.gold+reward>999999)return fail('overflow','Delivery reward would exceed the gold budget.');p.chapter.deliveries.push(deliveryId);p.base.gold+=reward;const candidate=normalizePayload(p,levels);return candidate?{ok:true,payload:candidate,reward}:fail('invalid','Delivery candidate validation failed.');}
// The delivery helper cannot rewind existing delivery facts with a stale live
// candidate. Intentional old-file replacement belongs to the ordinary write API.
function writeDelivery(storage,payload,deliveryId,levels,expectedRevision){
 const live=normalizePayload(payload,levels);if(!live)return fail('invalid','Journey validation failed.');
 const candidate=prepareDelivery(live,deliveryId,levels);if(!candidate.ok)return candidate;
 const before=read(storage,levels);if(!before.ok)return before;
 if(before.envelope&&before.envelope.current.chapter.deliveries.some(x=>!live.chapter.deliveries.includes(x)))return fail('conflict','Live delivery facts are older than the stored journey.');
 const result=write(storage,candidate.payload,levels,expectedRevision);
 return result.ok?{...result,payload:result.envelope.current,reward:candidate.reward}:result;
}
EW.ChapterSave=Object.freeze({KEY,MAX_BYTES,CAMPAIGN,blankChapter,normalizeChapter,normalizePayload,parseEnvelope,migrateV3,createEnvelope,read,write,recoverPrevious,prepareDelivery,writeDelivery});
if(typeof module!=='undefined'&&module.exports)module.exports=EW.ChapterSave;
})(typeof window!=='undefined'?window:globalThis);
