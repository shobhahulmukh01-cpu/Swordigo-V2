const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function renderer(){
 const source=fs.readFileSync('assets/scripts/client.js','utf8');
 const calls=[],ctx={save(){},restore(){},beginPath(){},moveTo(x,y){calls.push(['move',x,y]);},lineTo(x,y){calls.push(['line',x,y]);},stroke(){},arc(x,y,r){calls.push(['arc',x,y,r]);},fill(){},set strokeStyle(v){},set fillStyle(v){},set lineWidth(v){}};
 const sandbox={console,globalThis:null,document:{createElement(){return {getContext(){return ctx},style:{},append(){},set textContent(_){} };},head:{append(){}},getElementById(){return null}},Image:function(){},matchMedia(){return {matches:false}},requestAnimationFrame(){},performance:{now(){return 0}},localStorage:null};sandbox.globalThis=sandbox;
 vm.runInNewContext(source,sandbox);
 const r=Object.create(sandbox.EWClient.Renderer.prototype);r.c=ctx;r.cam=10;return {r,calls};
}
for(const [type,ox,oy] of [['sentinel',18,25],['wisp',17,20]])for(const dx of [-.8,.8])test(`${type} visual direction equals committed vector ${dx}`,()=>{
 const {r,calls}=renderer(),dy=.6,e={type,hp:1,state:'windup',x:100,y:200,shotAim:{dx,dy}};r.ordinaryAimTell(e);
 const move=calls.find(x=>x[0]==='move'),line=calls.find(x=>x[0]==='line');
 assert.deepEqual(move,['move',100+ox-10,200+oy]);assert.equal(line[1],move[1]+dx*34);assert.equal(line[2],move[2]+dy*34);
});
test('ordinary cue only draws for a living ranged windup with a valid committed direction',()=>{
 for(const e of [{type:'crawler',hp:1,state:'windup',shotAim:{dx:1,dy:0}},{type:'sentinel',hp:0,state:'windup',shotAim:{dx:1,dy:0}},{type:'sentinel',hp:1,state:'idle',shotAim:{dx:1,dy:0}},{type:'sentinel',hp:1,state:'windup'}]){const {r,calls}=renderer();r.ordinaryAimTell(e);assert.equal(calls.length,0);}
});