/* EMBERWAKE 1.1 — simulation hardening and precision guard. Original code. */
(function(root){'use strict';
const EW=root.EW;if(!EW||EW.features?.precisionGuard)return;
const G=EW.Game.prototype,baseValidate=EW.validateSave;
function validate(raw,levels){
 if(typeof raw==='string'&&raw.length>150000)return null;
 let source;try{source=typeof raw==='string'?JSON.parse(raw):raw;}catch(_){return null;}
 const s=baseValidate(source,levels);if(!s||typeof source.completed!=='boolean')return null;
 const sets={chests:new Set(levels.flatMap(l=>l.chests.map(o=>o.id))),runes:new Set(levels.flatMap(l=>l.sigils.map(o=>o.id))),sigils:new Set(levels.flatMap(l=>l.sigils.map(o=>o.id))),defeated:new Set(levels.flatMap(l=>[...l.enemies,l.boss].map(o=>o.id))),seen:new Set(levels.map(l=>l.id))};
 for(const k of Object.keys(sets))if(source.flags[k].some(id=>!sets[k].has(id)))return null;
 if(s.flags.sigils.some(id=>!s.flags.runes.includes(id))||!s.flags.seen.includes(levels[s.level].id))return null;
 if(!Number.isInteger(source.gold)||!Number.isInteger(source.stats.kills)||!Number.isInteger(source.stats.deaths))return null;
 const furthest=Math.max(s.level,...s.flags.seen.map(id=>levels.findIndex(l=>l.id===id)));
 for(let i=0;i<furthest;i++){const l=levels[i];if(!s.flags.defeated.includes(l.boss.id)||!l.sigils.every(o=>s.flags.sigils.includes(o.id)))return null;}
 if(s.completed){if(s.level!==levels.length-1||!s.ending||!levels.every(l=>s.flags.defeated.includes(l.boss.id)&&l.sigils.every(o=>s.flags.sigils.includes(o.id))))return null;}
 else if(source.ending!==null&&source.ending!==undefined)return null;
 return s;
}
EW.validateSave=validate;
EW.Save.read=function(storage,key,levels){if(!storage)return null;for(const k of [key,key+'.backup']){try{const s=validate(storage.getItem(k),levels);if(s)return s;}catch(_){}}return null;};
EW.Save.write=function(storage,key,value,levels){try{const s=validate(value,levels);if(!s)return{ok:false,error:'Journey consistency validation failed.'};if(!storage)return{ok:false,error:'Browser storage is unavailable. Export your journey before closing.'};const previous=storage.getItem(key);const old=validate(previous,levels);if(old&&JSON.stringify(old)!==JSON.stringify(s))storage.setItem(key+'.backup',previous);storage.setItem(key,JSON.stringify(s));return{ok:true};}catch(_){return{ok:false,error:'Browser storage is unavailable. Export your journey before closing.'};}};
const resume=G.resume;G.resume=function(raw){const s=validate(raw,this.levels);return s?resume.call(this,s):false;};
const load=G.loadLevel;G.loadLevel=function(index,cp){if(!Number.isInteger(index)||index<0||index>=this.levels.length||!this.progress)return false;load.call(this,index,cp);this.p.parry=0;this.p.parryCD=0;this.p.guardFlash=0;this._fallVitals=null;return true;};
// Player-authorized travel is separate from internal level transitions.
G.canTravel=function(index,cpID){if(this.status!=='playing'||!this.progress||this.progress.completed||this.progress.mode!=='story'||this.bossActive||!Number.isInteger(index)||!this.levels[index])return false;const l=this.levels[index];if(!this.has('seen',l.id))return false;return cpID===undefined||l.checkpoints.some(c=>c.id===cpID);};
G.travel=function(index,cpID){if(!this.canTravel(index,cpID))return false;return this.loadLevel(index,cpID)!==false;};
const finish=G.finish;G.finish=function(choice){if(this.status!=='playing'||this.progress.level!==this.levels.length-1||this.sigilCount!==2||!this.levels.every(l=>this.has('defeated',l.boss.id)&&l.sigils.every(o=>this.has('runes',o.id)&&this.has('sigils',o.id))))return false;finish.call(this,choice);return this.status==='won';};
const respawn=G.respawn;G.respawn=function(countDeath=false){const v=this._fallVitals;this._fallVitals=null;respawn.call(this,countDeath);if(v){this.p.hp=Math.min(v.hp,this.maxHP);this.p.mp=Math.min(v.mp,this.maxMP);this.p.flasks=v.flasks;this.p.inv=.85;this.emit('note',{text:'The beacon catches you. Lost vitality stays lost; rest to recover.'});}};
function guarded(game,x){return game.p.parry>0&&game.p.face*(x-(game.p.x+14))>=-12;}
function reward(game,x,y){const p=game.p;p.parry=0;p.guardFlash=.25;p.inv=Math.max(p.inv,.26);p.mp=Math.min(game.maxMP,p.mp+14);for(const e of game.enemies)if(e.hp>0&&Math.abs(e.x-p.x)<155)e.stun=.55;if(game.bossActive&&game.boss&&Math.abs(game.boss.x+48-p.x-14)<175){game.boss.state='recover';game.boss.t=.8;game.boss.stun=.12;}game.emit('parry',{x:x??p.x+14,y:y??p.y+25});}
const hurt=G.hurt;G.hurt=function(n,x,fall=false){if(this.status==='playing'&&!fall&&guarded(this,x)){reward(this);return;}hurt.call(this,n,x,fall);if(fall&&this.status==='playing')this._fallVitals={hp:this.p.hp,mp:this.p.mp,flasks:this.p.flasks};};
const enemyUpdate=G.updateEnemy;G.updateEnemy=function(e,dt){if(e.stun>0){e.stun=Math.max(0,e.stun-dt);e.flash=Math.max(0,e.flash-dt);return;}enemyUpdate.call(this,e,dt);};
const bossUpdate=G.updateBoss;G.updateBoss=function(dt){const e=this.boss;if(e?.stun>0){e.stun=Math.max(0,e.stun-dt);return;}bossUpdate.call(this,dt);if(e&&this.bossActive)e.x=EW.clamp(e.x,e.arena[0]+8,e.arena[1]-e.w-8);};
const nearby=G.findNearby;G.findNearby=function(){const n=nearby.call(this);if(n)return n;if(!this.bossActive){const cp=this.current.checkpoints.find(o=>Math.abs(this.p.x+14-o.x)<50&&Math.abs(this.p.y+54-o.y)<65);if(cp)return{type:'beacon',item:cp,label:'E · Rest at '+cp.name};}return null;};
const interact=G.interact;G.interact=function(){if(this.status!=='playing')return;const n=this.findNearby();if(n?.type==='beacon'){this.progress.checkpoint=n.item.id;this.p.hp=this.maxHP;this.p.mp=this.maxMP;this.p.flasks=3;this.emit('checkpoint',{name:n.item.name,x:n.item.x,y:n.item.y-30});this.emit('save');return;}interact.call(this);};
const step=G.step;G.step=function(dt,input={}){if(!Number.isFinite(dt)||dt<=0||dt>1)return;if(this.status==='playing'&&this.p&&Number.isFinite(dt)&&dt>0){const h=Math.min(dt,1/60),p=this.p;p.parry=Math.max(0,(p.parry||0)-h);p.parryCD=Math.max(0,(p.parryCD||0)-h);p.guardFlash=Math.max(0,(p.guardFlash||0)-h);if(input.dashPressed&&p.dashCD===0){p.parry=0;p.attack=0;input={...input,attackPressed:false,parryPressed:false};}if(input.parryPressed&&p.parryCD===0&&p.dash<=0){if(input.axis)p.face=input.axis<0?-1:1;p.parry=.19;p.parryCD=.62;p.attack=0;input={...input,attackPressed:false};this.emit('guard',{x:p.x+14,y:p.y+27});}if(p.parry>0){for(const s of this.shots){if(s.owner!=='enemy'||s.life<=0)continue;const dx=s.x+s.vx*h-p.x-14,dy=s.y+s.vy*h-p.y-27;if(Math.abs(dx)<48&&Math.abs(dy)<40&&guarded(this,s.x)){s.owner='hero';s.vx=p.face*740;s.vy=0;s.life=1.3;s.dmg=28+this.progress.upgrades.focus*7;s.reflected=true;reward(this,s.x,s.y);break;}}}}step.call(this,dt,input);};
EW.version='1.1.0-rc.3';EW.features={precisionGuard:true,strictJourneyValidation:true,explicitBeaconRest:true,preservedFallDamage:true};root.EW_V11=true;if(typeof module!=='undefined'&&module.exports)module.exports=EW;
})(typeof window!=='undefined'?window:globalThis);
