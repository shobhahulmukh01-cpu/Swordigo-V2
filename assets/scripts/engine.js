/* EMBERWAKE: The Hollow Crown — original game simulation, 2026.
   Dependency-free runtime. Pure state; no DOM, network or credentials. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const Physics={overlaps,step(b,dt,solids=[],input={},opts={}){
 if(!finite(dt,0,1)||dt===0)return b;dt=Math.min(dt,1/60);
 const n=Math.ceil(dt/(1/120)),h=dt/n,speed=opts.speed??300,gravity=opts.gravity??1750,jump=opts.jump??690;
 const axis=clamp(Number(input.axis)||0,-1,1);b.vx??=0;b.vy??=0;b.jumps??=0;b.coyote??=0;b.jumpBuffer??=0;b.face??=1;
 for(let i=0;i<n;i++){
  const was=!!b.grounded;
  if(was){b.coyote=.11;b.jumps=0;}else{b.coyote=Math.max(0,b.coyote-h);if(b.coyote===0)b.jumps=Math.max(1,b.jumps);}
  b.jumpBuffer=i===0&&input.jumpPressed?.13:Math.max(0,b.jumpBuffer-h);
  if(input.drop)b.coyote=b.jumpBuffer=0;
  const on=b.grounded||b.coyote>0;
  if(b.jumpBuffer>0&&(on||(opts.doubleJump!==false&&b.jumps<2))){b.vy=-jump*(input.jumpHeld?1:.45);b.jumps=on?1:b.jumps+1;b.grounded=false;b.coyote=b.jumpBuffer=0;}
  if(!opts.lockX){if(axis)b.face=axis<0?-1:1;const acc=(was?3600:2200)*h;b.vx+=clamp(axis*speed-b.vx,-acc,acc);}
  if(!input.jumpHeld&&b.vy<-jump*.45)b.vy=-jump*.45;
  b.vy=Math.min(b.vy+gravity*h,1000);
  const ox=b.x;b.x+=b.vx*h;
  for(const s of solids){if(s.oneWay||!overlaps(b,s))continue;if(b.vx>0&&ox+b.w<=s.x+.01){b.x=s.x-b.w;b.vx=0;}else if(b.vx<0&&ox>=s.x+s.w-.01){b.x=s.x+s.w;b.vx=0;}}
  b.x=clamp(b.x,0,(opts.maxX??100000)-b.w);
  const oy=b.y,ob=oy+b.h;b.y+=b.vy*h;b.grounded=false;
  const hits=solids.filter(s=>b.x<s.x+s.w&&b.x+b.w>s.x).sort((a,c)=>b.vy>=0?a.y-c.y:c.y+c.h-a.y-a.h);
  for(const s of hits){
   if(b.vy>=0&&ob<=s.y+.05&&b.y+b.h>=s.y&&!(s.oneWay&&input.drop)){b.y=s.y-b.h;b.vy=0;b.grounded=true;b.jumps=0;b.coyote=.11;break;}
   if(!s.oneWay&&b.vy<0&&oy>=s.y+s.h-.05&&b.y<=s.y+s.h){b.y=s.y+s.h;b.vy=0;break;}
  }
 }
 return b;
}};
const TYPES={crawler:{w:42,h:34,hp:40,gold:16,xp:18},sentinel:{w:36,h:58,hp:66,gold:22,xp:26},wisp:{w:34,h:34,hp:34,gold:18,xp:20}};
const blankFlags=()=>({chests:[],runes:[],sigils:[],defeated:[],seen:[]});
const uniq=a=>Array.from(new Set(a));
function validateSave(raw,levels){
 try{
  const s=typeof raw==='string'?(raw.length<150000?JSON.parse(raw):null):raw;if(!s||s.version!==3||!levels?.length)return null;
  if(!finite(s.level,0,levels.length-1)||!Number.isInteger(s.level)||!['story','rush'].includes(s.mode)||!['story','adventure','veteran'].includes(s.difficulty))return null;
  if(!finite(s.gold,0,999999)||!finite(s.xp,0,100000)||!finite(s.rank,1,20)||!Number.isInteger(s.rank))return null;
  const ups={};for(const k of ['blade','heart','focus']){if(!Number.isInteger(s.upgrades?.[k])||!finite(s.upgrades[k],0,3))return null;ups[k]=s.upgrades[k];}
  const ids=new Set(levels.flatMap(l=>[...l.chests,...l.sigils,...l.enemies,l.boss].map(x=>x.id)));
  const flags=blankFlags();for(const k of Object.keys(flags)){if(!Array.isArray(s.flags?.[k])||s.flags[k].length>200||s.flags[k].some(x=>typeof x!=='string'||x.length>80))return null;flags[k]=uniq(s.flags[k].filter(x=>k==='seen'?levels.some(l=>l.id===x):ids.has(x)));}
  const cp=levels[s.level].checkpoints.find(x=>x.id===s.checkpoint)||levels[s.level].checkpoints[0];
  const stats={};for(const k of ['time','kills','deaths']){if(!finite(s.stats?.[k],0,10000000))return null;stats[k]=s.stats[k];}
  const completed=!!s.completed;return {version:3,level:s.level,mode:s.mode,difficulty:s.difficulty,gold:Math.floor(s.gold),xp:s.xp,rank:s.rank,upgrades:ups,flags,checkpoint:cp.id,stats,completed,ending:['mercy','rekindle'].includes(s.ending)?s.ending:null};
 }catch(_){return null;}
}
class Game{
 constructor(levels){this.levels=levels;this.events=[];this.progress=null;this.p=null;this.enemies=[];this.shots=[];this.status='menu';this.clock=0;this.attackID=0;this.near=null;this.bossActive=false;this.deadTimer=0;this.camera=0;}
 emit(type,data={}){this.events.push({type,...data});if(this.events.length>80)this.events.shift();}
 get level(){return this.current;}
 get sigilCount(){return this.current.sigils.filter(s=>this.has('sigils',s.id)).length;}
 has(k,id){return this.progress.flags[k].includes(id);}
 flag(k,id){if(!this.has(k,id))this.progress.flags[k].push(id);}
 get maxHP(){return 100+this.progress.upgrades.heart*30+(this.progress.rank-1)*6;}
 get maxMP(){return 100+this.progress.upgrades.focus*20;}
 newRun(difficulty='adventure',mode='story'){
  this.progress={version:3,level:0,mode,difficulty,gold:0,xp:0,rank:1,upgrades:mode==='rush'?{blade:1,heart:1,focus:1}:{blade:0,heart:0,focus:0},flags:blankFlags(),checkpoint:this.levels[0].checkpoints[0].id,stats:{time:0,kills:0,deaths:0},completed:false,ending:null};this.loadLevel(0);this.emit('intro',{lines:mode==='rush'?['Three hearts. Three guardians. One uninterrupted run.','Your time is recorded locally. All abilities are ready.']:this.current.intro});return this;
 }
 resume(raw){const s=validateSave(raw,this.levels);if(!s)return false;this.progress=s;this.loadLevel(s.level,s.checkpoint);if(s.completed)this.status='won';return true;}
 snapshot(){return JSON.parse(JSON.stringify(this.progress));}
 loadLevel(index,cpID){
  this.progress.level=index;let l=this.levels[index];
  if(this.progress.mode==='rush'){
   l={...l,width:1800,spawn:{x:130,y:590},solids:[{id:'rush-ground',x:0,y:590,w:1800,h:170}],hazards:[],enemies:[],chests:[],npc:null,shrines:[],checkpoints:[{id:l.checkpoints[0].id,x:130,y:590,name:'The Echo Beacon'}],sigils:l.sigils.map((s,i)=>({...s,x:230+i*85,y:590})),exit:{x:1700,y:590},boss:{...l.boss,x:1190,y:450,arena:[500,1640]}};
   l.sigils.forEach(s=>{this.flag('sigils',s.id);this.flag('runes',s.id);});
  }
  this.current=l;this.flag('seen',l.id);const cp=l.checkpoints.find(c=>c.id===cpID)||l.checkpoints[0];this.progress.checkpoint=cp.id;
  this.p={x:cp.x,y:cp.y-54,w:28,h:54,vx:0,vy:0,grounded:true,jumps:0,coyote:.11,jumpBuffer:0,face:1,hp:this.maxHP,mp:this.maxMP,flasks:3,inv:1,attack:0,attackCD:0,spellCD:0,dash:0,dashCD:0,combo:0,comboAge:5,anim:0};
  this.enemies=l.enemies.filter(e=>!this.has('defeated',e.id)).map(e=>({...e,...TYPES[e.type],baseY:e.y,homeX:e.x,face:-1,t:1+(.13*(e.x%9)),state:'patrol',flash:0,hitID:-1,phase:0}));
  if(!this.has('defeated',l.boss.id))this.boss={...l.boss,w:96,h:140,baseY:l.boss.y,maxHp:l.boss.hp,face:-1,t:1.7,state:'idle',flash:0,hitID:-1,phase:0,attackIx:0,isBoss:true};else this.boss=null;
  this.bossActive=false;this.shots=[];this.status='playing';this.clock=0;this.camera=clamp(this.p.x-360,0,l.width-1280);this.near=null;this.emit('realm',{name:l.name,index});this.emit('save');
 }
 getSolids(){
  let ss=this.current.solids;
  const arena=this.current.boss.arena;
  if(this.boss&&this.sigilCount<2)ss=ss.concat([{id:'sigil-gate',x:arena[0],y:100,w:22,h:550}]);
  if(this.bossActive)ss=ss.concat([{id:'arena-back',x:arena[0]-20,y:100,w:20,h:600},{id:'arena-front',x:arena[1],y:100,w:20,h:600}]);
  return ss;
 }
 addXP(n){
  const q=this.progress;q.xp+=n;while(q.xp>=q.rank*65&&q.rank<20){q.xp-=q.rank*65;q.rank++;this.p.hp=Math.min(this.maxHP,this.p.hp+35);this.p.mp=this.maxMP;this.emit('rank',{rank:q.rank});}
 }
 damageEnemy(e,n,kind='sword'){
  if(!e||e.hp<=0)return;e.hp-=n;e.flash=.13;this.emit('hit',{x:e.x+e.w/2,y:e.y+e.h/2,n,kind,boss:!!e.isBoss});
  if(e.hp<=0){e.hp=0;this.flag('defeated',e.id);this.progress.stats.kills++;this.progress.gold+=e.gold??(160+this.progress.level*70);this.addXP(e.xp??110);this.emit('defeat',{x:e.x+e.w/2,y:e.y+e.h/2,boss:!!e.isBoss,gold:e.gold??(160+this.progress.level*70)});
   if(e.isBoss){this.bossActive=false;this.shots=this.shots.filter(s=>s.owner==='hero');this.p.hp=this.maxHP;this.p.mp=this.maxMP;this.p.flasks=3;this.emit('bossVictory',{lines:this.current.victory||['The world-heart remembers its pulse. The gate is open.']});}
   this.emit('save');
  }
 }
 hurt(n,x,fall=false){
  const p=this.p;if(this.status!=='playing'||(!fall&&(p.inv>0||p.dash>0)))return;
  const mul={story:.5,adventure:1,veteran:1.35}[this.progress.difficulty];const dmg=Math.max(1,Math.round(n*mul));p.hp=Math.max(0,p.hp-dmg);p.inv=1;p.vy=-230;if(!p.dash)p.vx=(p.x+14<x?-1:1)*220;
  this.emit('hurt',{n:dmg,x:p.x+14,y:p.y+20});if(p.hp===0){this.status='dead';this.progress.stats.deaths++;this.emit('death');this.emit('save');}
 }
 respawn(countDeath=false){
  if(countDeath)this.progress.stats.deaths++;const cp=this.current.checkpoints.find(c=>c.id===this.progress.checkpoint)||this.current.checkpoints[0];
  const oldTime=this.progress.stats.time;this.loadLevel(this.progress.level,cp.id);this.progress.stats.time=oldTime;this.emit('respawn');
 }
 upgrade(kind){
  if(!['blade','heart','focus'].includes(kind))return {ok:false,reason:'Unknown attunement.'};const level=this.progress.upgrades[kind];if(level>=3)return {ok:false,reason:'Fully attuned.'};
  const cost=[90,160,250][level];if(this.progress.gold<cost)return {ok:false,reason:'Gather more embers.'};this.progress.gold-=cost;this.progress.upgrades[kind]++;this.p.hp=this.maxHP;this.p.mp=this.maxMP;this.emit('upgrade',{kind});this.emit('save');return {ok:true,cost};
 }
 heal(){if(this.p.flasks<=0||this.p.hp>=this.maxHP){this.emit('note',{text:this.p.flasks<=0?'No flasks. Rest at a beacon.':'Your heart is already full.'});return false;}this.p.flasks--;this.p.hp=Math.min(this.maxHP,this.p.hp+this.maxHP*.55);this.emit('heal',{x:this.p.x+14,y:this.p.y+25});return true;}
 cast(){const p=this.p;if(p.spellCD>0)return false;if(p.mp<18){this.emit('note',{text:'Let your lumen recharge.'});return false;}p.mp-=18;p.spellCD=.3;this.shots.push({owner:'hero',x:p.x+14+p.face*22,y:p.y+26,vx:p.face*720,vy:0,r:8,life:1.3,dmg:25+this.progress.upgrades.focus*10+(this.progress.rank-1)*2});this.emit('spell');return true;}
 slash(){
  const p=this.p;if(p.attackCD>0||p.dash>0)return false;p.combo=p.comboAge<.62?(p.combo%3)+1:1;p.comboAge=0;p.attack=.26;p.attackCD=p.combo===3?.34:.22;this.attackID++;this.emit('slash',{combo:p.combo});return true;
 }
 triggerBoss(){if(!this.boss||this.boss.hp<=0||this.bossActive)return;if(this.sigilCount<2){this.emit('note',{text:'Release both world-runes with your lumen bolt.'});return;}this.bossActive=true;this.boss.state='idle';this.boss.t=1.6;this.emit('bossIntro',{name:this.boss.name,lines:this.current.bossIntro||['The guardian wakes. Watch the wind-up. Dash through danger.']});}
 findNearby(){
  const p=this.p,foot=p.y+p.h;const near=(o,r=78)=>o&&Math.abs(p.x+14-o.x)<r&&Math.abs(foot-o.y)<95;
  if(near(this.current.exit,95))return {type:'exit',item:this.current.exit,label:this.boss&&this.boss.hp>0?'The guardian holds this gate':'E · Enter the world-gate'};
  for(const c of this.current.chests)if(!this.has('chests',c.id)&&near(c,65))return {type:'chest',item:c,label:'E · Open forgotten cache'};
  for(const s of this.current.shrines)if(near(s,68))return {type:'shrine',item:s,label:'E · Attune at the shrine'};
  if(near(this.current.npc,72))return {type:'npc',item:this.current.npc,label:'E · Speak to '+this.current.npc.name};
  return null;
 }
 interact(){
  if(this.status!=='playing')return;const n=this.findNearby();if(!n)return;const item=n.item;
  if(n.type==='npc')this.emit('dialogue',{speaker:item.name,lines:item.lines});
  else if(n.type==='shrine')this.emit('shrine');
  else if(n.type==='chest'){this.flag('chests',item.id);this.progress.gold+=item.gold;this.addXP(12);this.emit('chest',{gold:item.gold,x:item.x,y:item.y-25});if(item.lore)this.emit('dialogue',{speaker:'A forgotten letter',lines:[item.lore]});this.emit('save');}
  else if(n.type==='exit'){
   if(this.boss&&this.boss.hp>0){this.emit('note',{text:'The guardian still holds this world-heart.'});return;}
   if(this.progress.level<this.levels.length-1){this.loadLevel(this.progress.level+1);this.emit('intro',{lines:this.current.intro});}
   else if(this.progress.mode==='rush'){this.finish('rekindle');}
   else this.emit('choice');
  }
 }
 finish(choice){if(!['mercy','rekindle'].includes(choice))return;this.progress.completed=true;this.progress.ending=choice;this.status='won';this.emit('ending',{choice,mode:this.progress.mode});this.emit('save');}
 enemyShot(e,x,y,speed=290,r=7,dmg=13){const px=this.p.x+14,py=this.p.y+25,dx=px-x,dy=py-y,len=Math.hypot(dx,dy)||1;this.shots.push({owner:'enemy',x,y,vx:dx/len*speed,vy:dy/len*speed,r,life:4,dmg});}
 updateEnemy(e,dt){
  if(e.hp<=0)return;e.flash=Math.max(0,e.flash-dt);e.t-=dt;const p=this.p,dist=p.x-e.x;
  if(e.type==='wisp'){e.y=e.baseY+Math.sin(this.clock*2+e.x*.01)*20;if(e.state==='windup'&&e.t<=0){this.enemyShot(e,e.x+17,e.y+20,230,7,10);e.state='patrol';e.t=2.1;}else if(e.t<=0){if(Math.abs(dist)<470){e.state='windup';e.t=.7;}else e.t=.6;}return;}
  if(e.state==='windup'){
   if(e.t<=0){if(e.type==='sentinel'){this.enemyShot(e,e.x+18,e.y+25,310,7,14);e.state='patrol';e.t=1.8;}else{e.state='lunge';e.t=.32;}}return;
  }
  if(e.state==='lunge'){e.x+=e.face*210*dt;if(e.t<=0){e.state='patrol';e.t=1;}if(overlaps(p,e))this.hurt(12,e.x+21);}
  else{
   const speed=e.type==='sentinel'?35:54;e.x+=e.face*speed*dt;const patrol=e.patrol||[e.homeX-70,e.homeX+90];
   if(e.x<=patrol[0]){e.x=patrol[0];e.face=1;}if(e.x>=patrol[1]){e.x=patrol[1];e.face=-1;}
   if(e.t<=0&&Math.abs(dist)<(e.type==='sentinel'?470:150)&&Math.abs(p.y-e.y)<95){e.face=dist<0?-1:1;e.state='windup';e.t=e.type==='sentinel'?.72:.5;}
  }
  const patrol=e.patrol||[e.homeX-70,e.homeX+90];e.x=clamp(e.x,patrol[0],patrol[1]);
  if(overlaps(p,e))this.hurt(e.type==='sentinel'?11:8,e.x+e.w/2);
 }
 updateBoss(dt){
  const e=this.boss;if(!e||e.hp<=0||!this.bossActive)return;e.flash=Math.max(0,e.flash-dt);e.t-=dt;e.phase=e.hp<e.maxHp*.45?1:0;
  const p=this.p,arena=e.arena;e.face=p.x+14<e.x+e.w/2?-1:1;
  if(e.state==='idle'){
   const dx=p.x-e.x;if(Math.abs(dx)>135)e.x+=Math.sign(dx)*(45+e.phase*30)*dt;
   if(e.t<=0){e.state='windup';e.t=this.progress.difficulty==='story'?.95:.75;e.target=p.x+14;e.attackIx++;e.move=e.attackIx%2===1?'charge':(e.type==='regent'?'rain':'slam');e.dir=e.face;this.emit('warning',{move:e.move});}
  }else if(e.state==='windup'&&e.t<=0){
   if(e.move==='charge'){e.state='charge';e.t=.65;e.vx=e.dir*(380+e.phase*100);}
   else{
    e.state='recover';e.t=1.2;
    if(e.move==='slam'){
     for(const dir of [-1,1])this.shots.push({owner:'enemy',x:e.x+e.w/2,y:572,vx:dir*(260+e.phase*65),vy:0,r:13,life:2.5,dmg:18,wave:true});
     if(e.phase)this.enemyShot(e,e.x+48,e.y+28,260,8,15);
    }else{for(let i=-1;i<=1;i++)this.enemyShot(e,e.target+i*95,170-Math.abs(i)*24,300+e.phase*40,9,16);}
    this.emit('slam',{x:e.x+48,y:590});
   }
  }else if(e.state==='charge'){
   e.x=clamp(e.x+e.vx*dt,arena[0]+10,arena[1]-e.w-10);if(e.t<=0){e.state='recover';e.t=1.3-e.phase*.2;}
  }else if(e.state==='recover'&&e.t<=0){e.state='idle';e.t=.9-e.phase*.25;}
  if(overlaps(p,e)&&e.state!=='recover')this.hurt(e.state==='charge'?22:13,e.x+48);
 }
 step(dt,input={}){
  if(this.status!=='playing'||!this.p||!finite(dt,0,1))return;dt=Math.min(dt,1/60);if(!dt)return;
  this.clock+=dt;this.progress.stats.time+=dt;const p=this.p;p.anim+=dt;p.inv=Math.max(0,p.inv-dt);p.attack=Math.max(0,p.attack-dt);p.attackCD=Math.max(0,p.attackCD-dt);p.spellCD=Math.max(0,p.spellCD-dt);p.dash=Math.max(0,p.dash-dt);p.dashCD=Math.max(0,p.dashCD-dt);p.comboAge+=dt;p.mp=Math.min(this.maxMP,p.mp+(12+this.progress.upgrades.focus*3)*dt);
  if(input.attackPressed)this.slash();if(input.spellPressed)this.cast();if(input.healPressed)this.heal();
  if(input.dashPressed&&p.dashCD===0){p.dash=.17;p.dashCD=.88;p.inv=Math.max(p.inv,.22);if(input.axis)p.face=input.axis<0?-1:1;p.vx=p.face*850;this.emit('dash',{x:p.x+14,y:p.y+27});}
  const oldY=p.y,oldGround=p.grounded;Physics.step(p,dt,this.getSolids(),input,{speed:300,doubleJump:true,maxX:this.current.width,lockX:p.dash>0,gravity:p.dash>0?220:1750});
  if(p.y<oldY-1&&input.jumpPressed)this.emit('jump',{x:p.x+14,y:p.y+54,air:!oldGround});
  if(!oldGround&&p.grounded)this.emit('land',{x:p.x+14,y:p.y+54});
  if(p.y>790){this.hurt(25,p.x,true);if(this.status==='playing')this.respawn();return;}
  for(const h of this.current.hazards)if(overlaps(p,h)){this.hurt(h.type==='lava'?28:16,h.x+h.w/2);if(h.type==='lava'&&this.status==='playing'){const cp=this.current.checkpoints.find(c=>c.id===this.progress.checkpoint);p.x=cp.x;p.y=cp.y-54;p.vy=0;p.vx=0;}break;}
  if(p.attack>0){
   const box={x:p.face>0?p.x+10:p.x-99,y:p.y-14,w:117,h:80};const dmg=Math.round((16+this.progress.upgrades.blade*7+(this.progress.rank-1)*2)*(p.combo===3?1.65:1));
   for(const e of [...this.enemies,...(this.bossActive&&this.boss?[this.boss]:[])])if(e.hp>0&&e.hitID!==this.attackID&&overlaps(box,e)){e.hitID=this.attackID;this.damageEnemy(e,dmg);}
  }
  for(const e of this.enemies)this.updateEnemy(e,dt);this.updateBoss(dt);
  for(const s of this.shots){
   if(s.life<=0)continue;s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
   const box={x:s.x-s.r,y:s.y-s.r,w:s.r*2,h:s.r*2};
   if(s.owner==='hero'){
    for(const sig of this.current.sigils)if(!this.has('runes',sig.id)&&Math.hypot(s.x-sig.x,s.y-(sig.y-40))<36){this.flag('runes',sig.id);s.life=0;this.emit('rune',{x:sig.x,y:sig.y-40});this.emit('note',{text:'World-rune released. Touch its light.'});this.emit('save');break;}
    for(const e of [...this.enemies,...(this.bossActive&&this.boss?[this.boss]:[])])if(s.life>0&&e.hp>0&&overlaps(box,e)){this.damageEnemy(e,s.dmg,'lumen');s.life=0;break;}
   }else if(overlaps(box,p)){this.hurt(s.dmg,s.x);s.life=0;}
   if(s.life>0&&!s.wave&&this.current.solids.some(q=>!q.oneWay&&overlaps(box,q)))s.life=0;
  }
  this.shots=this.shots.filter(s=>s.life>0&&s.x>-100&&s.x<this.current.width+100);if(this.shots.length>160)this.shots=this.shots.slice(-160);
  for(const s of this.current.sigils)if(this.has('runes',s.id)&&!this.has('sigils',s.id)&&Math.abs(p.x+14-s.x)<45&&Math.abs(p.y+27-(s.y-40))<65){this.flag('sigils',s.id);this.progress.gold+=25;this.addXP(20);this.emit('sigil',{x:s.x,y:s.y-40,count:this.sigilCount});this.emit('save');}
  if(!this.bossActive)for(const cp of this.current.checkpoints)if(cp.id!==this.progress.checkpoint&&Math.abs(p.x+14-cp.x)<48&&Math.abs(p.y+54-cp.y)<70){this.progress.checkpoint=cp.id;p.hp=this.maxHP;p.mp=this.maxMP;p.flasks=3;this.emit('checkpoint',{name:cp.name,x:cp.x,y:cp.y-30});this.emit('save');break;}
  if(this.boss&&this.boss.hp>0&&!this.bossActive&&this.sigilCount===2&&p.x>this.boss.arena[0]+25&&p.x<this.boss.arena[1])this.triggerBoss();
  this.near=this.findNearby();if(input.interactPressed)this.interact();this.camera+=((clamp(p.x-460+p.face*60,0,this.current.width-1280))-this.camera)*Math.min(1,dt*6);
 }
}
const Save={read(storage,key,levels){try{for(const k of [key,key+'.backup']){const s=validateSave(storage.getItem(k),levels);if(s)return s;}}catch(_){}return null;},write(storage,key,s,levels){try{const text=JSON.stringify(s);if(!validateSave(text,levels))return {ok:false,error:'Save validation failed.'};const prev=storage.getItem(key);if(validateSave(prev,levels))storage.setItem(key+'.backup',prev);storage.setItem(key,text);return {ok:true};}catch(_){return {ok:false,error:'Browser storage is unavailable. Export your journey before closing.'};}}};
const api={Game,Physics,validateSave,Save,version:'1.0.0',clamp};root.EW=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
