'use strict';
/* Synthetic DOM/input fixtures only: not browser, earned campaign or accessibility evidence. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function harness(){
 const rootListeners=new Map(),docListeners=new Map();let document;
 class Event{constructor(type,options={}){Object.assign(this,{type,bubbles:true,...options});}preventDefault(){this.defaultPrevented=true;}stopImmediatePropagation(){this.stopped=true;}}
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.attrs={};this.dataset={};this.style={};this.listeners=new Map();this.inert=false;this.hidden=false;this.disabled=false;this.value='';this._html='';this._text='';this.className='';this.classList={contains:k=>this.className.split(' ').includes(k),add:k=>{if(!this.classList.contains(k))this.className+=' '+k;},remove:k=>{this.className=this.className.split(' ').filter(x=>x!==k).join(' ');},toggle:(k,on)=>{on=on??!this.classList.contains(k);on?this.classList.add(k):this.classList.remove(k);return on;}};}
  get id(){return this.attrs.id||'';}set id(v){this.attrs.id=v;}
  get isConnected(){return this._connected!==false&&(this._root||!!this.parentElement?.isConnected);}
  set isConnected(v){this._connected=v;}
  append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
  insertBefore(n,before){n.parentElement=this;const i=this.children.indexOf(before);i<0?this.children.push(n):this.children.splice(i,0,n);}
  setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.className=String(v);if(k==='hidden'||k==='disabled'||k==='inert')this[k]=true;if(k==='type'||k==='min'||k==='max'||k==='step'||k==='value')this[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  matches(selector){return selector.split(',').some(s=>{
   s=s.trim();if(!s)return false;
   const parts=s.split(/\s+/);if(parts.length>1){if(!this.matches(parts.pop()))return false;let p=this.parentElement;const rest=parts.join(' ');while(p){if(p.matches(rest))return true;p=p.parentElement;}return false;}
   const not=[...s.matchAll(/:not\(([^)]+)\)/g)];if(not.some(m=>this.matches(m[1])))return false;s=s.replace(/:not\([^)]+\)/g,'');
   const tag=s.match(/^[a-z]+/i)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;
   const id=s.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;
   if([...s.matchAll(/\.([\w-]+)/g)].some(m=>!this.classList.contains(m[1])))return false;
   return [...s.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].every(([,k,v])=>{const value=k==='hidden'||k==='disabled'||k==='inert'?(this[k]?'':null):this.getAttribute(k);return v===undefined?value!==null:value===v;});
  });}
  closest(selector){for(let p=this;p;p=p.parentElement)if(p.matches(selector))return p;return null;}
  querySelectorAll(selector){return this.children.flatMap(c=>[...(c.matches(selector)?[c]:[]),...c.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  getClientRects(){for(let p=this;p;p=p.parentElement)if(p.hidden||p.style.display==='none')return [];return this.isConnected?[{}]:[];}
  getBoundingClientRect(){return {width:this.getClientRects().length?100:0,height:44};}
  focus(){if(this.isConnected&&!this.disabled&&!this.closest('[hidden],[inert]')&&this.getClientRects().length)document.activeElement=this;}
  click(){if(!this.disabled&&!this.closest('[hidden],[inert]'))this.dispatchEvent(new Event('click'));}
  addEventListener(type,fn,options){const list=this.listeners.get(type)||[];list.push({fn,capture:options===true||!!options?.capture});this.listeners.set(type,list);}
  dispatchEvent(event){event.target=this;for(const {fn,capture} of rootListeners.get(event.type)||[])if(capture&&!event.stopped)fn(event);for(let p=this;p;p=p.parentElement){for(const {fn} of p.listeners.get(event.type)||[])if(!event.stopped)fn(event);if(!event.bubbles)break;}for(const {fn,capture} of rootListeners.get(event.type)||[])if(!capture&&!event.stopped)fn(event);return !event.defaultPrevented;}
  setPointerCapture(){}
  set innerHTML(html){for(const c of this.children)c.parentElement=null;this.children=[];this._html=html;const stack=[this],voids=new Set(['INPUT','BR','HR','IMG','META','LINK']);for(const token of html.matchAll(/<(\/?)(([\w-]+))([^>]*)>/g)){const closing=token[1],tag=token[2].toUpperCase();if(closing){if(stack.at(-1).tagName===tag)stack.pop();continue;}const node=new Element(tag);for(const m of token[4].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))node.setAttribute(m[1],m[2]??m[3]??m[4]??'');stack.at(-1).append(node);if(!voids.has(tag)&&!token[4].trim().endsWith('/'))stack.push(node);}}
  get innerHTML(){return this._html;}
  set textContent(text){this._text=String(text);for(const c of this.children)c.parentElement=null;this.children=[];}
  get textContent(){return this._text;}
 }
 const body=new Element('body'),head=new Element('head');body._root=head._root=true;
 document={body,head,activeElement:body,hidden:false,createElement:tag=>new Element(tag),getElementById:id=>body.querySelector('#'+id),querySelector:s=>body.querySelector(s),querySelectorAll:s=>body.querySelectorAll(s),addEventListener(type,fn){const list=docListeners.get(type)||[];list.push(fn);docListeners.set(type,list);}};
 const sandbox={document,console,Event,Image:class{},navigator:{getGamepads:()=>[]},matchMedia:()=>({matches:false}),getComputedStyle:e=>({display:e.style.display||'block',visibility:e.style.visibility||'visible'}),addEventListener(type,fn,options){const list=rootListeners.get(type)||[];list.push({fn,capture:options===true||!!options?.capture});rootListeners.set(type,list);}};
 vm.createContext(sandbox);for(const file of ['worlds.js','engine.js','core-v11.js','encounters-v12.js','chapter-data.js','chapter-save.js','chapter-runtime.js','journal-v12.js','client.js','controls-v11.js','journey-v11.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/scripts',file),'utf8'),sandbox,{filename:file});
 const mount=new Element();body.append(mount);mount.innerHTML=sandbox.EWClient.markup;
 const A=sandbox.EWClient.App.prototype,a=Object.create(A),values=new Map();Object.assign(a,{mount,game:new sandbox.EW.Game(sandbox.EW_LEVELS).newRun(),storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},settings:{difficulty:'adventure',volume:.5,sound:false},storyRevision:0,savedStory:null,savedJourney:null,time:0,held:new Map(),edges:new Set(),padPrev:[],padHeld:{},padAxis:0,renderer:{cam:0,w:1280,fx:[],labels:[],event(){},resize(){}},audio:{activate(){},sfx(){},apply(){}},announce(text){this.announced=text;},toast(text){this.lastToast=text;},awards:[]});a.loadStory();a.attachJourney(a.game);a.bind();a.game.events=[];a.refreshMenu();
 const el=id=>document.getElementById(id),fireRoot=(type,extra={})=>{const e=new Event(type,extra);for(const {fn} of rootListeners.get(type)||[])if(!e.stopped)fn(e);return e;};
 const pad={index:0,id:'synthetic-standard',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
 const connectPad=()=>{sandbox.navigator.getGamepads=()=>[pad];a.gamepad();};
 const padEdge=index=>{pad.buttons[index]={pressed:true,value:1};a.gamepad();pad.buttons[index]={pressed:false,value:0};a.gamepad();};
 return {a,A,el,document,sandbox,Event,Element,values,pad,connectPad,padEdge,fireRoot,docListeners};
}
test('only the existing open letter opts into rereading; correspondence is pure and journey-earned',()=>{
 const {a,sandbox}=harness(),d=sandbox.EW.ChapterData,j=sandbox.EW_JOURNAL,p=a.game.progress;
 assert.deepEqual(Object.values(d.interactions).filter(x=>x.reread).map(x=>x.id),['ch1:item:open-letter']);
 p.flags.chests=['m-ch0','m-ch1','c-ch0','h-ch1'];const before=JSON.stringify(p),letters=j.rememberedLetters(p,sandbox.EW_LEVELS);
 assert.equal(letters.length,2);assert.equal(letters[0].text,sandbox.EW_LEVELS[0].chests[0].lore);assert.ok(Object.isFrozen(letters)&&letters.every(Object.isFrozen));assert.equal(JSON.stringify(p),before);
 p.mode='rush';assert.equal(j.rememberedLetters(p,sandbox.EW_LEVELS).length,0);assert.equal(j.rememberedLetters(null,sandbox.EW_LEVELS).length,0);
});
test('ordinary cache acquisition exposes earned journal reader without reward replay or extra codexentry wrappers',()=>{
 const {a,el,sandbox}=harness(),g=a.game,cache=g.current.chests[0];a.enterGame();Object.assign(g.p,{x:cache.x-14,y:cache.y-54});g.interact();a.process();
 assert.ok(g.progress.flags.chests.includes(cache.id));const snapshot=JSON.stringify(g.snapshotJourney());a.codex();const entries=el('modal-content').querySelectorAll('.codexentry');assert.equal(entries.length,5);assert.equal(entries[0].querySelectorAll('[data-act="read-letter"]').length,1);assert.equal(entries[1].querySelectorAll('[data-act="read-letter"]').length,0);
 const read=entries[0].querySelector('[data-act="read-letter"]');assert.equal(read.dataset.letter,'m-ch0');read.click();assert.equal(a.modalKind,'correspondence');assert.equal(el('remembered-letter-text').textContent,cache.lore);assert.match(el('modal-content').innerHTML,/Back to journal/);el('modal-content').querySelector('[data-act="letters-journal"]').click();assert.equal(a.modalKind,'codex');assert.equal(JSON.stringify(g.snapshotJourney()),snapshot);
 const epoch=a._modalEpoch;assert.equal(a.readLetter('m-ch1'),false);assert.equal(a._modalEpoch,epoch);a.game=new sandbox.EW.Game(sandbox.EW_LEVELS).newRun();a.act('read-letter',read);assert.equal(a.modalKind,'codex');a.enterGame();a.codex();assert.equal(el('modal-content').querySelector('[data-act="read-letter"]'),null);
});
test('reader text uses textContent and escaped realm labels, not authored-text HTML',()=>{
 const {a,el,sandbox}=harness(),levels=sandbox.EW_LEVELS.map(l=>({...l,chests:l.chests.map(c=>({...c}))}));levels[0].name='<realm>';levels[0].chests[0].lore='<img src=x onerror=oops>';sandbox.EW_LEVELS=levels;a.game.progress.flags.chests=['m-ch0'];a.readLetter('m-ch0');assert.equal(el('remembered-letter-text').textContent,'<img src=x onerror=oops>');assert.match(el('modal-content').innerHTML,/&lt;realm&gt;/);assert.doesNotMatch(el('modal-content').innerHTML,/<img/);
});
test('modal isolates only background siblings, preserves existing inertness and restores the title origin',()=>{
 const {a,el,document}=harness();a.game.status='menu';const origin=document.querySelector('.topactions [data-act="settings"]'),footer=document.querySelector('.footerline');footer.inert=true;origin.focus();origin.click();assert.equal(a.modalKind,'settings');
 for(const selector of ['.topbar','#world','#title-screen','#hud','#touchdock','.footerline'])assert.ok(document.querySelector(selector).closest('[inert]'),selector);
 assert.equal(el('modal').closest('[inert]'),null);assert.equal(el('live').inert,false);assert.equal(el('import-file').closest('#modal'),el('modal'));assert.equal(el('import-file').closest('[inert]'),null);const epoch=a._modalEpoch;el('modal-content').querySelector('[data-act="bindings"]').click();assert.equal(a.modalKind,'bindings');assert.ok(a._modalEpoch>epoch);a.close();assert.equal(document.activeElement,origin);assert.equal(footer.inert,true);assert.equal(document.querySelector('.topbar').inert,false);assert.equal(el('modal').hidden,true);assert.equal(a._padQuarantine,true);
});
test('native import cancel and empty change restore the captured visible trigger only while valid',()=>{
 const {a,el,document,Event}=harness();a.game.status='menu';a.newDialog();const file=el('import-file'),trigger=el('modal-content').querySelector('[data-act="import"]');let opened=0;file.click=()=>{opened++;};
 trigger.focus();trigger.click();assert.equal(opened,1);assert.equal(a._importTrigger,trigger);document.activeElement=document.body;file.dispatchEvent(new Event('cancel'));assert.equal(document.activeElement,trigger);assert.equal(a._importTrigger,null);
 trigger.click();document.activeElement=document.body;file.dispatchEvent(new Event('change'));assert.equal(document.activeElement,trigger);assert.equal(a._importTrigger,null);
 trigger.click();trigger.isConnected=false;document.activeElement=document.body;file.dispatchEvent(new Event('cancel'));assert.equal(document.activeElement,document.body);assert.equal(a._importTrigger,null);
});
test('hidden, disabled, rerendered, invisible and inert title origins fall back to an enabled visible title action',()=>{
 for(const invalidate of [e=>e.hidden=true,e=>e.disabled=true,e=>e.isConnected=false,e=>e.style.visibility='hidden',e=>e.inert=true]){
  const {a,el,document}=harness();a.game.status='menu';const origin=document.querySelector('.topactions [data-act="settings"]');origin.focus();a.settingsPanel();invalidate(origin);a.close();assert.equal(document.activeElement,el('begin'));
 }
});
test('gameplay nested panels return to world; hard dialogs refuse escape/close and keep isolation',()=>{
 const {a,el,document,fireRoot}=harness();a.enterGame();a.pause();a.settingsPanel();a.close();assert.equal(document.activeElement,el('world'));a.choice();const epoch=a._modalEpoch;a.close();fireRoot('keydown',{code:'Escape',target:document.activeElement});assert.equal(a.modalKind,'choice');assert.equal(a.hard,true);assert.equal(el('modal').hidden,false);assert.ok(el('world').closest('[inert]'));assert.equal(a._modalEpoch,epoch);
});
test('successful title/entry/fatal boundaries restore isolation while failed title preserves its modal',()=>{
 const {a,el}=harness();a.enterGame();a.pause();a.save=()=>({ok:false});assert.equal(a.title(),false);assert.ok(el('world').closest('[inert]'));assert.equal(a.modalKind,'pause');a.save=()=>({ok:true});a.title();assert.equal(el('world').closest('[inert]'),null);assert.equal(el('title-screen').hidden,false);a.settingsPanel();a.enterGame();assert.equal(el('world').closest('[inert]'),null);assert.equal(el('modal').hidden,true);
 a.pause();a._importCandidate={fake:true};a._importOwner=a._modalEpoch;const epoch=a._modalEpoch;a.fatal('Stopped safely');assert.equal(el('world').closest('[inert]'),null);assert.equal(el('modal').hidden,true);assert.equal(el('fatal').hidden,false);assert.equal(a._importCandidate,null);assert.ok(a._modalEpoch>epoch);assert.equal(a.running,false);
});
test('import cancellation and delayed file reads retain epoch ownership with reversible isolation',async()=>{
 const {a,el}=harness();a.enterGame();a.pause();const before=JSON.stringify(a.game.snapshotJourney());a._importCandidate=a.game.snapshotJourney();a._importOwner=a._modalEpoch;a.act('import-cancel');assert.equal(JSON.stringify(a.game.snapshotJourney()),before);assert.equal(el('world').closest('[inert]'),null);
 let release;const listener=el('import-file').listeners.get('change').find(x=>x.capture).fn,pending=listener({stopImmediatePropagation(){},target:{files:[{size:100,text:()=>new Promise(r=>release=r)}],value:''}});a.settingsPanel();release(JSON.stringify(a.game.snapshotJourney()));await pending;assert.equal(a._importCandidate,null);assert.equal(JSON.stringify(a.game.snapshotJourney()),before);
});
test('touch DOWN holds drop independently of movement and releases on cancel/lost capture/modal/blur',()=>{
 const {a,document,Event,fireRoot}=harness();a.enterGame();const left=document.querySelector('[data-touch="left"]'),drop=document.querySelector('[data-touch="drop"]');assert.ok(drop);assert.equal(drop.getAttribute('aria-label'),'Hold down to drop through a platform');
 const touch=(button,type,id)=>button.dispatchEvent(new Event(type,{pointerId:id,pointerType:'touch'}));touch(left,'pointerdown',1);touch(drop,'pointerdown',2);assert.equal(a.sample().axis,-1);assert.equal(a.sample().drop,true);touch(drop,'pointercancel',2);assert.equal(a.sample().drop,false);assert.equal(a.sample().axis,-1);
 touch(drop,'pointerdown',3);touch(drop,'lostpointercapture',3);assert.equal(a.sample().drop,false);touch(drop,'pointerdown',4);a.pause();assert.equal(a.sample().drop,false);assert.equal(a.sample().axis,0);a.close();touch(drop,'pointerup',4);touch(drop,'pointerdown',5);fireRoot('blur');assert.equal(a.sample().drop,false);
});
test('App.clearInput cancels gameplay combat intent as well as browser held state at modal boundaries',()=>{
 const {a}=harness();let cleared=0;a.game.clearCombatInput=()=>{cleared++;};a.enterGame();a.press('fixture','attack');const before=cleared;a.pause();assert.ok(cleared>before);assert.equal(a.sample().attackPressed,false);assert.equal(a.edges.size,0);
});
test('controller range follows finite min/max/step, decimal rounding, focus and ordinary input persistence',()=>{
 const {a,el,document,connectPad,padEdge}=harness();a.game.status='menu';a.settingsPanel();const range=el('set-volume');range.value='.50';range.focus();connectPad();padEdge(15);assert.equal(range.value,'0.55');assert.equal(a.settings.volume,.55);assert.equal(document.activeElement,range);padEdge(14);assert.equal(range.value,'0.5');for(let i=0;i<20;i++)padEdge(15);assert.equal(range.value,'1');for(let i=0;i<30;i++)padEdge(14);assert.equal(range.value,'0');assert.equal(document.activeElement,range);
 Object.assign(range,{min:'-.1',max:'.1',step:'.025',value:'0'});padEdge(15);assert.equal(range.value,'0.025');padEdge(15);assert.equal(range.value,'0.05');Object.assign(range,{min:'',max:'',step:'any',value:'50'});padEdge(15);assert.equal(range.value,'51');Object.assign(range,{min:'-1',max:'0',step:'.1',value:'-.1'});padEdge(15);assert.equal(range.value,'0');Object.assign(range,{min:'bad',max:'Infinity',step:'0',value:'NaN'});padEdge(15);assert.equal(range.value,'1');Object.assign(range,{min:'0.30000000000000004',max:'0.30000000000000004',step:'.1',value:'0.30000000000000004'});padEdge(15);assert.equal(range.value,'0.30000000000000004');Object.assign(range,{min:'0',max:String(Number.MAX_VALUE),step:String(Number.MAX_VALUE),value:'0'});padEdge(15);assert.equal(Number(range.value),Number.MAX_VALUE);assert.equal(document.activeElement,range);
});
test('held controller directions cannot bypass modal neutral-release quarantine',()=>{
 const {a,el,pad,connectPad,padEdge}=harness();a.game.status='menu';a.settingsPanel();const range=el('set-volume');range.value='.5';range.focus();pad.buttons[15]={pressed:true,value:1};connectPad();a.gamepad();assert.equal(range.value,'.5');pad.buttons[15]={pressed:false,value:0};a.gamepad();padEdge(15);assert.equal(range.value,'0.55');
});
test('existing guide and ability badges follow active keyboard, touch and standard/generic controller labels safely',()=>{
 const {a,el,document}=harness();a.enterGame();a.bindings.spell='KeyZ';a._lastInputMode='keyboard';a.updateHUD();assert.match(el('guide').innerHTML,/Z unseals/);assert.equal(document.querySelector('#spell-ability b').textContent,'Z');a._lastInputMode='touch';a.updateHUD();assert.match(el('guide').innerHTML,/Tap JUMP/);assert.equal(document.querySelector('#spell-ability b').textContent,'Tap LUMEN');assert.equal(a.inputLabel('drop'),'Hold DOWN');a._lastInputMode='gamepad';a._inputPadStandard=true;a.updateHUD();assert.equal(document.querySelector('#spell-ability b').textContent,'Y');a._inputPadStandard=false;a.updateHUD();assert.equal(document.querySelector('#spell-ability b').textContent,'Controller Lumen bolt');a.inputLabel=()=>'<img src=x>';a.updateHUD();assert.match(el('guide').innerHTML,/&lt;img/);assert.doesNotMatch(el('guide').innerHTML,/<img/);
});

test('Tab wrap excludes hidden controls, and an unfocusable body origin uses title fallback',()=>{
 const {a,el,document,Event}=harness();a.game.status='menu';a.settingsPanel();const controls=el('modal').querySelectorAll('button,input,select,a[href]').filter(e=>a.validFocusTarget(e));const first=controls[0],last=controls.at(-1);last.focus();last.dispatchEvent(new Event('keydown',{code:'Tab'}));assert.equal(document.activeElement,first);first.dispatchEvent(new Event('keydown',{code:'Tab',shiftKey:true}));assert.equal(document.activeElement,last);a.close();assert.equal(document.activeElement,el('begin'));
});
