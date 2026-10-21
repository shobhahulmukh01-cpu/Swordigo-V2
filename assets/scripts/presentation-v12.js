/* Emberwake in-place presentation extension. Existing simulation, art, save IDs and controls retained. */
(function(root){'use strict';if(!root.EWClient)return;document.body.classList.add('ew-sequel');
const A=root.EWClient.App.prototype,frame=A.frame;
A.frame=function(now){const active=this.game.status!=='menu',changed=document.body.classList.contains('ew-playing')!==active;document.body.classList.toggle('ew-playing',active);if(changed)this.renderer.resize();return frame.call(this,now);};
const settingsSave=A.settingsSave;A.settingsSave=function(){settingsSave.call(this);this.renderer?.resize();};
const boot=root.EWClient.boot;root.EWClient.boot=function(){const app=boot.apply(this,arguments);if(app){app.renderer.resize();root.EW_SEQUEL_PRESENTATION=true;}return app;};
const hud=A.updateHUD;A.updateHUD=function(){hud.call(this);const g=this.game,e=g.boss;if(!g.bossActive||!e)return;const labels={'root-lanes':'ROOT LANES · LEAVE THE MARKS','forge-waves':'STAGED WAVES · JUMP THE CORRIDORS','marked-light':'MARKED LIGHT · LEAVE THE CIRCLES','charge':'LOCKED CHARGE · JUMP OR DASH'};document.getElementById('boss-state').textContent=e.state==='windup'||e.state==='attack'||e.state==='charge'?labels[e.move]||'WATCH THE WARNING':e.state==='recover'?'RECOVERING · STRIKE NOW':'WATCH THE WIND-UP';};
const codex=A.codex;A.codex=function(){codex.call(this);const entries=root.EW_JOURNAL.read(this.game.progress,root.EW_LEVELS);for(const [i,el] of Array.from(document.querySelectorAll('#modal-content .codexentry')).entries()){const entry=entries[i];if(!entry)continue;const note=document.createElement('p');note.className='quest-status';note.textContent=entry.title+' — '+entry.status;el.append(note);if(entry.route){const route=document.createElement('p');route.className='route-note';route.textContent=entry.route.name+' (optional): '+entry.route.instruction;el.append(route);}}};
const R=root.EWClient.Renderer.prototype,skyline=R.skyline;
// CSS-pixel-sized, bounded labels. Presentation caches never become journey state.
const intersects=(a,b,pad=3)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
R.presentationScale=function(){
 const width=this.canvas?.clientWidth;
 return width>0&&this.w>0?width/this.w:1;
};
R.presentationTextWidth=function(text){
 const measured=this.c.measureText?.(text)?.width;
 const size=Number(String(this.c.font).match(/([\d.]+)px/)?.[1])||12;
 return Number.isFinite(measured)?measured:String(text).length*size*.58;
};
R.presentationLayout=function(){
 if(this._presentationLayout)return this._presentationLayout;
 const reserved=[],layout={reserved,placed:[]};this._presentationLayout=layout;
 const rect=this.canvas?.getBoundingClientRect?.(),vh=this.viewH||720;
 if(rect?.width>0&&rect?.height>0&&document.querySelectorAll){
  // One bounded DOM read per drawn frame, not one read per prop or warning.
  const nodes=document.querySelectorAll('.resources,.hud-realm,.hudtools,.objective,#boss-hud,#prompt,#toast,.touchdock button,.abilitybar');
  for(const el of nodes){
   if(el.hidden||!el.getClientRects?.().length)continue;
   const style=root.getComputedStyle?.(el);
   if(style&&(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||style.opacity==='0'))continue;
   const b=el.getBoundingClientRect();if(!b.width||!b.height)continue;
   reserved.push({x:(b.left-rect.left)/rect.width*this.w,y:(b.top-rect.top)/rect.height*vh+(this.camY||0),w:b.width/rect.width*this.w,h:b.height/rect.height*vh});
  }
 }
 const p=this.app.game.p;
 if(p){
  const x=p.x+14-this.cam,y=p.y+54;
  reserved.push({x:x-25,y:y-64,w:51,h:68});
  if(p.attack>0){
   // Reserve the existing sword's actual visual sweep, never alter that sweep.
   const a=-1.75+(1-p.attack/.26)*3.7,face=p.face||1;
   const ax=x+face*11,ay=y-32,bx=ax+face*Math.cos(a)*84,by=ay+Math.sin(a)*84;
   reserved.push({x:Math.min(ax,bx)-10,y:Math.min(ay,by)-10,w:Math.abs(bx-ax)+20,h:Math.abs(by-ay)+20});
  }
 }
 const e=this.app.game.boss;
 if(this.app.game.bossActive&&e?.hp>0)reserved.push({x:e.x-this.cam-7,y:e.y-28,w:(e.w||96)+14,h:(e.h||140)+30});
 return layout;
};
R.presentationLabel=function(text,x,y,options={}){
 const c=this.c,scale=this.presentationScale(),pad=6/scale,line=17/scale,font=14/scale;
 c.save();c.font=(options.warning?'700 ':'500 ')+font+'px system-ui';c.textAlign='center';
 const maxWidth=Math.max(44/scale,Math.min(options.maxWidth||230/scale,this.w-16/scale));
 const words=String(text).split(/\s+/),lines=[];let current='';
 for(const word of words){
  const next=current?current+' '+word:word;
  if(current&&this.presentationTextWidth(next)>maxWidth-pad*2){lines.push(current);current=word;}else current=next;
 }
 if(current)lines.push(current);
 // Never squeeze text with fillText(maxWidth). Two lines, otherwise omit optional text.
 if(lines.length>2||lines.some(t=>this.presentationTextWidth(t)>maxWidth-pad*2)){c.restore();return null;}
 const w=Math.min(maxWidth,Math.max(...lines.map(t=>this.presentationTextWidth(t)))+pad*2),h=lines.length*line+6/scale;
 const layout=this.presentationLayout(),edge=8/scale,top=(this.camY||0)+edge,bottom=(this.camY||0)+(this.viewH||720)-edge;
 const blockers=layout.reserved.concat(layout.placed),candidates=[];
 for(const dy of [0,-24,-48,-76,-104,26]){
  for(const dx of [0,-(w/2+26/scale),w/2+26/scale]){
   candidates.push({x:clamp(x+dx-w/2,edge,Math.max(edge,this.w-edge-w)),y:clamp(y+dy/scale,top,Math.max(top,bottom-h)),w,h});
  }
 }
 const box=candidates.find(b=>!blockers.some(a=>intersects(b,a,4/scale)));
 if(!box){c.restore();return null;}
 c.fillStyle=options.background||'#07191df2';c.fillRect(box.x,box.y,box.w,box.h);
 c.fillStyle=options.color||'#f3e7c5';
 lines.forEach((t,i)=>c.fillText(t,box.x+box.w/2,box.y+(i+1)*line));
 if(options.leader){
  c.strokeStyle=options.color||'#d9e9ff';c.lineWidth=1/scale;c.beginPath();
  c.moveTo(box.x+box.w/2,box.y+box.h);c.lineTo(x,options.leaderY??y+30/scale);c.stroke();
 }
 layout.placed.push(box);c.restore();return box;
};
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
 if(g.chapterHas?.(k,o.itemId||o.deliveryId||o.mechanismId||o.id))return o.type==='item'&&o.reread===true?'READ AGAIN':'DONE';
 if(g.chapterRequirements&&!g.chapterRequirements(o.requirements))return 'LOCKED';
 return 'READY';
};
const chapterObject=R.object;
R.object=function(o,kind,active=false){
 const semantic=this.chapterPropKind(o);
 if(!semantic||semantic==='beacon'){
  if(kind!=='gate'||!o?.chapterLabel)return chapterObject.call(this,o,semantic||kind,active);
  // The original arch stays intact; only its fixed caption gets a safe placement.
  const c=this.c,fill=c.fillText;
  c.fillText=function(text,...args){if(text!==o.chapterLabel)return fill.call(this,text,...args);};
  try{chapterObject.call(this,o,kind,active);}finally{c.fillText=fill;}
  if(!this.app.game.bossActive)this.presentationLabel(o.chapterLabel,o.x-this.cam,o.y-167,{maxWidth:180/this.presentationScale()});
  return;
 }
 // NPC delivery evidence is rendered beside the recipient, never as another shrine.
 if(semantic==='delivery')return;
 const x=o.x-this.cam;if(x<-120||x>this.w+120)return;
 const c=this.c,status=this.chapterPropStatus(o),done=status==='DONE'||status==='READ AGAIN',ink='#d8dfc9',metal='#7e9690',dark='#20363b';
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
  const scale=this.presentationScale(),badgeH=20/scale;
  c.font='bold '+14/scale+'px system-ui';c.textAlign='center';
  const half=Math.max(35,(this.presentationTextWidth(status)+26/scale)/2);
  c.fillStyle='#0a2025ee';c.fillRect(-half,-82,half*2,badgeH);c.fillStyle=ink;c.fillText(status,7/scale,-82+14/scale);
  this.presentationLayout().reserved.push({x:x-half,y:o.y-82,w:half*2,h:badgeH});
  c.strokeStyle=ink;c.lineWidth=1.5;
  const icon=-half+9;
  if(done){c.beginPath();c.moveTo(icon-3,-75);c.lineTo(icon,-72);c.lineTo(icon+5,-78);c.stroke();}
  else if(status==='LOCKED'){c.strokeRect(icon-3,-76,6,5);c.beginPath();c.arc(icon,-77,2,Math.PI,0);c.stroke();}
  else{c.beginPath();c.arc(icon,-75,3,0,Math.PI*2);c.stroke();}
 }
 c.restore();
};
// Preserve original prop/bridge/door dispatch; replace only its fixed nameplates.
const chapterObjects=R.chapterObjects;
R.chapterObjects=function(g){
 const d=root.EW.ChapterData;if(!d||g.progress?.mode!=='story'||!g.scene)return chapterObjects?.call(this,g);
 const layout=this.presentationLayout(),narrow=(this.canvas?.clientWidth||this.w)<650;
 const interactions=Object.values(d.interactions).filter(m=>m.sceneId===g.scene.id);
 for(const [id,door] of Object.entries(d.doors))if(door.sourceScene===g.scene.id){
  const a=door.source,name=door.destScene.startsWith('ch1:main:')?'MAIN ROAD':door.destScene.endsWith('millpond')?'MILLPOND':door.destScene.endsWith('rootcellar')?'CHARTER DESK':door.destScene.endsWith('cooling-gallery')?'COOLING GALLERY':'STAR ARCHIVE';
  this.object({x:a.x+a.w/2,y:a.y+a.h,chapterLabel:name},'gate',g.canEnterDoor(id));
 }
 for(const m of interactions){
  const fact=m.type==='delivery'?g.chapterHas?.('deliveries',m.deliveryId||m.id):m.type==='item'?g.chapterHas?.('items',m.itemId||m.id):g.chapterHas?.('mechanisms',m.mechanismId||m.id);
  this.object(m,m.type==='item'?'chest':m.type==='rest'?'beacon':'shrine',!!fact);
  if((m.bridge||m.geometry)&&fact)for(const platform of m.bridge||m.geometry)this.terrain(platform,g.level);
 }
 // In combat, testimony names yield; physical props and statuses remain.
 if(g.bossActive)return;
 const candidates=interactions.filter(m=>m.x-this.cam>=0&&m.x-this.cam<=this.w).sort((a,b)=>Math.abs(a.x-(g.p?.x||0)-14)-Math.abs(b.x-(g.p?.x||0)-14));
 let count=0;
 for(const m of candidates){
  if(narrow&&count)break;
  const fact=m.type==='delivery'?g.chapterHas?.('deliveries',m.deliveryId||m.id):m.type==='item'?g.chapterHas?.('items',m.itemId||m.id):g.chapterHas?.('mechanisms',m.mechanismId||m.id);
  const short=m.id==='ch1:mechanism:seal-water'?'WATER TESTIMONY':m.id==='ch1:mechanism:seal-summer'?'SUMMER TESTIMONY':m.id==='ch1:mechanism:seal-charter'?'SIGNED TESTIMONY':m.type==='encounter'?'CHALLENGE ENGINE':m.type==='ability'?'DAWNSTEP':m.label||m.name||'Inspect';
  const box=this.presentationLabel((fact?'✓ ':'')+short,m.x-this.cam,m.y-116,{color:fact?'#a4efce':'#f3e7c5'});
  if(box)count++;
 }
 return layout;
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
 // Inset material planes: no enlargement of the existing mechanical silhouette.
 this.poly([[-44,-127],[-37,-123],[-37,0],[-44,0]],'#304951');
 this.poly([[-28,-140],[28,-140],[34,-134],[-30,-134]],'#899b96');
 this.poly([[36,-122],[44,-127],[44,0],[36,0]],'#2b424a');
 this.line([[-37,-122],[-30,-128],[-30,-117]],'#c2cabc',1);
 // Articulated drum only: the yoke, collision silhouette and warnings stay fixed.
 const lift=wind?-4:recover?7:this.app.settings.reduceMotion?0:Math.sin(this.t*1.6)*1.5;
 c.save();c.translate(0,lift);
 this.poly([[-27,-33],[-33,-81],[-21,-112],[21,-112],[33,-81],[27,-33]],'#203b4b','#9daea8',2);
 this.poly([[-30,-79],[-21,-108],[-17,-105],[-24,-77],[-20,-37],[-26,-36]],'#69817f');
 this.poly([[24,-104],[32,-80],[26,-35],[18,-39],[23,-77],[16,-105]],'#142b39');
 for(let i=0;i<4;i++){c.fillStyle='#8c9c99';c.fillRect(-25+(recover?(i%2?3:-3):0),-101+i*17,50,5);c.fillStyle='#273e48';c.fillRect(-15,-100+i*17,30,2);}
 // Static opened aperture is readable even with all decorative motion disabled.
 if(recover){
  this.poly([[-19,-96],[-25,-74],[-18,-51],[18,-51],[25,-74],[19,-96]],'#0d222c','#9cafa5',1);
  this.line([[-17,-94],[-23,-74],[-17,-54]],'#d4d9be',2);
 }else{
  this.poly([[-18,-97],[-22,-75],[-17,-51],[-12,-55],[-16,-75],[-12,-94]],'#728d89');
  this.poly([[18,-97],[22,-75],[17,-51],[12,-55],[16,-75],[12,-94]],'#486466');
 }
 this.glow(0,-74,33,color,recover?.12:.22);this.poly([[0,recover?-89:-95],[recover?-10:-14,-74],[0,recover?-59:-53],[recover?10:14,-74]],color,'#e4ead5');
 c.strokeStyle='#91aaa9';c.lineWidth=2;c.beginPath();c.ellipse(0,-74,38,31,0,0,Math.PI*2);c.stroke();
 c.restore();
 for(const dx of [-38,38]){c.fillStyle='#b4c3b8';c.fillRect(dx-4,-106,8,14);c.fillRect(dx-4,-49,8,14);}
 c.fillStyle='#6c807e';c.fillRect(-48,-8,28,8);c.fillRect(20,-8,28,8);
 if(wind){c.strokeStyle=color;c.lineWidth=3;c.strokeRect(-38,-118,76,88);c.fillStyle='#ffe0a1';c.font='bold 31px Georgia';c.textAlign='center';c.fillText('!',0,-164);}
 c.restore();
};

