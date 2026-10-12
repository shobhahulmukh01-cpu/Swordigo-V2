'use strict';
const Q=require('./emberwake-qa.js'),fs=require('node:fs'),path=require('node:path');
const cases=[['story',1/60,'adventure','mercy'],['story',1/120,'veteran','mercy'],['story',1/120,'adventure','rekindle'],['rush',1/120,'veteran','rekindle']];
const results=[],runs=[];
for(const [mode,dt,difficulty,ending]of cases){const r=Q.play(mode,dt,80000,difficulty,ending);let replay=null;if(r.pass){try{replay=Q.replay(r);}catch(e){replay={pass:false,error:e.message};}}results.push({pass:r.pass&&replay?.pass===true,mode,difficulty,ending:r.final.ending,frames:r.frames,deaths:r.final.stats.deaths,error:r.error,replay});runs.push(r);}
const out=path.resolve(process.env.EW_QA_OUTPUT||'qa');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'extended-difficulty-results.json'),JSON.stringify({hashes:Q.hashes,results},null,2)+'\n');
fs.writeFileSync(path.join(out,'extended-difficulty-input-proof.json'),JSON.stringify({hashes:Q.hashes,runs},null,2)+'\n');
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
