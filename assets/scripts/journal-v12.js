/* Derived courier journal: every state comes from existing V3 flags. No new save fields. */
(function(root){'use strict';
const chapters=[
 {id:'moonroot',title:'Letters to spring',returnText:'Mara: You brought back a season, not a promise that it will last forever. That is enough to plant again.',found:'Mara: The garden letters were waiting in the branches. Keep them: the people we become will need to remember this winter.',search:'Mara: One letter waits by the landing. Another rests above the eastern road. Follow the Springward Canopy from the second rune.'},
 {id:'cinderworks',title:'A summer, not a fuel',returnText:'Tovan: The clocks are moving. My daughter will grow older. I had forgotten that this was the gift, not the price.',found:'Tovan: A named coal and a chain-breaker’s tools. We can build a furnace that warms a home without burning its future.',search:'Tovan: Look for the named coal on the low road, then take the Cold Service Gantry toward the tool cache. The cold span crosses above the molten gap.'},
 {id:'hollowspire',title:'The unwritten names',returnText:'Orin: I have opened the archive. Tomorrow’s names belong to those who choose them, not to a crown.',found:'Orin: The decree and Veyr’s unsent letter tell different halves of the same fear. Remember both before you write your final line.',search:'Orin: The low hall keeps the last decree. The Unwritten Observatory leads toward the regent’s unsent letter. A missing ending is not the same as hope.'}
];
function read(progress,levels){return levels.map((l,i)=>{const p=progress?.flags,seen=!!p?.seen.includes(l.id),letters=seen?l.chests.filter(c=>p.chests.includes(c.id)).length:0,heart=!!l.boss&&!!p?.defeated.includes(l.boss.id);return Object.freeze({id:l.id,title:chapters[i].title,seen,letters,total:l.chests.length,heart,status:!seen?'Undiscovered':heart&&letters===l.chests.length?'Heart restored · all letters remembered':heart?'Heart restored · letters still waiting':letters===l.chests.length?'Letters remembered · heart still sleeping':`${letters}/${l.chests.length} letters remembered`,route:seen&&progress.mode==='story'?l.routes?.[0]||null:null});});}
function lines(g){const i=g.sceneRealmIndex??g.progress.level,l=g.current,chapter=chapters[i],entry=read(g.progress,g.levels)[i];if(!chapter||!entry)return l.npc?.lines||[];const selected=root.EW?.ChapterData?.selectStory(g.progress,g.chapter||{},{type:'npc',realmId:l.id});return [...(l.npc?.lines||[]),entry.heart?chapter.returnText:entry.letters===entry.total?chapter.found:chapter.search,...(l.npc?selected?.lines||[]:[])];}
// Current-journey entitlement only; never replay the cache acquisition/reward path.
function rememberedLetters(progress,levels=[]){
 if(progress?.mode!=='story')return Object.freeze([]);
 const seen=new Set(progress.flags?.seen||[]),earned=new Set(progress.flags?.chests||[]);
 return Object.freeze(levels.flatMap(l=>seen.has(l.id)?(l.chests||[]).filter(c=>earned.has(c.id)&&typeof c.lore==='string'&&c.lore.length).map(c=>Object.freeze({id:c.id,realmId:l.id,realmName:l.name,text:c.lore})):[]));
}
const api=Object.freeze({read,lines,rememberedLetters});root.EW_JOURNAL=api;
if(root.EW){const G=root.EW.Game.prototype,interact=G.interact;G.interact=function(){const n=this.status==='playing'&&this.progress?.mode==='story'?this.findNearby():null;if(n?.type==='npc'){this.emit('dialogue',{speaker:n.item.name,lines:lines(this)});return;}return interact.apply(this,arguments);};}
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
