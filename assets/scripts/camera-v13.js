/* Renderer-only camera state. No simulation coordinates, input or save writes. */
(function(root){'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function follow(previous,view){
 const w=Math.max(1,view.width),limit=Math.max(0,view.levelWidth-w),p=view.player;
 const dt=clamp(Number.isFinite(view.dt)?view.dt:0,0,.05),center=p.x+p.w/2;
 const fresh=!previous||previous.key!==view.key||previous.width!==w;
 const s=fresh?{key:view.key,width:w,cam:clamp(center-w*.39,0,limit),direction:0,candidate:0,age:0,lead:0}:{...previous};
 const vx=Number.isFinite(p.vx)?p.vx:0,dir=Math.abs(vx)>35?Math.sign(vx):0;
 if(dir!==s.candidate){s.candidate=dir;s.age=0;}else s.age+=dt;
 // Facing changes while stationary never pull the world left/right. A running
 // reversal must persist before look-ahead changes direction.
 if(dir&&(!s.direction||s.age>=.12))s.direction=dir;
 const desired=dir&&dir===s.direction?clamp(vx*.16,-60,60):0;
 s.lead+=(desired-s.lead)*Math.min(1,dt*5);
 const anchor=w*.39-s.lead,dead=Math.min(68,w*.075),offset=center-s.cam-anchor;
 let target=s.cam;
 if(Math.abs(offset)>dead)target=center-anchor-Math.sign(offset)*dead;
 target=clamp(target,0,limit);
 s.cam=clamp(s.cam+(target-s.cam)*Math.min(1,dt*5),0,limit);
 // Render-only visibility safety after a very fast displacement/resize.
 const margin=Math.min(32,w*.04);
 const lo=clamp(p.x+p.w-w+margin,0,limit),hi=clamp(p.x-margin,0,limit);
 s.cam=clamp(s.cam,Math.min(lo,hi),Math.max(lo,hi));
 return s;
}
const api={follow};if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.EWCamera=api;
})(typeof globalThis!=='undefined'?globalThis:this);
