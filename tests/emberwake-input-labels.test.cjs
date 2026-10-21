const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(coarse=false){
 const listeners={},doc={querySelector:()=>null,createElement:()=>({}),head:{append(){}},body:{}};
 class App{}
 for(const k of ['bind','sample','act','settingsPanel','controls','close','enterGame','gamepad','updateHUD'])App.prototype[k]=function(){};
 const root={EWClient:{App,boot(){}},document:doc,navigator:{getGamepads:()=>[]},matchMedia:()=>({matches:coarse}),addEventListener:(name,fn)=>{(listeners[name]||=[]).push(fn);}};root.window=root;
 vm.runInNewContext(fs.readFileSync('assets/scripts/controls-v11.js','utf8'),root);
 const app=new App();app.game={status:'playing'};app.padPrev=[];app.padHeld={};app.edges=new Set();app.bind();return {app,listeners,root};
}
test('hints use current primary key and remain read-only',()=>{
 const {app}=harness();assert.equal(app.inputLabel('spell'),'K');app.bindings.spell='KeyZ';
 const before=JSON.stringify(app.bindings);assert.equal(app.inputLabel('spell'),'Z');assert.equal(app.inputLabel('jump'),'Space');
 assert.equal(app.inputLabel('unknown'),'');assert.equal(JSON.stringify(app.bindings),before);
 app.bindings.spell='<script>';assert.equal(app.inputLabel('spell'),'K');
});
test('coarse-pointer defaults and real keyboard or touch input select truthful labels',()=>{
 const {app,listeners}=harness(true);assert.equal(app.inputLabel('spell'),'Tap LUMEN');
 const target={matches:()=>false};listeners.keydown[0]({target});assert.equal(app.inputLabel('spell'),'K');
 listeners.pointerdown[0]({pointerType:'touch'});assert.equal(app.inputLabel('interact'),'Tap INTERACT');assert.equal(app.inputLabel('drop'),'Hold DOWN');
 listeners.pointerdown[0]({pointerType:'mouse'});assert.equal(app.inputLabel('interact'),'E');
});
test('idle connected pads do not steal hints; used standard and generic pads label honestly',()=>{
 const {app,root}=harness();let pad={index:0,id:'test',mapping:'standard',buttons:Array.from({length:16},()=>({pressed:false,value:0})),axes:[0,0]};
 root.navigator.getGamepads=()=>[pad];app.gamepad();assert.equal(app.inputLabel('spell'),'K');
 pad.buttons[3].pressed=true;app.gamepad();assert.equal(app.inputLabel('spell'),'Y');assert.equal(app.inputLabel('interact'),'RB');
 pad.mapping='';app.gamepad();assert.equal(app.inputLabel('spell'),'Controller Lumen bolt');root.navigator.getGamepads=()=>[];app.gamepad();assert.equal(app.inputLabel('spell'),'K');
});
