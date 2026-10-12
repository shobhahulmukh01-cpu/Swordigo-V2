import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadDist,sha} from './build.mjs';
const mime=Object.fromEntries('html:text/html js:application/javascript css:text/css json:application/json svg:image/svg+xml png:image/png jpg:image/jpeg jpeg:image/jpeg webp:image/webp ico:image/x-icon mp3:audio/mpeg ogg:audio/ogg wav:audio/wav m4a:audio/mp4 woff:font/woff woff2:font/woff2 ttf:font/ttf otf:font/otf'.split(' ').map(x=>{const [e,t]=x.split(':');return ['.'+e,t+(['html','js','css','json'].includes(e)?'; charset=utf-8':'')];}));
export function requestHandler(rootDir,basePath='/'){
if(typeof basePath!=='string'||!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(basePath))throw Error('Invalid base path');
const {files,dirs}=loadDist(rootDir),hashes=new Set(),tags=new Map([...files].map(([p,b])=>[p,'"'+sha(b)+'"']));
const html=new TextDecoder('utf-8',{fatal:true}).decode(files.get('index.html')).replace(/\r\n?/g,'\n');
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(!/(?:^|\s)src\s*=/i.test(m[1]))hashes.add("'sha256-"+createHash('sha256').update(m[2]).digest('base64')+"'");
const common={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; script-src 'self' "+[...hashes].sort().join(' ')+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; worker-src 'none'"};
return (req,res)=>{
function send(s,b='',h={}){b=Buffer.isBuffer(b)?b:Buffer.from(b);res.writeHead(s,{...common,'Content-Type':'text/plain; charset=utf-8',...(s===304?{}:{'Content-Length':b.length}),...h});res.end(req.method==='HEAD'||s===304?undefined:b);}
const host=req.headers?.host,m=typeof host==='string'&&/^(?:127\.0\.0\.1|localhost|\[::1\])(?::([0-9]{1,5}))?$/i.exec(host);
if(!m||(m[1]&&+m[1]>65535))return send(403,'Host refused');
if(req.rawHeaders&&req.rawHeaders.filter((v,i)=>i%2===0&&v.toLowerCase()==='host').length!==1)return send(400,'Bad Host count');
if(!['GET','HEAD'].includes(req.method))return send(405,'Method refused',{Allow:'GET, HEAD'});
const u=req.url;if(typeof u!=='string'||u.length>4096)return send(414,'URI cap');
if(!u.startsWith('/')||u.startsWith('//')||/[\\%\x00-\x20\x7f#]/.test(u))return send(400,'Unsafe URI');
const path=u.split('?')[0];if(!/^[A-Za-z0-9_./-]+$/.test(path)||path.includes('//'))return send(400,'Unsafe path');
if(path.split('/').some(x=>x.startsWith('.')))return send(403,'Dot path');
if(basePath!=='/'&&path===basePath.slice(0,-1))return send(308,'',{Location:basePath});
if(!path.startsWith(basePath))return send(404,'Not found');
let p=path.slice(basePath.length),slash=p.endsWith('/');if(slash)p=p.slice(0,-1);
if(!p||dirs.has(p)){if(p&&!slash)return send(308,'',{Location:basePath+p+'/'});p=p?p+'/index.html':'index.html';}else if(slash)return send(404,'Not found');
const b=files.get(p);if(!b)return send(404,'Not found');
const h={'Content-Type':mime[extname(p).toLowerCase()]||'application/octet-stream',ETag:tags.get(p)},match=req.headers['if-none-match'];
if(typeof match==='string'&&match.split(',').some(v=>v.trim()==='*'||v.trim().replace(/^W\//,'')===h.ETag))return send(304,'',h);
send(200,b,h);
};}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){try{const o={port:'4173',base:'/',root:'dist'};for(let i=2;i<process.argv.length;i+=2){const k=process.argv[i].slice(2);if(!process.argv[i].startsWith('--')||!Object.hasOwn(o,k)||!process.argv[i+1])throw Error('Bad option');o[k]=process.argv[i+1];}if(!/^\d{1,5}$/.test(o.port)||+o.port>65535)throw Error('Invalid port');const s=createServer(requestHandler(resolve(o.root),o.base));s.on('error',e=>{console.error('Server failed: '+e.code);process.exitCode=1;});s.listen({host:'127.0.0.1',port:+o.port,exclusive:true},()=>console.log('Serving http://127.0.0.1:'+s.address().port+o.base));for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>s.close());}catch(e){console.error('Server refused: '+(e.code||e.message));process.exitCode=1;}}
