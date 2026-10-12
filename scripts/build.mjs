import * as fs from 'node:fs';
import {resolve,join,dirname,parse} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {scanBuffer} from './check-secrets.mjs';
export const LIMITS={file:16777216,total:67108864,entries:2048,depth:16};
export const sha=b=>createHash('sha256').update(b).digest('hex');
const bad=m=>{throw Error(m);};
const exists=p=>{try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
function links(p){for(let q=resolve(p);q!==parse(q).root;q=dirname(q))if(fs.lstatSync(q).isSymbolicLink())bad('Symlink refused');}
function read(p,cap=LIMITS.file){const s=fs.lstatSync(p);if(!s.isFile()||s.size>cap)bad('File/cap refused');const fd=fs.openSync(p,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));try{const t=fs.fstatSync(fd);if(!t.isFile()||t.size!==s.size||t.size>cap)bad('Changed file');const b=fs.readFileSync(fd);if(b.length!==t.size)bad('Changed file');return b;}finally{fs.closeSync(fd);}}
function safe(p){if(!/^[A-Za-z0-9_./-]+$/.test(p)||p.split('/').some(x=>!x||x.startsWith('.'))||/(^|\/)(tests?|fixtures?|node_modules)(\/|$)|\.(test|spec)\.[^/]+$/i.test(p)||scanBuffer(Buffer.from(p)).length)bad('Unsafe public path');}
function gather(root){links(root);const files=new Map(),dirs=new Set(['assets']);let total=0,n=0;
function file(p){const b=read(join(root,p));if((total+=b.length)>LIMITS.total||scanBuffer(b).length)bad('Runtime cap/secret refused');files.set(p,b);}
function walk(p,d){safe(p);if(d>LIMITS.depth||++n>LIMITS.entries)bad('Tree cap');const s=fs.lstatSync(join(root,p));if(s.isSymbolicLink())bad('Symlink refused');if(s.isDirectory()){dirs.add(p);for(const x of fs.readdirSync(join(root,p)).sort())walk(p+'/'+x,d+1);}else file(p);}
file('index.html');if(exists(join(root,'sw.js')))file('sw.js');if(!fs.lstatSync(join(root,'assets')).isDirectory())bad('Missing assets');walk('assets',0);return {files,dirs};}
const meta=files=>({version:1,managedBy:'emberwake-release-v1',files:[...files.keys()].sort().map(path=>({path,bytes:files.get(path).length,sha256:sha(files.get(path))}))});
const encode=m=>JSON.stringify(m,null,2)+'\n';
export function loadDist(root){root=resolve(root);links(root);if(fs.readdirSync(root).sort().join('|')!==['assets','index.html','integrity.json',...(exists(join(root,'sw.js'))?['sw.js']:[])].sort().join('|'))bad('Unknown dist');const raw=read(join(root,'integrity.json'),4194304),tree=gather(root),manifest=meta(tree.files);if(raw.toString('utf8')!==encode(manifest))bad('Unmanaged/tampered dist');const dirs=new Set(['assets']);for(const p of tree.files.keys())for(let d=dirname(p);d!=='.';d=dirname(d))dirs.add(d.replaceAll('\\','/'));if([...tree.dirs].some(d=>!dirs.has(d)))bad('Unknown directory');tree.files.set('integrity.json',raw);return {...tree,manifest};}
export function build(root=process.cwd()){root=resolve(root);const tree=gather(root),dist=join(root,'dist'),had=exists(dist);if(had)loadDist(dist);const stage=fs.mkdtempSync(join(root,'.release-')),old=stage+'.old';try{fs.mkdirSync(join(stage,'assets'));for(const [p,b] of tree.files){fs.mkdirSync(dirname(join(stage,p)),{recursive:true});fs.writeFileSync(join(stage,p),b,{flag:'wx'});}fs.writeFileSync(join(stage,'integrity.json'),encode(meta(tree.files)),{flag:'wx'});loadDist(stage);if(had){loadDist(dist);fs.renameSync(dist,old);}else if(exists(dist))bad('Dist appeared');try{fs.renameSync(stage,dist);}catch(e){if(had)fs.renameSync(old,dist);throw e;}if(had)fs.rmSync(old,{recursive:true});return meta(tree.files);}finally{if(exists(stage))fs.rmSync(stage,{recursive:true});}}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{if(process.argv.length>3)bad('Usage: build.mjs [sourceRoot]');console.log('Built '+build(process.argv[2]).files.length+' runtime files');}catch(e){console.error('Build refused: '+(e.code||e.message));process.exitCode=1;}}
