// Campaign proof: only ordinary controls and earned upgrade actions; never inject health/inventory/defeats.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {Game,STEP} from '../src/sim/game.mjs';
const g=new Game(),trace=[];let deaths=0,lastRoom=-1,frame=0;
for(;frame<240000;frame++){
 if(g.progress.room!==lastRoom){trace.push({frame,room:g.room.id,hp:Math.round(g.p.hp),shards:g.progress.shards});lastRoom=g.progress.room;}
 if(g.p.hp<=0){deaths++;g.respawn();if(deaths>50)throw Error('Campaign bot exceeded death budget');}
 while(g.progress.points)g.upgrade(g.progress.vitality<3?'vitality':g.progress.might<8?'might':'arcana');
 let p=g.p,gate=g.room.gate,enemies=g.enemies.filter(e=>e.hp>0&&Math.abs(e.y-p.y)<2.4),target=enemies.filter(e=>e.x>p.x-3).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
 const input={move:1,jumpHeld:false,attack:frame%17===0,cast:null,heal:p.hp<55};
 if(g.room.shrine!==null&&Math.abs(p.x-g.room.shrine)<.4)input.interact=true;
 if(target&&Math.abs(target.x-p.x)<12){let d=target.x-p.x;input.move=Math.abs(d)>1.7?Math.sign(d):Math.sign(d)*.03;if(frame%65===0&&Math.abs(d)<10)input.cast=0;}
 if(gate&&!g.progress.gates.includes(g.room.id)&&p.x<gate.x+1&&p.x>gate.x-6){if(gate.type==='bomb'){input.move=p.x>gate.x-3?0:1;if(frame%70===0)input.cast=1;}else if(gate.type==='frost'){if(g.barrierTimer<=0){input.move=0;if(frame%70===0)input.cast=2;}else{input.jump=frame%40===0;input.jumpHeld=true;}}else{if(p.phase<=0){input.move=0;if(frame%70===0)input.cast=3;}}}
 const obstacle=g.room.solids.find(o=>o.y===0&&o.h>0&&p.x>o.x-4&&p.x<o.x+o.w+.2);
 if(obstacle){input.move=1;input.jumpHeld=true;if(p.grounded||g.progress.abilities.includes('double')&&p.jumps===1&&p.vy<3&&p.y<obstacle.h+.3)input.jump=true;}
 g.update(STEP,input);g.events=[];
 if(g.progress.defeated.includes('hollow-2-boss'))break;
}
assert.ok(frame<240000,'Campaign did not complete');assert.equal(g.progress.shards,6);assert.ok(g.finish('share'));const first=structuredClone(g.progress);assert.ok(g.finish('bind'));assert.equal(g.progress.ending,'bind');
fs.mkdirSync('qa/lumen',{recursive:true});fs.writeFileSync('qa/lumen/campaign.json',JSON.stringify({passed:true,frames:frame,simulationSeconds:frame/60,deaths,trace,shards:first.shards,level:first.level,endingOptions:['share','bind'],method:'Ordinary Game.update inputs plus earned point allocation. No injected stats, items, enemy damage, defeat flags or room skips. Not human play-time or full secret-route coverage.'},null,2));fs.writeFileSync('qa/lumen/completed-save.json',JSON.stringify({version:2,progress:first},null,2));console.log(JSON.stringify({campaign:'passed',frames:frame,deaths,level:first.level,rooms:trace.length}));
