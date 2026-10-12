import {ROOMS,BIOMES,ENEMIES,SPELLS} from '../content/world.mjs';
export const STEP=1/60;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const has=(g,a)=>g.progress.abilities.includes(a);
export function newProgress(){return {version:2,room:0,checkpoint:{room:0,x:5},level:1,xp:0,points:0,vitality:0,might:0,arcana:0,glimmer:0,sword:0,armor:0,flasks:3,shards:0,abilities:['bolt'],defeated:[],collected:[],gates:[],visited:[0],ending:null,playTime:0};}
export function maxHP(p){return 100+p.vitality*20}
export function maxMP(p){return 100+p.arcana*20}
export function threshold(p){return Math.floor(20*p.level**1.6+30)}
export class Game{
 constructor(progress=newProgress()){this.progress=structuredClone(progress);this.events=[];this.time=0;this.projectiles=[];this.effects=[];this.hitStop=0;this.p={x:5,y:0,vx:0,vy:0,facing:1,hp:maxHP(progress),mp:maxMP(progress),grounded:true,jumps:0,coyote:.1,buffer:0,invuln:0,flash:0,dash:0,dashCD:0,attackCD:0,swing:0,combo:0,comboAge:0,charge:0,phase:0,pogo:false};this.load(progress.room,progress.checkpoint.room===progress.room?progress.checkpoint.x:3,false);}
 emit(type,data={}){this.events.push({type,...data})}
 load(index,x=3,announce=true){this.progress.room=clamp(index,0,ROOMS.length-1);this.room=ROOMS[this.progress.room];if(!this.progress.visited.includes(index))this.progress.visited.push(index);this.enemies=this.room.enemies.filter(e=>!this.progress.defeated.includes(e.id)).map(e=>({...e,...ENEMIES[e.type],maxHP:ENEMIES[e.type].hp+e.tier*(e.type==='boss'?18:6),hp:ENEMIES[e.type].hp+e.tier*(e.type==='boss'?18:6),baseY:e.y,state:'idle',timer:.9,freeze:0,invuln:0,phase:1}));this.projectiles=[];this.effects=[];this.barrierTimer=0;Object.assign(this.p,{x,y:0,vx:0,vy:0,grounded:true,jumps:0,invuln:1,flash:0,swing:0,attackCD:0,dash:0,phase:0,charge:0,pogo:false});if(announce){this.emit('room');this.emit('save')};}
 get bossActive(){return this.enemies.some(e=>e.type==='boss'&&e.hp>0)}
 get solids(){let a=[...this.room.solids,...this.room.platforms.map(o=>({...o,oneWay:true}))];let g=this.room.gate;if(g&&!this.progress.gates.includes(this.room.id)&&this.p.phase<=0){if(g.type==='frost'&&this.barrierTimer>0)a.push({x:g.x,y:0,w:1.3,h:.45,oneWay:true});else a.push({x:g.x,y:0,w:1.3,h:5});}return a;}
 move(p,dt){const hw=.3,h=1.35,solids=this.solids,oldX=p.x,oldY=p.y;
 p.x+=p.vx*dt;for(const o of solids){if(o.oneWay)continue;if(p.y<o.y+o.h-.02&&p.y+h>o.y+.02&&p.x+hw>o.x&&p.x-hw<o.x+o.w){p.x=p.vx>0?o.x-hw:o.x+o.w+hw;p.vx=0;}}
 p.y+=p.vy*dt;p.grounded=false;for(const o of solids){if(p.x+hw<=o.x||p.x-hw>=o.x+o.w)continue;let top=o.y+o.h;if(p.vy<=0&&oldY>=top-.05&&p.y<=top){p.y=top;p.vy=0;p.grounded=true;p.jumps=0;p.pogo=false;}else if(!o.oneWay&&p.vy>0&&oldY+h<=o.y+.05&&p.y+h>=o.y){p.y=o.y-h;p.vy=0;}}
 if(!Number.isFinite(p.x+p.y)){p.x=oldX;p.y=oldY;p.vx=p.vy=0;}
 }
 hurt(amount,dir=0){if(this.p.invuln>0||this.p.phase>0||this.p.dash>0)return;this.p.hp=Math.max(0,this.p.hp-Math.max(1,amount*(1-this.progress.armor*.18)));this.p.invuln=1;this.p.flash=.6;this.p.vx=dir*5;this.emit('hurt');if(this.p.hp<=0)this.emit('death');}
 hit(e,amount){if(e.hp<=0||e.invuln>0)return;e.hp=Math.max(0,e.hp-amount);e.invuln=.15;this.hitStop=.045;this.emit('hit',{x:e.x,y:e.y+1});if(e.hp===0){this.progress.defeated.push(e.id);this.progress.glimmer+=e.type==='boss'?85:8+e.tier*2;this.progress.xp+=e.xp;while(this.progress.xp>=threshold(this.progress)){this.progress.xp-=threshold(this.progress);this.progress.level++;this.progress.points++;this.emit('level');}if(e.type==='boss'){const b=BIOMES[this.room.biome];if(b.reward==='ending'){this.emit('endingChoice');}else{this.progress.shards++;if(!['shard','ending'].includes(b.reward))this.progress.abilities.push(b.reward);this.p.hp=maxHP(this.progress);this.p.mp=maxMP(this.progress);this.emit('guardian',{name:b.boss,reward:b.reward,quote:b.quote});}this.emit('save');}}
 }
 sword(spin=false){let p=this.p;p.combo=p.comboAge<.6?(p.combo%3)+1:1;p.comboAge=0;p.swing=.22;p.attackCD=spin?.65:.26;this.emit('sword');let damage=(11+this.progress.might*4+this.progress.sword*5)*(spin?2:p.combo===3?1.5:1);for(const e of this.enemies){if(e.hp>0&&Math.abs(e.y-p.y)<2.3&&(spin?Math.abs(e.x-p.x)<3:((e.x-p.x)*p.facing>-.4&&(e.x-p.x)*p.facing<2.5))){this.hit(e,damage);if(p.pogo){p.vy=12;p.pogo=false;}}}for(const q of this.projectiles){if(q.owner==='enemy'&&Math.abs(q.x-p.x)<2.6&&Math.abs(q.y-(p.y+.8))<2){q.owner='player';q.vx=-q.vx*1.3;q.damage=25;this.emit('reflect');}}
 }
 cast(index){const spell=SPELLS[index];if(!has(this,spell.id)||this.p.mp<spell.cost)return false;this.p.mp-=spell.cost;this.emit('cast',{spell:spell.id});if(spell.id==='phase'){this.p.phase=4;return true;}this.projectiles.push({x:this.p.x+this.p.facing*.5,y:this.p.y+.85,vx:this.p.facing*(spell.id==='bomb'?8:14),vy:spell.id==='bomb'?4:0,life:spell.id==='bomb'?.7:2,owner:'player',type:spell.id,damage:spell.id==='bomb'?34:spell.id==='frost'?12:18+this.progress.arcana*3});return true;}
 explode(q){this.emit('burst',{x:q.x,y:q.y,color:q.type});for(const e of this.enemies){if(e.hp>0&&Math.hypot(e.x-q.x,e.y+1-q.y)<(q.type==='bomb'?3:1.5)){if(q.type==='frost')e.freeze=3;this.hit(e,q.damage);}}
 const gate=this.room.gate;if(gate&&gate.type===q.type&&Math.abs(gate.x+.5-q.x)<(q.type==='bomb'?4:2)){if(q.type==='frost')this.barrierTimer=8;else if(!this.progress.gates.includes(this.room.id)){this.progress.gates.push(this.room.id);this.emit('save');}this.emit('gate');}}
 interact(){let p=this.p,r=this.room;if(r.shrine!==null&&Math.abs(p.x-r.shrine)<2.5){this.progress.checkpoint={room:this.progress.room,x:r.shrine};p.hp=maxHP(this.progress);p.mp=maxMP(this.progress);this.progress.flasks=3;this.emit('shrine');this.emit('save');return;}if(r.npc&&Math.abs(p.x-r.npc)<2.5){this.emit('dialogue');return;}this.emit('hint',{text:'Find a shrine to rest, or speak to Sela in Thistlebrook.'});}
 heal(){if(this.progress.flasks>0&&this.p.hp<maxHP(this.progress)){this.progress.flasks--;this.p.hp=Math.min(maxHP(this.progress),this.p.hp+60);this.emit('heal');this.emit('save');}}
 respawn(){const c=this.progress.checkpoint;this.load(c.room,c.x);this.p.hp=maxHP(this.progress);this.p.mp=maxMP(this.progress);this.emit('respawn');}
 upgrade(kind){if(!['vitality','might','arcana'].includes(kind)||this.progress.points<=0)return false;this.progress[kind]++;this.progress.points--;this.p.hp=maxHP(this.progress);this.p.mp=maxMP(this.progress);this.emit('save');return true;}
 buy(kind){const p=this.progress;if(kind==='sword'&&p.sword<3){let cost=75*(p.sword+1);if(p.glimmer<cost)return false;p.glimmer-=cost;p.sword++;}else if(kind==='armor'&&p.armor<3){let cost=60*(p.armor+1);if(p.glimmer<cost)return false;p.glimmer-=cost;p.armor++;}else return false;this.emit('save');return true;}
 travel(i){if(!this.progress.visited.includes(i)||this.bossActive)return false;this.load(i,ROOMS[i].shrine??3);return true;}
 finish(ending){if(!['share','bind'].includes(ending)||!this.progress.defeated.includes('hollow-2-boss'))return false;this.progress.ending=ending;this.emit('save');return true;}
 update(dt,input={}){if(this.p.hp<=0)return;if(this.hitStop>0){this.hitStop-=dt;return;}this.time+=dt;this.progress.playTime+=dt;const p=this.p;p.mp=Math.min(maxMP(this.progress),p.mp+13*dt);for(const k of ['invuln','flash','dash','dashCD','attackCD','swing','phase'])p[k]=Math.max(0,p[k]-dt);p.comboAge+=dt;this.barrierTimer=Math.max(0,this.barrierTimer-dt);
 if(input.jump)p.buffer=.12;else p.buffer=Math.max(0,p.buffer-dt);p.coyote=p.grounded?.1:Math.max(0,p.coyote-dt);
 if(p.buffer>0&&(p.coyote>0||(has(this,'double')&&p.jumps<2))){p.vy=14.5;p.jumps=p.coyote>0?1:2;p.grounded=false;p.buffer=0;p.coyote=0;this.emit('jump');}
 if(!input.jumpHeld&&p.vy>6)p.vy-=42*dt;
 if(input.dash&&has(this,'dash')&&p.dashCD===0){p.dash=.18;p.dashCD=.7;this.emit('dash');}
 const move=clamp(input.move||0,-1,1);if(move)p.facing=Math.sign(move);if(p.dash>0){p.vx=p.facing*18;p.vy=0;}else{let target=move*7.5;p.vx+=(target-p.vx)*Math.min(1,dt*(p.grounded?24:12));p.vy=Math.max(-24,p.vy-42*dt);}
 if(input.attack&&p.attackCD===0){if(input.down&&!p.grounded){p.pogo=true;p.vy=-18;}this.sword();}if(input.attackHeld)p.charge+=dt;else{if(p.charge>.7&&p.attackCD===0)this.sword(true);p.charge=0;}
 if(input.cast!==undefined&&input.cast!==null)this.cast(input.cast);if(input.interact)this.interact();if(input.heal)this.heal();this.move(p,dt);
 for(const c of this.room.caches)if(!this.progress.collected.includes(c.id)&&Math.hypot(c.x-p.x,c.y-p.y)<1.2){this.progress.collected.push(c.id);this.progress.glimmer+=c.value;this.emit('cache',{value:c.value});this.emit('save');}
 for(const e of this.enemies){if(e.hp<=0)continue;e.invuln=Math.max(0,e.invuln-dt);e.freeze=Math.max(0,e.freeze-dt);if(e.freeze>0)continue;const d=p.x-e.x,near=Math.abs(d);e.timer-=dt;e.facing=d>=0?1:-1;
 if(e.type==='boss'){let phase=e.hp<e.maxHP*.33?3:e.hp<e.maxHP*.66?2:1;if(phase!==e.phase){e.phase=phase;this.emit('bossPhase',{phase});}}
 if(e.state==='windup'){if(e.timer<=0){if(e.type==='boss'){
 const fire=(vx,vy=0,y=1,type='shadow',life=3,x=e.x+e.facing)=>this.projectiles.push({x,y:e.y+y,vx,vy,life,owner:'enemy',type,damage:e.damage});
 if(e.tier===0){for(const dir of [-1,1])fire(dir*7,0,.35,'vine');if(near<3&&p.y<1.4)this.hurt(e.damage,Math.sign(d));}
 else if(e.tier===1){for(const dir of [-1,1])fire(dir*(6+e.phase),0,.25,'stone');if(near<3&&p.y<1.6)this.hurt(e.damage+4,Math.sign(d));}
 else if(e.tier===2){for(let j=-1;j<=1;j++)fire(e.facing*6,j*1.8,1.5,'mist');}
 else if(e.tier===3){for(let j=0;j<e.phase+1;j++)fire(e.facing*(7+j),0,.5+j*.6,'ice');}
 else if(e.tier===4){fire(e.facing*5,5,1.8,'enemybomb',1.4);if(e.phase>1)fire(-e.facing*4,6,1.8,'enemybomb',1.5);}
 else if(e.tier===5){fire(0,0,0,'warning',.8,p.x);if(e.phase>1)fire(0,0,0,'warning',1,p.x+3);fire(e.facing*8,0,1,'spark');}
 else {fire(e.facing*(8+e.phase),0,1,'shadow');if(near<3)this.hurt(e.damage+e.phase*3,Math.sign(d));if(e.phase>1)e.x=clamp(e.x+e.facing*1.5,3,this.room.width-3);}
 }else if(e.type==='mage'){this.projectiles.push({x:e.x+e.facing,y:e.y+1,vx:e.facing*7,vy:0,life:3,owner:'enemy',type:'shadow',damage:e.damage});}else if(near<e.range+1.1&&Math.abs(p.y-e.y)<2)this.hurt(e.damage,Math.sign(d));e.state='recover';e.timer=e.type==='boss'?.7:1.1;}}
 else if(e.state==='recover'){if(e.timer<=0){e.state='idle';e.timer=.3;}}
 else if(near<(e.type==='boss'?15:e.range)&&e.timer<=0){e.state='windup';e.timer=e.type==='boss'?.65:.55;this.emit('windup');}
 else if(near<14){e.x=clamp(e.x+Math.sign(d)*e.speed*dt,3,this.room.width-3);if(e.type==='bat')e.y=e.baseY+Math.sin(this.time*2)*.5;}
 if(near<.6&&Math.abs(p.y-e.y)<1.5)this.hurt(e.damage,Math.sign(d));}
 for(const q of this.projectiles){q.life-=dt;q.x+=q.vx*dt;q.y+=(q.vy||0)*dt;if(q.type==='bomb'||q.type==='enemybomb')q.vy-=14*dt;if(q.owner==='enemy'&&q.life<=0&&['warning','enemybomb'].includes(q.type)){if(Math.abs(q.x-p.x)<(q.type==='warning'?1:2.5)&&p.y<3.5)this.hurt(q.damage,Math.sign(p.x-q.x));this.emit('burst',{x:q.x,y:q.y,color:'bomb'});}if(q.type==='warning')continue;
 if(q.owner==='enemy'&&p.swing>0&&Math.abs(q.x-p.x)<2.4&&Math.abs(q.y-p.y-1)<2){q.owner='player';q.vx=-q.vx*1.3;q.damage=25;this.emit('reflect');}
 if(q.owner==='enemy'&&Math.abs(q.x-p.x)<.7&&q.y>p.y&&q.y<p.y+1.4){this.hurt(q.damage,Math.sign(q.vx));q.life=0;}
 if(q.owner==='player'){let hit=this.enemies.find(e=>e.hp>0&&Math.abs(q.x-e.x)<.65&&Math.abs(q.y-e.y-1)<1.2);let gate=this.room.gate&&Math.abs(q.x-this.room.gate.x-.5)<.7;if(hit||gate||q.type==='bomb'&&q.life<=0){this.explode(q);q.life=-1;}}
 }this.projectiles=this.projectiles.filter(q=>q.life>0&&q.x>-3&&q.x<this.room.width+3);
 if(p.y<-8){this.hurt(200);}
 if(p.x>this.room.width-.5){if(this.bossActive){p.x=this.room.width-.6;this.emit('hint',{text:'The guardian holds this passage. Defeat it to restore the path.'});}else if(this.progress.room===18&&this.progress.shards<6){p.x=this.room.width-.6;this.emit('hint',{text:'Hollowgate requires all six Dawn Shards.'});}else if(this.progress.room<ROOMS.length-1)this.load(this.progress.room+1,1);else p.x=this.room.width-.6;}
 if(p.x<.5){if(this.progress.room>0)this.load(this.progress.room-1,ROOMS[this.progress.room-1].width-1);else p.x=.5;}
 }
}
