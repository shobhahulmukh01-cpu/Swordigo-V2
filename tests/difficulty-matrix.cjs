'use strict';
const Q=require('./emberwake-qa.js'),fs=require('node:fs'),path=require('node:path');
const cases=[['story',1/60,'adventure','mercy'],['story',1/120,'veteran','mercy'],['story',1/120,'adventure','rekindle'],['rush',1/120,'veteran','rekindle']];
// Preserve the four historical cases; add complete optional-route campaigns, not teleport fixtures.
for(const difficulty of ['story','adventure','veteran'])for(const dt of [1/60,1/120])for(const ending of ['mercy','rekindle'])cases.push(['story',dt,difficulty,ending,'optional']);
const results=[],runs=[];
for(const [mode,dt,difficulty,ending,routeMode]of cases){const r=Q.play(mode,dt,80000,difficulty,ending,routeMode||'original');let replay=null;if(r.pass){try{replay=Q.replay(r);}catch(e){replay={pass:false,error:e.message};}}results.push({pass:r.pass&&replay?.pass===true,mode,difficulty,dt,routeMode:r.routeMode,routeLandings:r.routeVisits.length,stateChecks:r.stateHashes.length,ending:r.final.ending,frames:r.frames,deaths:r.final.stats.deaths,error:r.error,replay});runs.push(r);}
const out=path.resolve(process.env.EW_QA_OUTPUT||'qa');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'extended-difficulty-results.json'),JSON.stringify({hashes:Q.hashes,encounterVersion:Q.EW.Encounters.version,scope:'Ordinary-input whole campaigns and exact replays; optional cases land on every declared branch path/return platform. No browser or human pacing evidence.',results},null,2)+'\n');
fs.writeFileSync(path.join(out,'extended-difficulty-input-proof.json'),JSON.stringify({hashes:Q.hashes,runs},null,2)+'\n');
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
