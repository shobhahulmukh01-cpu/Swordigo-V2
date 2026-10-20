/* Emberwake in-place presentation extension. Existing simulation, art, save IDs and controls retained. */
(function(root){'use strict';if(!root.EWClient)return;document.body.classList.add('ew-sequel');
const A=root.EWClient.App.prototype,frame=A.frame;
A.frame=function(now){const active=this.game.status!=='menu',changed=document.body.classList.contains('ew-playing')!==active;document.body.classList.toggle('ew-playing',active);if(changed)this.renderer.resize();return frame.call(this,now);};
const settingsSave=A.settingsSave;A.settingsSave=function(){settingsSave.call(this);this.renderer?.resize();};
const boot=root.EWClient.boot;root.EWClient.boot=function(){const app=boot.apply(this,arguments);if(app){app.renderer.resize();root.EW_SEQUEL_PRESENTATION=true;}return app;};
const hud=A.updateHUD;A.updateHUD=function(){hud.call(this);const g=this.game,e=g.boss;if(!g.bossActive||!e)return;const labels={'root-lanes':'ROOT LANES · LEAVE THE MARKS','forge-waves':'STAGED WAVES · JUMP THE CORRIDORS','marked-light':'MARKED LIGHT · LEAVE THE CIRCLES','charge':'LOCKED CHARGE · JUMP OR DASH'};document.getElementById('boss-state').textContent=e.state==='windup'||e.state==='attack'||e.state==='charge'?labels[e.move]||'WATCH THE WARNING':e.state==='recover'?'RECOVERING · STRIKE NOW':'WATCH THE WIND-UP';};
const codex=A.codex;A.codex=function(){codex.call(this);const entries=root.EW_JOURNAL.read(this.game.progress,root.EW_LEVELS);for(const [i,el] of Array.from(document.querySelectorAll('#modal-content .codexentry')).entries()){const entry=entries[i];if(!entry)continue;const note=document.createElement('p');note.className='quest-status';note.textContent=entry.title+' — '+entry.status;el.append(note);if(entry.route){const route=document.createElement('p');route.className='route-note';route.textContent=entry.route.name+' (optional): '+entry.route.instruction;el.append(route);}}};
const R=root.EWClient.Renderer.prototype,skyline=R.skyline;
R.skyline=function(level){skyline.call(this,level);const g=this.app.game;if(!g.progress||g.status==='menu')return;const c=this.c;for(const route of level.routes||[])for(const mark of route.landmarks){const x=mark.x-this.cam;if(x<30||x>this.w-30)continue;c.save();c.fillStyle='#091d26d9';c.fillRect(x-8,mark.y-57,16,24);c.strokeStyle=level.palette.accent;c.lineWidth=1.5;c.strokeRect(x-8,mark.y-57,16,24);c.beginPath();c.moveTo(x-4,mark.y-43);c.lineTo(x+4,mark.y-43);c.lineTo(x+1,mark.y-46);c.stroke();c.font='12px system-ui';c.textAlign='center';c.fillStyle='#f4e4be';c.shadowColor='#07151a';c.shadowBlur=5;c.fillText(mark.name,x,mark.y-68);c.restore();}
if(!!level.boss&&(g.inChapterRoom?g.chapterHas('defeated',level.boss.id):g.has('defeated',level.boss.id))){const k=g.sceneRealmIndex??g.progress.level;c.save();c.globalAlpha=.7;for(let i=0;i<8;i++){const x=(i*179+80-this.cam*.12)%this.w;if(k===0){c.fillStyle='#dfe7a6';c.beginPath();c.arc(x,490+(i%3)*24,3,0,Math.PI*2);c.fill();}else if(k===1){c.strokeStyle='#b2dfe3';c.beginPath();c.moveTo(x,520);c.lineTo(x+6,500);c.stroke();}else{c.strokeStyle='#efd59d';c.beginPath();c.arc(x,250,24,0,Math.PI*2);c.stroke();}}c.restore();}};
// Semantic chapter props reuse the current canvas vocabulary, not a replacement renderer.
R.chapterPropKind=function(o){
 const d=root.EW.ChapterData;if(!o?.id||!d?.interactions?.[o.id])return null;
 if(o.type==='delivery')return 'delivery';
 if(o.id.includes(':valve-'))return 'valve';
 if(o.id.includes(':vent-'))return 'vent';
 if(o.id.includes(':seal-'))return 'testimony';
 if(o.type==='encounter'||o.type==='complete')return 'console';
 if(o.type==='item')return o.id==='ch1:item:summer-coal'?'coal':'letter-desk';
 if(o.id==='ch1:mechanism:rootbridge')return 'root-latch';
 if(o.type==='ability')return 'beacon';return null;
};
R.chapterPropStatus=function(o){
 const g=this.app.game,k=o.type==='item'?'items':o.type==='delivery'?'deliveries':'mechanisms';
 if(g.chapterHas?.(k,o.itemId||o.deliveryId||o.mechanismId||o.id))return 'DONE';
 if(g.chapterRequirements&&!g.chapterRequirements(o.requirements))return 'LOCKED';
 return 'READY';
};
const chapterObject=R.object;
R.object=function(o,kind,active=false){
 const semantic=this.chapterPropKind(o);if(!semantic||semantic==='beacon')return chapterObject.call(this,o,semantic||kind,active);
 // NPC delivery evidence is rendered beside the recipient, never as another shrine.
 if(semantic==='delivery')return;
 const x=o.x-this.cam;if(x<-120||x>this.w+120)return;
 const c=this.c,status=this.chapterPropStatus(o),done=status==='DONE',ink='#d8dfc9',metal='#7e9690',dark='#20363b';
 c.save();c.translate(x,o.y);c.lineWidth=2;c.strokeStyle=metal;
 if(semantic==='valve'){
  c.fillStyle=dark;c.fillRect(-9,-43,18,43);c.fillStyle=metal;c.fillRect(-20,-12,40,9);
  c.strokeStyle='#bcaa7e';c.lineWidth=5;c.beginPath();c.arc(0,-49,19,0,Math.PI*2);c.stroke();
  c.lineWidth=3;for(let i=0;i<4;i++){const a=i*Math.PI/2+(done?Math.PI/4:0);c.beginPath();c.moveTo(0,-49);c.lineTo(Math.cos(a)*16,-49+Math.sin(a)*16);c.stroke();}
  c.fillStyle='#d1dfcb';c.fillRect(-4,-53,8,8);
 }else if(semantic==='vent'){
  c.fillStyle='#3a3933';c.fillRect(-29,-23,58,23);c.strokeStyle='#bda27b';c.strokeRect(-29,-23,58,23);
  for(let i=-20;i<=20;i+=10){c.fillStyle='#162a2d';c.fillRect(i,-20,4,15);}
  c.fillStyle='#948364';c.fillRect(20,-47,10,25);c.strokeRect(16,-49,18,7);
  // Both vents emit steam; banking east never suggests the channel is safe.
  c.strokeStyle='#b8c9c1';c.lineWidth=2;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*13,-28);c.bezierCurveTo(i*13-6,-37,i*13+7,-43,i*13,-54);c.stroke();}
  if(done){c.fillStyle='#9ca68b';c.fillRect(-31,-5,62,5);}
 }else if(semantic==='letter-desk'){
  c.fillStyle='#5c5341';c.fillRect(-34,-35,68,8);c.fillRect(-28,-27,7,27);c.fillRect(21,-27,7,27);
  this.poly([[-24,-39],[-20,-59],[19,-59],[24,-39]],'#d9d7b8','#7e917d');
  c.strokeStyle='#556c69';c.lineWidth=1.5;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-13,-53+i*5);c.lineTo(12,-53+i*5);c.stroke();}
  if(!done){c.fillStyle='#985d48';c.beginPath();c.arc(8,-42,3,0,Math.PI*2);c.fill();}
  c.strokeStyle='#c6d7c3';c.lineWidth=2;c.beginPath();c.moveTo(24,-37);c.lineTo(32,-61);c.stroke();
 }else if(semantic==='coal'){
  c.fillStyle='#665341';c.fillRect(-27,-20,54,20);c.strokeStyle='#a89775';c.strokeRect(-27,-20,54,20);
  for(let i=-1;i<=1;i++)this.poly([[i*15-9,-21],[i*15-7,-32],[i*15+4,-35],[i*15+10,-25],[i*15+5,-18]],done?'#3a4240':'#393332','#8b6850');
  if(!done){c.strokeStyle='#de9967';c.beginPath();c.moveTo(-8,-24);c.lineTo(-2,-28);c.lineTo(2,-22);c.stroke();}
 }else if(semantic==='testimony'){
  c.fillStyle='#344b50';c.fillRect(-23,-65,46,60);c.fillStyle='#84948e';c.fillRect(-29,-7,58,7);c.strokeStyle=ink;c.strokeRect(-19,-61,38,51);
  c.strokeStyle='#bdcbb9';for(let i=0;i<4;i++){c.beginPath();c.moveTo(-12,-51+i*8);c.lineTo(12,-51+i*8);c.stroke();}
  if(done){c.strokeStyle='#a5dec4';c.beginPath();c.moveTo(-10,-19);c.lineTo(-4,-14);c.lineTo(10,-25);c.stroke();}
 }else if(semantic==='console'){
  c.fillStyle='#354b53';c.fillRect(-29,-24,58,24);this.poly([[-32,-25],[-24,-54],[24,-54],[32,-25]],'#516c72','#a9b7ad');
  c.fillStyle='#122b35';c.fillRect(-16,-49,32,18);c.strokeStyle='#c1dfff';c.beginPath();c.arc(0,-40,6,0,Math.PI*2);c.stroke();
  for(let i=-1;i<=1;i++){c.fillStyle=ink;c.fillRect(i*12-2,-22,4,3);}
 }else if(semantic==='root-latch'){
  this.line([[-22,0],[-17,-30],[0,-49],[17,-30],[22,0]],'#92ad82',5);this.line([[-17,-17],[17,-17]],'#647c63',4);
  this.poly([[0,-40],[-9,-30],[0,-20],[9,-30]],done?'#b7d8a7':'#687f63','#c5d5af');
 }
 // Words plus a unique shape: status is never encoded by color alone.
 if(o.type==='mechanism'||o.type==='item'){
  c.fillStyle='#0a2025ee';c.fillRect(-35,-82,70,16);c.fillStyle=ink;c.font='bold 12px system-ui';c.textAlign='center';c.fillText(status,4,-70);
  c.strokeStyle=ink;c.lineWidth=1.5;
  if(done){c.beginPath();c.moveTo(-29,-75);c.lineTo(-26,-72);c.lineTo(-21,-78);c.stroke();}
  else if(status==='LOCKED'){c.strokeRect(-29,-76,6,5);c.beginPath();c.arc(-26,-77,2,Math.PI,0);c.stroke();}
  else{c.beginPath();c.arc(-26,-75,3,0,Math.PI*2);c.stroke();}
 }
 c.restore();
};
// Render recipient consequences only from a successful committed delivery fact.
R.chapterDeliveryProp=function(npc){
 const g=this.app.game,d=root.EW.ChapterData;if(g.progress?.mode!=='story'||!g.scene||!d)return;
 const deliveries=Object.values(d.deliveries).filter(m=>m.sceneId===g.scene.id&&g.chapterHas?.('deliveries',m.id));
 if(!deliveries.length)return;
 const x=npc.x+76-this.cam;if(x<-100||x>this.w+100)return;const c=this.c;
 c.save();
 // A local, static pool of warmth unifies the existing committed-repair prop.
 // It cannot appear for possession/signature alone and never changes hazards.
 this.glow(x,npc.y-28,58,'#e6c695',.075);
 c.translate(x,npc.y);c.scale(1.14,1);
 for(const m of deliveries){
  if(m.id==='ch1:delivery:water-remembers'){
   this.poly([[-26,-22],[-20,0],[23,0],[29,-22]],'#73624d','#a5b18b');c.fillStyle='#263b32';c.fillRect(-23,-24,49,6);
   for(const dx of [-12,4,17]){this.line([[dx,-22],[dx,-48]],'#99c49a',2);this.poly([[dx,-34],[dx-10,-41],[dx-13,-33],[dx,-28],[dx+11,-38],[dx+8,-45]],'#88b58a');}
   c.fillStyle='#99d7d6';c.fillRect(-20,-20,4,5);
  }else if(m.id==='ch1:delivery:summer-coal'){
   this.poly([[-32,0],[-32,-33],[-24,-46],[24,-46],[32,-33],[32,0]],'#58605a','#b0a28b');c.fillStyle='#16282a';c.fillRect(-23,-31,46,28);
   for(let i=-1;i<=1;i++){this.poly([[i*13-9,-8],[i*13-5,-19],[i*13+6,-21],[i*13+10,-8]],'#4a3c33','#b6784e');}
   c.fillStyle='#dca16c';c.fillRect(-11,-10,7,3);c.fillRect(7,-13,5,3);c.fillStyle='#a8a791';c.fillRect(-29,-4,58,4);
  }else if(m.id==='ch1:delivery:charter'){
   c.fillStyle='#655947';c.fillRect(-29,-77,58,64);c.fillRect(-24,-13,5,13);c.fillRect(19,-13,5,13);
   c.fillStyle='#d8d4b3';c.fillRect(-23,-71,46,50);c.strokeStyle='#566b64';c.lineWidth=1.5;
   for(let j=0;j<4;j++){c.beginPath();c.moveTo(-16,-61+j*7);c.lineTo(16,-61+j*7);c.stroke();}
   this.line([[-12,-29],[-7,-26],[-3,-31],[2,-28],[11,-32]],'#596f68',1.5);
  }
 }
 c.restore();
};
const chapterNPC=R.npc;R.npc=function(o){this.chapterDeliveryProp(o);return chapterNPC.call(this,o);};
const chapterBoss=R.boss;R.boss=function(e){
 if(e?.id!=='ch1:enemy:archivist-engine')return chapterBoss.call(this,e);
 if(e.hp<=0)return;const c=this.c,x=e.x+48-this.cam,y=e.y+140;if(x<-200||x>this.w+200)return;
 const wind=e.state==='windup',recover=e.state==='recover',color=wind?'#ffd18c':recover?'#c5cebd':'#c1dfff';c.save();c.translate(x,y);if(e.flash>0)c.globalAlpha=.65;
 this.glow(0,-72,105,color,wind?.18:.05);
 c.fillStyle='#0c1a2388';c.beginPath();c.ellipse(0,0,56,8,0,0,Math.PI*2);c.fill();
 // No face, crown, staff or limbs: a suspended archive drum within a square yoke.
 this.poly([[-44,0],[-44,-127],[-28,-140],[28,-140],[44,-127],[44,0],[29,0],[29,-116],[-29,-116],[-29,0]],'#536973','#acbcb080',2);
 // Articulated drum only: the yoke, collision silhouette and warnings stay fixed.
 const lift=wind?-4:recover?7:this.app.settings.reduceMotion?0:Math.sin(this.t*1.6)*1.5;
 c.save();c.translate(0,lift);
 this.poly([[-27,-33],[-33,-81],[-21,-112],[21,-112],[33,-81],[27,-33]],'#203b4b','#9daea8',2);
 for(let i=0;i<4;i++){c.fillStyle='#8c9c99';c.fillRect(-25+(recover?(i%2?3:-3):0),-101+i*17,50,5);c.fillStyle='#273e48';c.fillRect(-15,-100+i*17,30,2);}
 this.glow(0,-74,33,color,.22);this.poly([[0,-95],[-14,-74],[0,-53],[14,-74]],color,'#e4ead5');
 c.strokeStyle='#91aaa9';c.lineWidth=2;c.beginPath();c.ellipse(0,-74,38,31,0,0,Math.PI*2);c.stroke();
 c.restore();
 for(const dx of [-38,38]){c.fillStyle='#b4c3b8';c.fillRect(dx-4,-106,8,14);c.fillRect(dx-4,-49,8,14);}
 c.fillStyle='#6c807e';c.fillRect(-48,-8,28,8);c.fillRect(20,-8,28,8);
 if(wind){c.strokeStyle=color;c.lineWidth=3;c.strokeRect(-38,-118,76,88);c.fillStyle='#ffe0a1';c.font='bold 31px Georgia';c.textAlign='center';c.fillText('!',0,-164);}
 c.restore();
};

