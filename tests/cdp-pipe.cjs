#!/usr/bin/env node
/* Chromium CDP JSON-line bridge over anonymous process pipes. No HTTP listener,
   outbound requests, credentials, npm packages or shell command interpolation. */
'use strict';
const {spawn}=require('node:child_process');
const readline=require('node:readline');
const binary=process.argv[2];if(!binary){console.error('Usage: node cdp-pipe.cjs <chromium> [flags]');process.exit(2);}
const flags=process.argv.slice(3).filter(x=>!x.startsWith('--remote-debugging-port'));
flags.push('--remote-debugging-pipe');
const chrome=spawn(binary,flags,{stdio:['ignore','ignore','inherit','pipe','pipe']});
chrome.on('error',e=>{console.error(e.message);process.exit(1);});
let pending=Buffer.alloc(0);
chrome.stdio[4].on('data',b=>{
 pending=Buffer.concat([pending,b]);if(pending.length>32*1024*1024){console.error('CDP frame exceeded bounded bridge size');chrome.kill();process.exit(1);}
 let at;while((at=pending.indexOf(0))!==-1){const message=pending.subarray(0,at);pending=pending.subarray(at+1);if(message.length)process.stdout.write(message.toString('utf8')+'\n');}
});
const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
input.on('line',line=>{try{const msg=JSON.parse(line);if(!Number.isInteger(msg.id)||typeof msg.method!=='string')throw Error('Invalid CDP envelope');chrome.stdio[3].write(JSON.stringify(msg)+'\0');}catch(e){console.error(e.message);chrome.kill();process.exit(1);}});
input.on('close',()=>chrome.kill('SIGTERM'));
process.on('SIGTERM',()=>chrome.kill('SIGTERM'));
process.on('SIGINT',()=>chrome.kill('SIGINT'));
chrome.on('exit',code=>{input.close();process.exit(code===null?0:code);});
