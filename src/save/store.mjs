import {ROOMS} from '../content/world.mjs';
import {newProgress} from '../sim/game.mjs';
const keys=['bolt','bomb','double','frost','dash','phase'];
export function validate(value){if(typeof value!=='object'||!value||Array.isArray(value))throw Error('Save must be an object.');let p=value.progress||value;if(p.version!==2)throw Error('Unsupported save version.');const clean=newProgress();
 for(const k of ['room','level','xp','points','vitality','might','arcana','glimmer','sword','armor','flasks','shards']){if(!Number.isInteger(p[k])||p[k]<0||p[k]>(['sword','armor','flasks'].includes(k)?3:k==='shards'?6:k==='room'?ROOMS.length-1:100000))throw Error('Invalid '+k);clean[k]=p[k];}if(p.level<1||p.level>100||['vitality','might','arcana','points'].some(k=>p[k]>100))throw Error('Invalid character progression.');
 if(!p.checkpoint||!Number.isInteger(p.checkpoint.room)||!ROOMS[p.checkpoint.room]||typeof p.checkpoint.x!=='number'||!Number.isFinite(p.checkpoint.x)||p.checkpoint.x<0||p.checkpoint.x>ROOMS[p.checkpoint.room].width)throw Error('Invalid checkpoint.');clean.checkpoint={room:p.checkpoint.room,x:p.checkpoint.x};
 const allowed={abilities:keys,defeated:ROOMS.flatMap(r=>r.enemies.map(e=>e.id)),collected:ROOMS.flatMap(r=>r.caches.map(c=>c.id)),gates:ROOMS.filter(r=>r.gate).map(r=>r.id),visited:ROOMS.map((_,i)=>i)};
 for(const k of Object.keys(allowed)){if(!Array.isArray(p[k])||p[k].length>100||p[k].some(v=>!allowed[k].includes(v)))throw Error('Unknown '+k+' value.');clean[k]=[...new Set(p[k])];}
 if(!clean.abilities.includes('bolt')||!clean.visited.includes(clean.room))throw Error('Incomplete save.');if(![null,'share','bind'].includes(p.ending))throw Error('Invalid ending.');if(p.ending&&!clean.defeated.includes('hollow-2-boss'))throw Error('Ending without final victory.');clean.ending=p.ending;if(typeof p.playTime!=='number'||!Number.isFinite(p.playTime)||p.playTime<0||p.playTime>1e9)throw Error('Invalid play time.');clean.playTime=p.playTime;return clean;
}
export class Saves{
 constructor(storage,onError=()=>{}){this.storage=storage;this.onError=onError;}
 key(slot){if(![1,2,3].includes(slot))throw Error('Invalid slot');return 'LUMEN_V2_SLOT_'+slot;}
 read(slot,backup=false){try{let text=this.storage.getItem(this.key(slot)+(backup?'_BACKUP':''));if(!text)return null;return validate(JSON.parse(text));}catch(e){this.onError('Save unavailable: '+e.message);throw e;}}
 write(slot,p){try{const clean=validate(p),key=this.key(slot),old=this.storage.getItem(key);if(old){try{validate(JSON.parse(old));this.storage.setItem(key+'_BACKUP',old);}catch{ /* Never overwrite a valid backup with corrupted data. */ }}this.storage.setItem(key,JSON.stringify({version:2,savedAt:new Date().toISOString(),progress:clean}));return true;}catch(e){this.onError('Could not save. Export your journey before closing. '+e.message);return false;}}
 export(p){return JSON.stringify({game:'Lumenblade',version:2,progress:validate(p)},null,2)}
 import(text){if(typeof text!=='string'||text.length>100000)throw Error('Save file too large.');return validate(JSON.parse(text));}
}