const terrain=R.terrain;R.terrain=function(s,level){terrain.call(this,s,level);if(s.oneWay)return;const c=this.c,k=this.app.game.sceneRealmIndex??this.app.game.progress?.level??0,x=s.x-this.cam;if(x+s.w<0||x>this.w)return;c.save();const a=Math.max(0,Math.floor((this.cam-s.x)/90)),z=Math.min(Math.ceil(s.w/90),a+Math.ceil(this.w/90)+1),restored=!!level.boss&&(this.app.game.inChapterRoom?this.app.game.chapterHas('defeated',level.boss.id):this.app.game.has('defeated',level.boss.id));for(let i=a;i<z;i++){const px=x+i*90+22;if(k===0){c.strokeStyle=restored?'#9ebd82':'#657d65';c.lineWidth=2;c.beginPath();c.moveTo(px,s.y+19);c.bezierCurveTo(px+8,s.y+35,px-11,s.y+53,px+16,s.y+72);c.stroke();if(restored){c.fillStyle='#f0d4a0';for(let j=-1;j<=1;j++){c.beginPath();c.ellipse(px+j*3,s.y-10,2.5,4,j,0,Math.PI*2);c.fill();}}}else if(k===1){c.strokeStyle='#b6976b';c.lineWidth=1;c.strokeRect(px,s.y+13,54,21);c.fillStyle='#ddb579';c.fillRect(px+4,s.y+18,2,2);c.fillRect(px+46,s.y+28,2,2);c.strokeStyle=restored?'#8ec7bb':'#985b39';c.beginPath();c.moveTo(px+12,s.y+40);c.lineTo(px+28,s.y+51);c.lineTo(px+39,s.y+40);c.stroke();}else{c.strokeStyle=restored?'#cfbc8a':'#899fb1';c.lineWidth=1;c.beginPath();c.moveTo(px,s.y+18);c.lineTo(px+16,s.y+30);c.lineTo(px+32,s.y+18);c.moveTo(px+16,s.y+30);c.lineTo(px+16,s.y+44);c.stroke();}}c.restore();};
const alpha4Terrain=R.terrain;
const materialBands=Object.freeze([{x:0,y:0,w:1264,h:276,dim:.26},{x:0,y:290,w:1264,h:267,dim:.22},{x:0,y:577,w:1264,h:271,dim:.47}]);
R.terrainMaterial=function(){
 if(this.app.settings.quality==='low')return null;
 let entry=this._terrainMaterial;
 if(!entry){
  const image=new Image();entry=this._terrainMaterial={image,ready:false,failed:false};
  const fail=()=>{entry.ready=false;entry.failed=true;};
  image.onerror=fail;
  image.onload=()=>{
   const ready=()=>{if(entry.failed||!image.complete||image.naturalWidth!==1264||image.naturalHeight!==848){fail();return;}entry.ready=true;};
   if(typeof image.decode==='function')image.decode().then(ready,fail);else ready();
  };
  image.src='assets/art/terrain-materials-v13.png';
 }
 return entry.ready&&!entry.failed&&entry.image.complete&&entry.image.naturalWidth===1264&&entry.image.naturalHeight===848?entry.image:null;
};
R.terrain=function(s,level){
 const x=s.x-this.cam;if(x+s.w<-60||x>this.w+60)return;
 const image=this.terrainMaterial();if(!image)return alpha4Terrain.call(this,s,level);
 const c=this.c,k=clamp(this.app.game.sceneRealmIndex??this.app.game.progress?.level??0,0,2),band=materialBands[k];
 // Supports/ropes remain the original one-way silhouette; no polygon-floor pass.
 if(s.oneWay)terrain.call(this,s,level);
 const h=Math.max(1,Math.min(s.h||170,180)-4),sourceH=s.oneWay?64:band.h,tileW=Math.max(128,band.w*h/sourceH);
 const left=Math.max(s.x,this.cam-1),right=Math.min(s.x+s.w,this.cam+this.w+1);
 const first=Math.floor(left/tileW),last=Math.ceil(right/tileW);
 c.save();c.beginPath();c.rect(x,s.y+4,s.w,h);c.clip();
 c.fillStyle='#14262b';c.fillRect(x,s.y+4,s.w,h);
 // Full-height source bands exclude the two dark gutters. Phase is world-anchored.
 for(let i=first;i<last;i++)c.drawImage(image,band.x,band.y,band.w,sourceH,i*tileW-this.cam,s.y+4,tileW,h);
 c.fillStyle='#08191e';c.globalAlpha=band.dim;c.fillRect(x,s.y+4,s.w,h);c.globalAlpha=1;
 const shade=c.createLinearGradient(0,s.y+4,0,s.y+4+h);
 shade.addColorStop(0,'#06151c10');shade.addColorStop(.35,'#06151c00');shade.addColorStop(1,'#06151ca8');
 c.fillStyle=shade;c.fillRect(x,s.y+4,s.w,h);
 // Terminated caps belong to this exact solid, not to the repeating texture.
 c.fillStyle='#07181c66';c.fillRect(x,s.y+4,Math.min(5,s.w),h);c.fillRect(x+Math.max(0,s.w-7),s.y+4,Math.min(7,s.w),h);
 c.fillStyle='#c8d6bb25';c.fillRect(x+2,s.y+5,1,Math.max(0,h-3));c.restore();
 c.save();c.fillStyle=k===1?(s.oneWay?'#c89857':'#d59b69'):(s.oneWay?'#a4c2a0':'#91b29b');c.fillRect(x,s.y,s.w,s.oneWay?3:4);
 c.fillStyle='#0c222bb3';c.fillRect(x,s.y+4,s.w,3);c.restore();
};
// Read-only phase classification; the original sword path/reach/timer is delegated unchanged.
R.heroVisualPhase=function(p){return p.attack>0?(p.attack>.17?'set':p.attack>.075?'strike':'followthrough'):p.dash>0?'dash':'idle';};
const hero=R.hero;R.hero=function(p,ghost){
 const c=this.c,phase=this.heroVisualPhase(p),still=this.app.settings.reduceMotion,t=this.t;
 if(ghost&&still)return; // Decorative dash clones only; never skip the real courier.
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
 if(still)this.t=0;
 try{
  hero.call(this,p,ghost);
  if(!ghost){
   // Inset cloth/metal planes stay within Lyra's existing body and sword anchors.
   c.save();c.translate(p.x+14-this.cam,p.y+54);c.scale(p.face,1);c.shadowBlur=0;
   c.globalAlpha=p.inv>0&&!still?.68+.25*Math.sin(t*35):1;
   this.poly([[-8,-39],[-10,-26],[-7,-23],[-4,-38]],'#477d75');
   this.poly([[-3,-40],[5,-39],[7,-26],[-1,-28]],'#91b7a1');
   this.line([[-2,-36],[2,-30],[5,-25]],'#c6d3ae80',1);
   const shoulder=phase==='set'?-2:phase==='strike'?1:phase==='followthrough'?2:0;
   this.poly([[5,-41+shoulder],[10,-38+shoulder],[12,-34],[7,-33],[4,-36]],'#b9c3a1','#536f64',1);
   this.poly([[12,-29],[18,-31],[19,-28],[14,-26]],'#d1b27e');
   this.line([[-11,-16],[-7,-13],[-2,-15]],'#aec0a280',1);
   if(p.grounded)this.line([[-5,-5],[4,-5]],'#10262d',2);
   c.restore();
  }
 }finally{this.t=t;c.restore();}
};
const draw=R.draw;R.draw=function(dt){
 this._presentationLayout=null;
 draw.call(this,dt);
 const g=this.app.game;if(this.app.paused||!g.bossActive)return;
 const c=this.c,marks=g.bossTelegraphs||[],layout=this.presentationLayout();
 for(const mark of marks){
  const x=mark.x-this.cam,end=mark.endX-this.cam;
  layout.reserved.push({x:Math.min(x,end)-mark.radius,y:mark.y+3,w:Math.abs(end-x)+mark.radius*2,h:26});
 }
 c.save();c.setTransform(this.sx,0,0,this.sy,0,-(this.camY||0)*this.sy);
 for(const mark of marks){
  const x=mark.x-this.cam,end=mark.endX-this.cam,warn=mark.phase==='warning',color=mark.kind==='root'?'#a4efbb':mark.kind==='light'?'#d9e9ff':'#ffd18c';
  if(Math.max(x,end)<-60||Math.min(x,end)>this.w+60)continue;
  c.strokeStyle=color;c.fillStyle=warn?color+'29':color+'80';c.lineWidth=warn?2:3;
  const y=mark.y+17;
  // All warning/attack shapes keep their original world coordinates and extents.
  if(mark.kind==='charge'||mark.kind==='groundwave'){
   c.fillRect(Math.min(x,end)-mark.radius,y-14,Math.abs(end-x)+mark.radius*2,14);
   c.strokeRect(Math.min(x,end)-mark.radius,y-14,Math.abs(end-x)+mark.radius*2,14);
   c.beginPath();c.moveTo(end-mark.direction*14,y-27);c.lineTo(end,y-20);c.lineTo(end-mark.direction*14,y-13);c.stroke();
  }else{
   c.beginPath();c.ellipse(x,y,mark.radius,9,0,0,Math.PI*2);c.fill();c.stroke();
   if(mark.kind==='root'){
    for(let j=-1;j<=1;j++){c.beginPath();c.moveTo(x+j*11,y);c.lineTo(x+j*11-4,y-(warn?12:40));c.stroke();}
   }else{
    c.setLineDash([4,6]);c.beginPath();c.moveTo(x,y-72);c.lineTo(x,y-17);c.stroke();c.setLineDash([]);
   }
  }
  if(warn){
   const total=mark.warningDuration||1,ready=clamp(1-mark.remaining/total,0,1);
   c.lineWidth=3;c.beginPath();c.arc(x,y-26,8,-Math.PI/2,-Math.PI/2+Math.PI*2*ready);c.stroke();
  }
  const text=mark.kind==='light'?'LIGHT':mark.kind==='root'?'ROOT':mark.kind==='charge'?'CHARGE':'WAVE';
  this.presentationLabel(text,clamp(x,12,this.w-12),y-91,{warning:true,color,maxWidth:100/this.presentationScale(),leader:true,leaderY:y-17});
 }
 c.restore();
};
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
})(typeof window!=='undefined'?window:globalThis);
