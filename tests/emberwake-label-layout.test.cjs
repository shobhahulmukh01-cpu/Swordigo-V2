'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../assets/scripts/client.js'),'utf8'),sandbox);
const interactions={a:{id:'a',sceneId:'room',x:150,y:590,type:'mechanism',label:'East irrigation valve'},b:{id:'b',sceneId:'room',x:300,y:590,type:'item',label:'Water Remembers'}};
sandbox.EW={ChapterData:{doors:{},interactions}};
function render(width,playerX){const labels=[],objects=[];const r={canvas:{clientWidth:width},w:width,cam:0,object(m){objects.push(m.id)},c:{save(){},restore(){},fillRect(){},fillText(t){labels.push(t)}}};const g={progress:{mode:'story'},scene:{id:'room'},p:{x:playerX},chapterHas(){return false}};sandbox.EWClient.Renderer.prototype.chapterObjects.call(r,g);return {labels,objects};}
test('narrow chapter labels name nearest object only; all semantic props remain rendered',()=>{let r=render(390,136);assert.deepEqual(r.labels,['East irrigation valve']);assert.deepEqual(r.objects,['a','b']);r=render(390,286);assert.deepEqual(r.labels,['Water Remembers']);assert.deepEqual(r.objects,['a','b']);});
test('wide adjacent labels also avoid overlap, retaining both props',()=>{const r=render(1440,136);assert.deepEqual(r.labels,['East irrigation valve']);assert.deepEqual(r.objects,['a','b']);assert.deepEqual(render(1440,286).labels,['Water Remembers']);});
test('wide separated labels remain visible together',()=>{interactions.b.x=600;try{assert.deepEqual(render(1440,136).labels,['East irrigation valve','Water Remembers']);}finally{interactions.b.x=300;}});
