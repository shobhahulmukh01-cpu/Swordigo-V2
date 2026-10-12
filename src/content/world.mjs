export const VERSION='2.0.0-rc.1';
export const SPELLS=[{id:'bolt',name:'Lumen Bolt',cost:12,description:'A ray of dawn. Strikes distant foes; sword swings reflect hostile bolts.'},{id:'bomb',name:'Ember Bomb',cost:24,description:'Detonates at short range. Breaks amber seals.'},{id:'frost',name:'Frost Shard',cost:20,description:'Freezes foes and blue barriers. Frozen barriers lower into stepping stones for eight seconds.'},{id:'phase',name:'Dawnshift',cost:30,description:'For four seconds, pass through violet seals and evade harm.'}];
export const BIOMES=[
 {id:'wood',name:'Whisperwood',subtitle:'Where the old roots remember',sky:0x142d3a,fog:0x224c52,rock:0x364d45,grass:0x709673,accent:0xffcf80,boss:'Briar Warden',reward:'bomb',quote:'A flame is not a weapon until you choose what it burns.'},
 {id:'mine',name:'Glimmerdeep',subtitle:'A thousand stars beneath the earth',sky:0x101c33,fog:0x1c354c,rock:0x39465a,grass:0x7595a9,accent:0x69e7ee,boss:'Quarry Colossus',reward:'double',quote:'The earth held the dawn safe. Or so we told ourselves.'},
 {id:'mire',name:'Mirelake',subtitle:'The water keeps every secret',sky:0x182c32,fog:0x375451,rock:0x425453,grass:0x9bab79,accent:0x9fe6c6,boss:'Mire Oracle',reward:'frost',quote:'Stand still long enough and even grief becomes a bridge.'},
 {id:'ice',name:'Frostfang',subtitle:'Beyond the last warm window',sky:0x233b58,fog:0x637f99,rock:0x8093a8,grass:0xddeaf0,accent:0xb0e6ff,boss:'Rime Sentinel',reward:'dash',quote:'You cannot outrun the cold. You can carry warmth through it.'},
 {id:'forge',name:'Emberforge',subtitle:'The heart of a sleeping furnace',sky:0x2e1c29,fog:0x623834,rock:0x57413d,grass:0xb47755,accent:0xffac61,boss:'Furnace Regent',reward:'phase',quote:'We forged a champion. We forgot to leave room for a person.'},
 {id:'sky',name:'Skyreach',subtitle:'The towers that refused to fall',sky:0x344c64,fog:0x899fa7,rock:0x8e9286,grass:0xc4c3a3,accent:0xffe1a1,boss:'Storm Herald',reward:'shard',quote:'The crown was never the source. We were.'},
 {id:'hollow',name:'Hollowgate',subtitle:'Where your shadow waits',sky:0x1b1532,fog:0x35294e,rock:0x474058,grass:0x9888ac,accent:0xdab3ff,boss:'Hollow Sovereign',reward:'ending',quote:'I carried the light until it became a cage. Will you carry it too?'}
];
export const ENEMIES={crawler:{hp:22,speed:1.8,damage:9,range:1.3,xp:10},knight:{hp:38,speed:2.2,damage:13,range:1.6,xp:16},mage:{hp:28,speed:1,damage:10,range:9,xp:14},bat:{hp:18,speed:3,damage:8,range:1.3,xp:8},boss:{hp:125,speed:2,damage:16,range:2.2,xp:70}};
const floors=w=>[{x:-2,y:-3,w:w+4,h:3}];
export const ROOMS=[{id:'hub',name:'Thistlebrook',subtitle:'A small light in a very wide world',biome:0,width:32,stage:-1,solids:floors(32),platforms:[{x:10,y:2.4,w:4,h:.35},{x:16,y:4.3,w:3,h:.35}],enemies:[],caches:[{id:'hub-cache',x:17.5,y:4.65,value:45}],shrine:5,npc:8,gate:null}];
for(let b=0;b<BIOMES.length;b++) for(let s=0;s<3;s++){
 const i=ROOMS.length,w=[38,42,34][s],bio=BIOMES[b],base=`${bio.id}-${s}`;
 const gate=s===1?(b===1?{type:'bomb',x:24}:b===3?{type:'frost',x:24}:b===5?{type:'phase',x:24}:null):null;
 const platforms=s===2?[{x:5,y:2,w:3,h:.35},{x:25,y:2,w:3,h:.35}]:[{x:8,y:1.7,w:4,h:.35},{x:14,y:3.5,w:3,h:.35},{x:20,y:b>0?5:3.5,w:3,h:.35},{x:30,y:2.3,w:4,h:.35}];
 const types=s===2?['boss']:s===0?['crawler','bat']:['knight','mage'];
 ROOMS.push({id:base,name:bio.name+' · '+['Outer Path','Lost Passage','Sanctum'][s],subtitle:bio.subtitle,biome:b,stage:s,width:w,solids:[...floors(w),...(s===0?[{x:25,y:0,w:2.6,h:b<2?1.35:b===5?3.5:2.8}]:[])],platforms,gate,shrine:s===0?4:s===2?3:null,npc:null,caches:s===2?[]:[{id:base+'-high',x:15.5,y:3.85,value:30+b*8},{id:base+'-east',x:32,y:2.65,value:20+b*5}],enemies:types.map((type,j)=>({id:base+'-'+type,type,x:s===2?20:17+j*13,y:type==='bat'?3.5:0,tier:b,bossName:type==='boss'?bio.boss:null})),index:i});
}
export function objective(g){if(g.progress.ending)return 'The dawn is yours. Explore the world you restored.';if(g.progress.shards>=6)return 'Cross Hollowgate. Face the shadow of the old champion.';return `Recover the Dawn Shards · ${g.progress.shards}/6`}
export const SELA=[{speaker:'Sela · Keeper of Thistlebrook',text:'The sky has forgotten how to become morning. Orrin left for the eastern woods, carrying the last light.'},{speaker:'Wren',text:'Then I will bring him home. And the light with him.'},{speaker:'Sela',text:'Six guardians hold the Dawn Shards. Find their shrines, learn their gifts. Do not mistake a crown for a purpose.'}];
