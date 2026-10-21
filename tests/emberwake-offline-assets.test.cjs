const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const art=['chapter-millpond.webp','chapter-cooling.webp','chapter-rootcellar.webp','chapter-archive.webp'];
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'emberwake-art-worker-'));fs.cpSync('assets',path.join(dir,'assets'),{recursive:true});fs.copyFileSync('index.html',path.join(dir,'index.html'));return dir;}
test('all original and authored room plates are content-verified offline install members',()=>{
 const dir=fixture();try{execFileSync(process.execPath,[path.resolve('scripts/prepare-emberwake.mjs')],{cwd:dir});
 const worker=fs.readFileSync(path.join(dir,'sw.js'),'utf8'),hashes=JSON.parse(worker.match(/\bHASHES=(\{[^\n]+?\}),FILES=/)[1]);
 for(const name of [...art,'emberwake_panorama.png','moonroot_hd.webp','cinderworks_hd.webp','hollowspire_hd.webp']){
  const p='assets/images/'+name;assert.equal(hashes[p],createHash('sha256').update(fs.readFileSync(path.join(dir,p))).digest('hex'));
 }
 const atlas='assets/art/terrain-materials-v13.png';
 assert.equal(hashes[atlas],createHash('sha256').update(fs.readFileSync(path.join(dir,atlas))).digest('hex'));
 assert(!worker.includes('skipWaiting('));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('missing terrain atlas refuses preparation rather than silently weakening the material fallback contract',()=>{
 const dir=fixture();try{fs.unlinkSync(path.join(dir,'assets/art/terrain-materials-v13.png'));assert.throws(()=>execFileSync(process.execPath,[path.resolve('scripts/prepare-emberwake.mjs')],{cwd:dir,stdio:'pipe'}));}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('missing authored art refuses preparation rather than silently shipping incomplete room identities',()=>{
 const dir=fixture();try{fs.unlinkSync(path.join(dir,'assets/images',art[0]));assert.throws(()=>execFileSync(process.execPath,[path.resolve('scripts/prepare-emberwake.mjs')],{cwd:dir,stdio:'pipe'}));}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
