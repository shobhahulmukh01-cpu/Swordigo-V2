import * as fs from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
const rules=[
['GitHub token',/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
['GitHub fine-grained token',new RegExp('github_'+'pat_'+'[A-Za-z0-9_]{20,}','g')],
['private key',/-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
['AWS access ID',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
['AWS labelled secret',/\baws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+]{40}\b/gi]
];
export function scanBuffer(buf){
const text=buf.toString('utf8'),out=[];
for(const [kind,re] of rules){re.lastIndex=0;for(const m of text.matchAll(re))
out.push({kind,line:1+text.slice(0,m.index).split('\n').length-1});}
return out;
}
export function redact(text){for(const [kind,re] of rules){re.lastIndex=0;text=text.replace(re,'[REDACTED:'+kind+']');}return text;}
export function scanRepository(root=process.cwd()){
root=resolve(root);let bytes=0,count=0;const findings=[];
function walk(p){
if(++count>4096)throw Error('Scanner entry cap');
const s=fs.lstatSync(p);if(s.isSymbolicLink())throw Error('Scanner refuses symlinks');
if(s.isDirectory())for(const n of fs.readdirSync(p).sort()){
if(!['.git','node_modules'].includes(n))walk(join(p,n));
}else if(s.isFile()){
if(s.size>16*1024*1024||(bytes+=s.size)>128*1024*1024)throw Error('Scanner byte cap');
const b=fs.readFileSync(p);if(b.includes(0))return;
for(const hit of scanBuffer(b))findings.push({path:redact(relative(root,p)),...hit});
}else throw Error('Scanner refuses special files');
}
walk(root);return findings;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
try{if(process.argv.length>3)throw Error('Usage: check-secrets.mjs [root]');
const hits=scanRepository(process.argv[2]);console.log(JSON.stringify({findings:hits}));
process.exitCode=hits.length?1:0;
}catch(e){console.error(redact('Secret scan failed: '+(e.code||e.message)));process.exitCode=1;}
}
