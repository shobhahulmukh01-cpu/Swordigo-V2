'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../assets/scripts/camera-v13.js');
const view=(over={})=>({width:1280,levelWidth:5200,key:'moonroot',dt:1/120,player:{x:1200,w:28,vx:0,face:1},...over});
test('camera is immutable and stationary turns do not change framing',()=>{
 const v=view(),p=JSON.stringify(v);let s=C.follow(null,v),initial=s.cam;
 for(let i=0;i<240;i++)s=C.follow(s,{...v,player:{...v.player,face:i%2?-1:1}});
 assert.equal(s.cam,initial);assert.equal(JSON.stringify(v),p);
 const before=JSON.stringify(s);C.follow(s,v);assert.equal(JSON.stringify(s),before);
});
test('short ultrawide room cannot produce negative camera or drift',()=>{
 let s=null;for(let i=0;i<240;i++){s=C.follow(s,view({width:2500,levelWidth:1800,player:{x:900,w:28,vx:-360}}));assert.equal(s.cam,0);}
});
test('scene and viewport changes rebase safely; movement keeps the hero visible',()=>{
 let s=null;for(let i=0;i<1200;i++){const p={x:100+i*3,w:28,vx:360};s=C.follow(s,view({player:p}));assert(s.cam>=0&&s.cam<=3920);assert(p.x>=s.cam&&p.x+p.w<=s.cam+1280);}
 s=C.follow(s,view({width:540,key:'rootcellar',levelWidth:1800,player:{x:900,w:28,vx:0}}));
 assert(s.cam>=0&&s.cam<=1260);assert(900>=s.cam&&928<=s.cam+540);
});
test('world edges and narrow viewports keep ordered visibility bounds inside the level',()=>{
 const cases=[
  {width:1280,levelWidth:5200,player:{x:0,w:28,vx:-360},expected:0},
  {width:1280,levelWidth:5200,player:{x:5172,w:28,vx:360},expected:3920},
  {width:120,levelWidth:600,player:{x:250,w:28,vx:0}}
 ];
 for(const c of cases){
  const input=view(c),before=JSON.stringify(input),s=C.follow(null,input),limit=Math.max(0,c.levelWidth-c.width);
  assert(s.cam>=0&&s.cam<=limit);if(c.expected!==undefined)assert.equal(s.cam,c.expected);
  assert(c.player.x>=s.cam&&c.player.x+c.player.w<=s.cam+c.width);
  assert.equal(JSON.stringify(input),before);
 }
});
test('player wider than the viewport remains finite and world-bounded without input mutation',()=>{
 const input=view({width:90,levelWidth:600,player:{x:200,w:140,vx:360}}),before=JSON.stringify(input);
 let s=null;for(let i=0;i<120;i++){s=C.follow(s,input);assert(Number.isFinite(s.cam));assert(s.cam>=0&&s.cam<=510);}
 const margin=Math.min(32,input.width*.04),lo=Math.max(0,Math.min(510,input.player.x+input.player.w-input.width+margin)),hi=Math.max(0,Math.min(510,input.player.x-margin));
 assert(s.cam>=Math.min(lo,hi)&&s.cam<=Math.max(lo,hi));assert.equal(JSON.stringify(input),before);
});
test('look-ahead reversal requires a sustained direction, never a face flip',()=>{
 let s=null;for(let i=0;i<120;i++)s=C.follow(s,view({player:{x:1200+i*3,w:28,vx:360}}));
 assert.equal(s.direction,1);s=C.follow(s,view({player:{x:1550,w:28,vx:-360}}));assert.equal(s.direction,1);
 for(let i=0;i<20;i++)s=C.follow(s,view({player:{x:1550-i*3,w:28,vx:-360}}));assert.equal(s.direction,-1);
});
