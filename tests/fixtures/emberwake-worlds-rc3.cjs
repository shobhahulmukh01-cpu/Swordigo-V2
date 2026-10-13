/* Original world layouts, narrative and encounter data for EMBERWAKE. */
(function(root){'use strict';
const EW_LEVELS=[
{
 id:'moonroot',name:'Moonroot Vale',width:4800,heart:'Rootheart',subtitle:'Where the trees forgot spring',
 palette:{bg:'#0b2426',far:'#174440',near:'#285c4c',ground:'#254b41',accent:'#8bf0cf',hazard:'#bd7492'},
 objective:'Release two world-runes. Recover the Rootheart.',hint:'Cast a lumen bolt at each sealed rune, then touch its light. Double-jump up the low branches.',
 intro:["Lyra: My letter says ‘To whoever I become.’ Nobody becomes anything anymore.","Aster: The king locked our futures inside three world-hearts. Find the first in Moonroot.","Run, double-jump, and cast at the two floating runes. The eastern guardian holds the way onward."],
 lore:'The crown stopped the seasons. Roots remember the direction of spring.',
 solids:[{id:'m-g0',x:0,y:590,w:780,h:170},{id:'m-g1',x:900,y:590,w:760,h:170},{id:'m-g2',x:1800,y:590,w:800,h:170},{id:'m-g3',x:2740,y:590,w:2060,h:170},{id:'m-a0',x:1060,y:480,w:160,h:18,oneWay:true},{id:'m-a1',x:1240,y:370,w:180,h:18,oneWay:true},{id:'m-b0',x:2060,y:480,w:160,h:18,oneWay:true},{id:'m-b1',x:2240,y:370,w:180,h:18,oneWay:true},{id:'m-bridge',x:1668,y:530,w:124,h:18,oneWay:true},{id:'m-c0',x:2960,y:480,w:180,h:18,oneWay:true},{id:'m-c1',x:3160,y:370,w:180,h:18,oneWay:true}],
 hazards:[{x:780,y:615,w:120,h:150,type:'spikes'},{x:1660,y:615,w:140,h:150,type:'spikes'},{x:2600,y:615,w:140,h:150,type:'spikes'}],
 checkpoints:[{id:'m-cp0',x:150,y:590,name:'Courier’s Landing'},{id:'m-cp1',x:1930,y:590,name:'Lantern Hollow'},{id:'m-cp2',x:3570,y:590,name:'Crownless Watch'}],
 shrines:[{id:'m-sh0',x:405,y:590},{id:'m-sh1',x:2850,y:590}],
 npc:{x:275,y:590,name:'Mara, the last gardener',lines:["The king promised that no one would die. Now nothing can grow.","Aster’s light can unseal the canopy runes. Cast, climb, and collect both before the eastern arch.","Shrines trade gathered embers for stronger steel, a sturdier heart, or brighter magic. Beacons refill every flask."]},
 chests:[{id:'m-ch0',x:475,y:590,gold:60,lore:'A letter to spring: If you return, you will find your garden waiting.'},{id:'m-ch1',x:3250,y:370,gold:85,lore:'The warden never served the crown. It guards the first tree, whose roots cradle our tomorrow.'}],
 sigils:[{id:'m-si0',x:1330,y:370},{id:'m-si1',x:2330,y:370}],
 enemies:[{id:'m-e0',x:640,y:556,type:'crawler',patrol:[570,720]},{id:'m-e1',x:960,y:532,type:'sentinel',patrol:[925,1030]},{id:'m-e2',x:1460,y:327,type:'wisp',patrol:[1460,1460]},{id:'m-e3',x:1840,y:556,type:'crawler',patrol:[1820,1880]},{id:'m-e4',x:2480,y:532,type:'sentinel',patrol:[2445,2515]},{id:'m-e5',x:2890,y:410,type:'wisp',patrol:[2890,2890]},{id:'m-e6',x:3380,y:556,type:'crawler',patrol:[3350,3420]},{id:'m-e7',x:3470,y:532,type:'sentinel',patrol:[3440,3510]}],
 boss:{id:'m-boss',x:4200,y:450,name:'The Thorn Warden',type:'warden',hp:260,arena:[3740,4580]},
 bossIntro:['The Thorn Warden: I guarded tomorrow before your king put a price on it.','Aster: Watch its golden wind-up. Dash through the charge; jump over the ground-wave.'],
 victory:['The first tree exhales. Somewhere, a seed begins to open.','Lyra: One heart remembers. Two are still sleeping. The eastern gate is open.'],exit:{x:4680,y:590}
},
{
 id:'cinderworks',name:'Cinderworks',width:5200,heart:'Forgeheart',subtitle:'The furnace that burns stolen hours',
 palette:{bg:'#271918',far:'#553027',near:'#75452d',ground:'#554233',accent:'#ffc67c',hazard:'#ff6a36'},
 objective:'Release the furnace runes. Recover the Forgeheart.',hint:'Keep above the molten gaps. The furnace titan’s ground-wave can be jumped or dashed.',
 intro:['Beyond the forest, a thousand furnaces keep the frozen kingdom warm.','Tovan: We burn the hours we might have lived. Bring our Forgeheart home.','Aster: The runes are above the old gantries. The titan guards the eastern lift.'],
 lore:'A furnace was made to warm a city. The crown taught it to eat the years.',
 solids:[{id:'c-g0',x:0,y:590,w:900,h:170},{id:'c-g1',x:1040,y:590,w:1060,h:170},{id:'c-g2',x:2260,y:590,w:1120,h:170},{id:'c-g3',x:3540,y:590,w:1660,h:170},{id:'c-a0',x:1180,y:480,w:160,h:20,oneWay:true},{id:'c-a1',x:1360,y:370,w:190,h:20,oneWay:true},{id:'c-b0',x:2450,y:480,w:180,h:20,oneWay:true},{id:'c-b1',x:2670,y:370,w:190,h:20,oneWay:true},{id:'c-gap0',x:2110,y:520,w:135,h:20,oneWay:true},{id:'c-gap1',x:3390,y:510,w:135,h:20,oneWay:true},{id:'c-c0',x:3700,y:480,w:180,h:20,oneWay:true},{id:'c-c1',x:3910,y:370,w:180,h:20,oneWay:true}],
 hazards:[{x:900,y:615,w:140,h:150,type:'lava'},{x:2100,y:615,w:160,h:150,type:'lava'},{x:3380,y:615,w:160,h:150,type:'lava'}],
 checkpoints:[{id:'c-cp0',x:150,y:590,name:'The Cold Anvil'},{id:'c-cp1',x:2340,y:590,name:'Hourglass Bridge'},{id:'c-cp2',x:4100,y:590,name:'Titan’s Threshold'}],shrines:[{id:'c-sh0',x:420,y:590},{id:'c-sh1',x:3630,y:590}],
 npc:{x:275,y:590,name:'Tovan, the furnace keeper',lines:['This fire was meant to keep our children warm, not keep them children forever.','I left my best tools in the gantries. Take the caches. Grow stronger before the titan.','A blue lantern warns before it fires. A yellow glow warns before a charge. Color is not the only clue: watch their pose.']},
 chests:[{id:'c-ch0',x:1900,y:590,gold:90,lore:'Every coal bears a name. One reads: the summer my daughter learned to swim.'},{id:'c-ch1',x:4000,y:370,gold:105,lore:'The titan was built to break chains. It has forgotten the difference between a chain and a hand.'}],
 sigils:[{id:'c-si0',x:1450,y:370},{id:'c-si1',x:2770,y:370}],
 enemies:[{id:'c-e0',x:680,y:532,type:'sentinel',patrol:[620,770]},{id:'c-e1',x:1090,y:556,type:'crawler',patrol:[1070,1130]},{id:'c-e2',x:1630,y:350,type:'wisp',patrol:[1630,1630]},{id:'c-e3',x:1940,y:532,type:'sentinel',patrol:[1870,2010]},{id:'c-e4',x:2360,y:556,type:'crawler',patrol:[2290,2400]},{id:'c-e5',x:2930,y:330,type:'wisp',patrol:[2930,2930]},{id:'c-e6',x:3210,y:532,type:'sentinel',patrol:[3110,3300]},{id:'c-e7',x:3600,y:556,type:'crawler',patrol:[3560,3660]},{id:'c-e8',x:3990,y:532,type:'sentinel',patrol:[3910,4040]}],
 boss:{id:'c-boss',x:4660,y:450,name:'The Hour-Eater',type:'forge',hp:340,arena:[4250,5010]},bossIntro:['The Hour-Eater: Every second you steal will be paid in flame.','Aster: The cracks glow before it slams. Leap over the wave, then strike while it cools.'],victory:['The furnaces dim. Not from cold—from finally having enough.','A clock strikes once, then twice. Lyra’s letter grows warm.'],exit:{x:5100,y:590}
},
{
 id:'hollowspire',name:'The Hollow Spire',width:5600,heart:'Dawnheart',subtitle:'A palace with no tomorrow',
 palette:{bg:'#141d2a',far:'#303c50',near:'#526071',ground:'#3f4d60',accent:'#cbdfff',hazard:'#a87991'},
 objective:'Release the crown runes. Deliver tomorrow back.',hint:'The regent marks the ground before light falls. Keep moving; strike during recovery.',
 intro:['Above the cloudline stands a palace built from all the futures the king would not allow.','Lyra: My letter is almost blank now. Maybe I must write the last line myself.','Aster: Find the last two runes. The king is waiting beyond the broken hall.'],
 lore:'The throne has no heir. No one in the kingdom has been allowed to become someone new.',
 solids:[{id:'h-g0',x:0,y:590,w:720,h:170},{id:'h-g1',x:850,y:590,w:990,h:170},{id:'h-g2',x:2010,y:590,w:1170,h:170},{id:'h-g3',x:3340,y:590,w:2260,h:170},{id:'h-a0',x:1150,y:480,w:170,h:18,oneWay:true},{id:'h-a1',x:1370,y:370,w:190,h:18,oneWay:true},{id:'h-b0',x:2400,y:480,w:170,h:18,oneWay:true},{id:'h-b1',x:2610,y:370,w:190,h:18,oneWay:true},{id:'h-gap',x:1850,y:520,w:140,h:18,oneWay:true},{id:'h-c0',x:3780,y:480,w:180,h:18,oneWay:true},{id:'h-c1',x:3990,y:370,w:200,h:18,oneWay:true}],
 hazards:[{x:720,y:615,w:130,h:150,type:'spikes'},{x:1840,y:615,w:170,h:150,type:'spikes'},{x:3180,y:615,w:160,h:150,type:'spikes'}],
 checkpoints:[{id:'h-cp0',x:150,y:590,name:'The Broken Observatory'},{id:'h-cp1',x:2110,y:590,name:'Hall of Unwritten Names'},{id:'h-cp2',x:4380,y:590,name:'The Last Threshold'}],shrines:[{id:'h-sh0',x:415,y:590},{id:'h-sh1',x:3450,y:590}],
 npc:{x:275,y:590,name:'Orin, the crown’s archivist',lines:['I recorded everything the king saved. Then I began recording everything he denied.','He lost one person and decided nobody should ever lose anyone again. Even at the cost of living.','When the Dawnheart is yours, you may restore the future without forgiving its jailer—or give him a tomorrow too.']},
 chests:[{id:'h-ch0',x:1710,y:590,gold:110,lore:'The last royal decree: There shall be no endings. Beneath it, in a child’s hand: Then how will stories begin?'},{id:'h-ch1',x:4090,y:370,gold:135,lore:'Veyr’s unsent letter: I kept the world safe. Why does it feel so empty?'}],
 sigils:[{id:'h-si0',x:1470,y:370},{id:'h-si1',x:2700,y:370}],
 enemies:[{id:'h-e0',x:570,y:532,type:'sentinel',patrol:[520,645]},{id:'h-e1',x:930,y:556,type:'crawler',patrol:[880,1000]},{id:'h-e2',x:1600,y:305,type:'wisp',patrol:[1600,1600]},{id:'h-e3',x:1720,y:532,type:'sentinel',patrol:[1660,1765]},{id:'h-e4',x:2190,y:532,type:'sentinel',patrol:[2150,2260]},{id:'h-e5',x:2880,y:335,type:'wisp',patrol:[2880,2880]},{id:'h-e6',x:3070,y:556,type:'crawler',patrol:[3000,3100]},{id:'h-e7',x:3650,y:532,type:'sentinel',patrol:[3570,3730]},{id:'h-e8',x:4240,y:532,type:'sentinel',patrol:[4190,4290]}],
 boss:{id:'h-boss',x:5000,y:450,name:'Veyr, the Hollow Regent',type:'regent',hp:440,arena:[4540,5380]},bossIntro:['Veyr: I took tomorrow so no one would have to say goodbye.','Lyra: You took every hello that had not happened yet.','Aster: When the crown lifts, falling light marks the ground. Move away, then return to strike.'],victory:['The Dawnheart breaks its silence. Three stolen futures become one rising sun.','Veyr kneels beside the broken crown. Your letter now has room for a final line.'],exit:{x:5480,y:590}
}
];root.EW_LEVELS=EW_LEVELS;if(typeof module!=='undefined'&&module.exports)module.exports=EW_LEVELS;
})(typeof window!=='undefined'?window:globalThis);
