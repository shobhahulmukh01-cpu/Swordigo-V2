/* EMBERWAKE 1.1 — original realm plates, guard feedback and live cartography. */
(function(root){'use strict';const C=root.EWClient,R=C.Renderer.prototype,A=C.App.prototype;
const paths=['assets/images/moonroot_hd.webp','assets/images/cinderworks_hd.webp','assets/images/hollowspire_hd.webp'];
function images(r){if(r.realmImages)return;r.realmImages=paths.map(path=>{const i=new Image();i.src=path;return i;});}
const sky=R.skyline;R.skyline=function(level){images(this);const menu=this.app.game.status==='menu',k=menu?this.app.preview:(this.app.game.sceneRealmIndex??this.app.game.progress.level),i=this.realmImages[k],ready=!!i&&i.complete&&i.naturalWidth>0,c=this.c,t=this.t,old=this.ready;this.ready=false;if(this.app.settings.reduceMotion)this.t=0;sky.call(this,level);this.t=t;this.ready=old;if(ready){const w=this.w,h=720,scale=Math.max((w+180)/i.width,h/i.height),iw=i.width*scale,ih=i.height*scale,shift=menu?0:(this.cam/Math.max(1,level.width-this.w)-.5)*140;c.save();c.globalAlpha=menu?.98:.64;c.drawImage(i,(w-iw)/2-shift,(h-ih)/2,iw,ih);c.restore();if(!menu){const veil=c.createLinearGradient(0,250,0,720);veil.addColorStop(0,'transparent');veil.addColorStop(.6,'#08191c27');veil.addColorStop(1,'#07161a75');c.fillStyle=veil;c.fillRect(0,0,w,h);}}else if(old){const original=this.image,sc=Math.max(this.w/original.width,720/original.height);c.save();c.globalAlpha=menu?.9:.23;c.drawImage(original,(this.w-original.width*sc)/2,(720-original.height*sc)/2,original.width*sc,original.height*sc);c.restore();}};
// Chapter room architecture is backdrop-only: all supplied plates and collision remain.
R.chapterRoomBackdrop=function(level){
 const g=this.app.game,id=g.scene?.id;if(g.status==='menu'||!g.inChapterRoom)return;
 const c=this.c,screen=x=>x-this.cam;
 c.save();
 if(id==='ch1:room:rootcellar'){
  // Opaque interior walls occlude the outdoor Vale; one high slit retains the plate.
  c.fillStyle='#102124f5';c.fillRect(0,0,this.w,185);c.fillRect(0,250,this.w,470);
  const slit=screen(280);c.fillRect(0,185,Math.max(0,slit),65);c.fillRect(Math.max(0,slit+150),185,this.w,65);
  c.strokeStyle='#61756a';c.lineWidth=8;c.strokeRect(slit,185,150,65);
  c.fillStyle='#788774';for(let x=slit+30;x<slit+150;x+=30)c.fillRect(x,185,4,65);
  for(let world=0;world<level.width;world+=260){const x=screen(world);if(x<-280||x>this.w)continue;
   c.fillStyle='#263b36';c.fillRect(x,276,24,314);c.fillRect(x,264,260,22);
   c.strokeStyle='#53685b55';c.lineWidth=2;c.strokeRect(x+32,303,216,258);
   for(let y=350;y<560;y+=66){c.beginPath();c.moveTo(x+34,y);c.lineTo(x+246,y);c.stroke();}}
  // Public notice board, separate from the Charter collection desk.
  const x=screen(1330);c.fillStyle='#493e30';c.fillRect(x,320,176,116);c.strokeStyle='#9e9577';c.strokeRect(x,320,176,116);
  for(let i=0;i<3;i++){c.fillStyle='#b6b39a';c.fillRect(x+14+i*52,337,40,71);c.strokeStyle='#5e6b60';for(let j=0;j<4;j++){c.beginPath();c.moveTo(x+20+i*52,350+j*11);c.lineTo(x+46+i*52,350+j*11);c.stroke();}}
 }else if(id==='ch1:room:millpond'){
  // Low irrigation troughs stop before the live channel; no new safe footing.
  for(const [start,end] of [[310,520],[1470,1640]]){const x=screen(start),w=end-start;
   c.fillStyle='#384f48';c.fillRect(x,566,w,18);c.strokeStyle='#95b4a0';c.lineWidth=2;c.strokeRect(x,566,w,18);
   c.fillStyle='#72b5b5';c.fillRect(x+7,571,w-14,5);for(let i=20;i<w;i+=48){c.fillStyle='#5a7663';c.fillRect(x+i,580,7,10);}}
 }else if(id==='ch1:room:cooling-gallery'){
  for(const [start,end] of [[280,790],[1050,1910]]){const x=screen(start),w=end-start;
   c.strokeStyle='#382c29';c.lineWidth=18;c.beginPath();c.moveTo(x,545);c.lineTo(x+w,545);c.stroke();
   c.strokeStyle='#9c8061';c.lineWidth=10;c.stroke();for(let i=0;i<w;i+=85){c.fillStyle='#4b4840';c.fillRect(x+i,534,8,22);}
   c.strokeStyle='#bd9c73';c.lineWidth=2;c.beginPath();c.moveTo(x,541);c.lineTo(x+w,541);c.stroke();}
 }else if(id==='ch1:room:star-archive'){
  // Records live above the service shelves, away from floor warning circles.
  for(const world of [390,810,1230,1650,1990]){const x=screen(world);if(x<-140||x>this.w)continue;
   c.fillStyle='#1b2b38d9';c.fillRect(x,270,118,160);c.strokeStyle='#75858d';c.lineWidth=3;c.strokeRect(x,270,118,160);
   for(let row=0;row<3;row++){const y=280+row*48;c.fillStyle='#637277';c.fillRect(x+6,y+38,106,4);
    for(let col=0;col<6;col++){c.fillStyle=col%2?'#83958f':'#a5aa91';c.fillRect(x+12+col*16,y+4,9,32);c.fillStyle='#334751';c.fillRect(x+14+col*16,y+11,5,3);}}}
 }
 c.restore();
};
const chapterSky=R.skyline;R.skyline=function(level){chapterSky.call(this,level);this.chapterRoomBackdrop(level);};
const object=R.object;R.object=function(){const t=this.t;if(this.app.settings.reduceMotion)this.t=0;object.apply(this,arguments);this.t=t;};
const event=R.event;R.event=function(e){event.call(this,e);if(e.type==='parry'){this.burst(e.x,e.y,'#b6ffe0',this.app.settings.reduceMotion?7:25,130);this.labels.push({x:e.x,y:e.y-35,text:'PARRY',color:'#d6ffe9',life:.8});}};
const hero=R.hero;R.hero=function(p,ghost){hero.call(this,p,ghost);if(ghost||(!p.parry&&!p.guardFlash))return;const c=this.c,x=p.x+14-this.cam,y=p.y+26,face=p.face;c.save();c.strokeStyle=p.guardFlash>0?'#dcffe9':'#a9e8d7';c.lineWidth=p.guardFlash>0?4:2;c.beginPath();c.arc(x,y,37,face>0?-.95:Math.PI-.95,face>0?.95:Math.PI+.95);c.stroke();this.glow(x+face*27,y,35,'#a4efd4',.12);c.restore();};
const draw=R.draw;R.draw=function(dt){draw.call(this,dt);const g=this.app.game;if(!g.progress||g.status==='menu'||g.bossActive||this.app.paused||this.app.miniMap===false||this.w<780||this.canvas.clientWidth<640||this.canvas.clientHeight<300)return;const c=this.c,l=g.level,mw=205,mh=59,x=this.w-mw-30,y=636,scale=(mw-22)/l.width;c.save();c.setTransform(this.sx,0,0,this.sy,0,-(this.camY||0)*this.sy);c.fillStyle='#0b2027da';c.fillRect(x,y,mw,mh);c.strokeStyle='#839d7a70';c.lineWidth=1;c.strokeRect(x,y,mw,mh);c.font='8px Trebuchet MS';c.fillStyle='#cfcead';c.textAlign='left';c.fillText('THE PATH AHEAD',x+10,y+13);for(const s of l.solids){c.fillStyle=s.oneWay?'#779b8a':'#a0b497';c.fillRect(x+10+s.x*scale,y+43-(590-s.y)*.06,Math.max(1,s.w*scale),s.oneWay?2:3);}for(const s of l.sigils){c.fillStyle=g.has('sigils',s.id)?'#a4efce':'#e6ba78';c.fillRect(x+8+s.x*scale,y+32-(590-s.y)*.06,4,4);}c.fillStyle='#f5ead0';c.beginPath();c.arc(x+10+g.p.x*scale,y+31,3,0,Math.PI*2);c.fill();if(l.boss){c.fillStyle=g.boss?.hp>0?'#e9ad7e':'#a7e9c2';c.fillRect(x+8+l.boss.x*scale,y+34,5,5);}const d=root.EW.ChapterData;if(d&&g.progress.mode==='story'){for(const door of Object.values(d.doors))if(door.sourceScene===g.scene?.id){c.fillStyle='#a5e7db';c.fillRect(x+9+(door.source.x+door.source.w/2)*scale,y+34,3,7);}for(const m of Object.values(d.interactions))if(m.sceneId===g.scene?.id){c.fillStyle='#e6cb91';c.fillRect(x+9+m.x*scale,y+29,3,3);}}c.restore();};
const bind=A.bind;A.bind=function(){bind.call(this);this.miniMap=true;try{this.miniMap=this.storage?.getItem('EW_MINIMAP_V1')!=='false';}catch(_){}this.mount.addEventListener('input',e=>{if(e.target.dataset.setting==='miniMap'){this.miniMap=e.target.checked;try{this.storage?.setItem('EW_MINIMAP_V1',String(this.miniMap));}catch(_){}}});};
const settings=A.settingsPanel;A.settingsPanel=function(){settings.call(this);const row=document.createElement('div');row.className='optionrow';row.innerHTML='<label for="set-minimap">Live path map<small>Shown when the scene has room (at least 640 × 300 px); the detailed world map is always available.</small></label><input id="set-minimap" data-setting="miniMap" type="checkbox" '+(this.miniMap?'checked':'')+'>';document.getElementById('modal-content').append(row);};
})(typeof window!=='undefined'?window:globalThis);