const terrain=R.terrain;R.terrain=function(s,level){terrain.call(this,s,level);if(s.oneWay)return;const c=this.c,k=this.app.game.sceneRealmIndex??this.app.game.progress?.level??0,x=s.x-this.cam;if(x+s.w<0||x>this.w)return;c.save();const a=Math.max(0,Math.floor((this.cam-s.x)/90)),z=Math.min(Math.ceil(s.w/90),a+Math.ceil(this.w/90)+1),restored=!!level.boss&&(this.app.game.inChapterRoom?this.app.game.chapterHas('defeated',level.boss.id):this.app.game.has('defeated',level.boss.id));for(let i=a;i<z;i++){const px=x+i*90+22;if(k===0){c.strokeStyle=restored?'#9ebd82':'#657d65';c.lineWidth=2;c.beginPath();c.moveTo(px,s.y+19);c.bezierCurveTo(px+8,s.y+35,px-11,s.y+53,px+16,s.y+72);c.stroke();if(restored){c.fillStyle='#f0d4a0';for(let j=-1;j<=1;j++){c.beginPath();c.ellipse(px+j*3,s.y-10,2.5,4,j,0,Math.PI*2);c.fill();}}}else if(k===1){c.strokeStyle='#b6976b';c.lineWidth=1;c.strokeRect(px,s.y+13,54,21);c.fillStyle='#ddb579';c.fillRect(px+4,s.y+18,2,2);c.fillRect(px+46,s.y+28,2,2);c.strokeStyle=restored?'#8ec7bb':'#985b39';c.beginPath();c.moveTo(px+12,s.y+40);c.lineTo(px+28,s.y+51);c.lineTo(px+39,s.y+40);c.stroke();}else{c.strokeStyle=restored?'#cfbc8a':'#899fb1';c.lineWidth=1;c.beginPath();c.moveTo(px,s.y+18);c.lineTo(px+16,s.y+30);c.lineTo(px+32,s.y+18);c.moveTo(px+16,s.y+30);c.lineTo(px+16,s.y+44);c.stroke();}}c.restore();};
// Read-only phase classification; the original sword path/reach/timer is delegated unchanged.
R.heroVisualPhase=function(p){return p.attack>0?(p.attack>.17?'set':p.attack>.075?'strike':'followthrough'):p.dash>0?'dash':'idle';};
const hero=R.hero;R.hero=function(p,ghost){
 const c=this.c,phase=this.heroVisualPhase(p),still=this.app.settings.reduceMotion,t=this.t;
 c.save();if(!ghost){
  c.shadowColor='#03121c';c.shadowBlur=4;
  if(phase!=='idle'){
   c.save();c.translate(p.x+14-this.cam,p.y+54);c.scale(p.face,1);
   // A restrained rear cloth fold, not a weapon trail or a larger attack arc.
   const tail=still?-29:phase==='strike'?-34:phase==='followthrough'?-31:-29;
   this.poly([[-12,-36],[tail,-18],[-26,-10],[-15,-15]],'#9f5945','#d88d6770',1);
   this.line([[-14,-31],[tail+3,-18]],'#e2ad8255',1);c.restore();
  }
 }
 // Freeze only decorative Aster/invulnerability time modulation, never attack phases.
 if(still)this.t=0;try{hero.call(this,p,ghost);}finally{this.t=t;c.restore();}
};
const draw=R.draw;R.draw=function(dt){draw.call(this,dt);const g=this.app.game;if(this.app.paused||!g.bossActive)return;const c=this.c;c.save();c.setTransform(this.sx,0,0,this.sy,0,-(this.camY||0)*this.sy);for(const mark of g.bossTelegraphs||[]){const x=mark.x-this.cam,end=mark.endX-this.cam,warn=mark.phase==='warning',color=mark.kind==='root'?'#a4efbb':mark.kind==='light'?'#d9e9ff':'#ffd18c';if(Math.max(x,end)<-60||Math.min(x,end)>this.w+60)continue;c.strokeStyle=color;c.fillStyle=warn?color+'29':color+'80';c.lineWidth=warn?2:3;const y=mark.y+17;if(mark.kind==='charge'||mark.kind==='groundwave'){c.fillRect(Math.min(x,end)-mark.radius,y-14,Math.abs(end-x)+mark.radius*2,14);c.strokeRect(Math.min(x,end)-mark.radius,y-14,Math.abs(end-x)+mark.radius*2,14);c.beginPath();c.moveTo(end-mark.direction*14,y-27);c.lineTo(end,y-20);c.lineTo(end-mark.direction*14,y-13);c.stroke();}else{c.beginPath();c.ellipse(x,y,mark.radius,9,0,0,Math.PI*2);c.fill();c.stroke();if(mark.kind==='root'){for(let j=-1;j<=1;j++){c.beginPath();c.moveTo(x+j*11,y);c.lineTo(x+j*11-4,y-(warn?12:40));c.stroke();}}else{c.setLineDash([4,6]);c.beginPath();c.moveTo(x,y-72);c.lineTo(x,y-17);c.stroke();c.setLineDash([]);}}if(warn){const total=mark.warningDuration||1,ready=1-mark.remaining/total;c.fillStyle='#09151c';c.fillRect(x-24,y-58,48,18);c.fillStyle=color;c.font='bold 11px system-ui';c.textAlign='center';c.fillText(mark.kind==='light'?'LIGHT':mark.kind==='root'?'ROOT':mark.kind==='charge'?'CHARGE':'WAVE',x,y-45);c.lineWidth=3;c.beginPath();c.arc(x,y-26,8,-Math.PI/2,-Math.PI/2+Math.PI*2*ready);c.stroke();}}
c.restore();};
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
})(typeof window!=='undefined'?window:globalThis);
