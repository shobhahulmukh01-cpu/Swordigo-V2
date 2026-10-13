/* EMBERWAKE 1.1 — safe journey replacement, backup recovery and local milestones. */
(function(root){'use strict';const A=root.EWClient.App.prototype,$=id=>document.getElementById(id);
const AWARDS={parry:'Perfect timing — reflect or guard a frontal hit',attune:'Forged in courage — attune at a shrine',caches:'Letters to tomorrow — open all six caches',journey:'Tomorrow delivered — restore the three hearts',mercy:'A blank page — give the king a tomorrow',unbroken:'Unbroken courier — finish without a death'};
function award(app,id){if(app.awards.includes(id))return;app.awards.push(id);try{app.storage?.setItem('EW_AWARDS_V1',JSON.stringify(app.awards));}catch(_){}app.toast('Journal milestone · '+AWARDS[id].split(' — ')[0],4);}
function invalidate(app){app._modalEpoch=(app._modalEpoch||0)+1;app._importGeneration=(app._importGeneration||0)+1;app._importCandidate=null;app._importOwner=null;}
function fail(app,error){app.storageWarned=true;app.toast('Journey not replaced. '+(error||'Browser storage is unavailable.')+' Export your current journey before retrying or closing.',9);return false;}
function preserve(app){if(!app.game.progress)return true;const result=app.save();return result?.ok===true||fail(app,result?.error||'The current journey could not be confirmed saved.');}
function key(s){return s.mode==='rush'?'EW_RUSH_V3':'EW_STORY_V3';}
function commit(app,prepared){
 const s=root.EW.validateSave(prepared.snapshot(),root.EW_LEVELS);if(!s)return fail(app,'The replacement journey is invalid.');
 if(!preserve(app))return false;
 const result=root.EW.Save.write(app.storage,key(s),s,root.EW_LEVELS);
 if(!result.ok)return fail(app,result.error);
 // Only now discard the live fight. The staged simulation has already validated/loaded.
 app.game=prepared;if(s.mode==='story')app.savedStory=s;else app.savedRush=s;
 if(s.completed&&s.mode==='story')app.unlockRush=true;
 app.lastSave=app.time;app.refreshMenu();return true;
}
function accept(app){const candidate=app._importCandidate;if(!candidate||(app._importOwner!=null&&app._importOwner!==app._modalEpoch))return;
 const s=root.EW.validateSave(candidate,root.EW_LEVELS),prepared=new root.EW.Game(root.EW_LEVELS);
 if(!s||!prepared.resume(s)){fail(app,'That journey could not be restored.');return;}
 if(!commit(app,prepared))return;
 invalidate(app);app.enterGame();app.process();app.updateHUD();if(s.completed)app.ending(s.ending,s.mode);else app.toast('Journey restored at the last lit beacon.');
}
function confirmImport(app,s,label){app.modal('Restore this journey?','<p id="restore-details"></p><p>Replacement proceeds only after the current journey and target save can be written. A rolling backup keeps one prior valid write, not a permanent archive; later saves may replace it. Export a separate copy to keep a journey. Restore begins at the last lit beacon, not inside a fight.</p><div class="modal-buttons"><button class="primary" data-act="import-accept" data-primary>Restore journey →</button><button class="secondary" data-act="import-cancel">Keep current journey</button><button class="linkbtn" data-act="export-current">Export current journey</button></div>','restore');app._importCandidate=s;app._importOwner=app._modalEpoch;$('restore-details').textContent=label+' · '+root.EW_LEVELS[s.level].name+' · Level '+s.rank+' · '+Math.floor(s.stats.time/60)+' minutes';}
const modal=A.modal;A.modal=function(){if(!this.modalKind)this._returnFocus=document.activeElement;invalidate(this);this._padQuarantine=true;this.clearInput();return modal.apply(this,arguments);};
const close=A.close;A.close=function(){if(this.hard)return;invalidate(this);this._captureBind=null;close.apply(this,arguments);if(this.game.status==='menu'&&this._returnFocus?.isConnected)this._returnFocus.focus();};
// These boundaries can change journey ownership without opening a new modal.
for(const method of ['title','enterGame','continue','death']){const base=A[method];A[method]=function(){invalidate(this);return base.apply(this,arguments);};}
const start=A.start;A.start=function(mode='story'){
 invalidate(this);
 if(!this.game.progress&&!(mode==='rush'?this.savedRush:this.savedStory))return start.call(this,mode);
 if(!['story','rush'].includes(mode))return fail(this,'Unknown journey mode.');
 const prepared=new root.EW.Game(root.EW_LEVELS);prepared.newRun(this.settings.difficulty,mode);
 if(!commit(this,prepared))return false;
 this.hard=false;this.enterGame();this.process();this.updateHUD();this.audio.activate();return true;
};
const bind=A.bind;A.bind=function(){this._modalEpoch=0;this._importGeneration=0;bind.call(this);this.awards=[];try{const a=JSON.parse(this.storage?.getItem('EW_AWARDS_V1')||'[]');if(Array.isArray(a))this.awards=Array.from(new Set(a.filter(k=>Object.hasOwn(AWARDS,k))));}catch(_){}
 $('import-file').addEventListener('change',async e=>{e.stopImmediatePropagation();const f=e.target.files?.[0];e.target.value='';if(!f)return;const token=++this._importGeneration,epoch=this._modalEpoch;try{if(f.size>150000)throw Error('This file is too large. Choose an Emberwake journey.');const text=await f.text();if(token!==this._importGeneration||epoch!==this._modalEpoch)return;const s=root.EW.validateSave(text,root.EW_LEVELS);if(!s)throw Error('That file is not a consistent Emberwake journey save.');if(this.savedStory||this.savedRush||this.game.progress)confirmImport(this,s,'Imported save');else{this._importCandidate=s;this._importOwner=epoch;accept(this);}}catch(err){if(token===this._importGeneration&&epoch===this._modalEpoch)this.toast(err.message,5);}},true);};
const newDialog=A.newDialog;A.newDialog=function(){newDialog.apply(this,arguments);const fine=$('modal-content').querySelector('.fine');if(fine)fine.textContent=this.savedStory||this.game.progress?'Replacement requires successful saves. A rolling backup is one prior write and can change on later saves. Export a separate copy to retain a journey.':'Saves are attempted at beacons and discoveries. If storage is unavailable, play is session-only; export a journey before closing.';};
const act=A.act;A.act=function(action,b){if(action==='launch'&&(this.savedStory||this.game.progress)&&!this._approvedReplace){this.modal('Begin a new tomorrow?','<p>Replacement requires successfully writing your current journey and the new save. A rolling backup is one prior valid write, not a permanent archive. Export a separate copy before replacing a journey.</p><div class="modal-buttons"><button class="primary" data-act="launch-confirm" data-primary>Start new journey →</button><button class="secondary" data-act="new-cancel">Keep my journey</button><button class="linkbtn" data-act="export-current">Export current journey</button></div>','replace');return;}
 if(action==='launch-confirm'){if(this.modalKind!=='replace')return;this._approvedReplace=true;try{this.act('launch');}finally{this._approvedReplace=false;}return;}if(action==='new-cancel'||action==='import-cancel'){invalidate(this);this.hard=false;this.close();return;}if(action==='import-accept'){accept(this);return;}
 if(action==='export-current'){if(!this.game.progress){const saved=this.savedStory||this.savedRush;if(!saved){this.toast('No current journey is available to export.');return;}const old=this.game.progress;try{this.game.progress=saved;this.export();}finally{this.game.progress=old;}}else this.export();return;}
 if(action==='restore-backup'){let s;try{s=root.EW.validateSave(this.storage?.getItem('EW_STORY_V3.backup'),root.EW_LEVELS);}catch(_){}if(!s){this.toast('No valid story backup was found.');return;}confirmImport(this,s,'Rolling backup');return;}act.call(this,action,b);};
root.EWClient.persistenceSafety='transactional-v1';
const settings=A.settingsPanel;A.settingsPanel=function(){settings.call(this);let valid=false;try{valid=!!root.EW.validateSave(this.storage?.getItem('EW_STORY_V3.backup'),root.EW_LEVELS);}catch(_){}const row=document.createElement('div');row.className='modal-buttons';row.innerHTML='<button class="secondary" data-act="restore-backup" '+(valid?'':'disabled')+'>Restore story backup</button>';document.getElementById('modal-content').append(row);};
const process=A.process;A.process=function(){const events=this.game.events.slice();process.call(this);const q=this.game.progress;if(!q)return;for(const e of events){if(e.type==='parry'){award(this,'parry');if(this.settings.sound){this.audio.tone(880,.18,'sine',.3);this.audio.tone(1174,.38,'sine',.18,.08);}}if(e.type==='upgrade')award(this,'attune');}if(q.flags.chests.length===6)award(this,'caches');if(q.completed){award(this,'journey');if(q.ending==='mercy')award(this,'mercy');if(q.stats.deaths===0)award(this,'unbroken');}};
const codex=A.codex;A.codex=function(){codex.call(this);const div=document.createElement('div');div.className='codexentry';div.innerHTML='<h3>Courier milestones</h3>'+Object.keys(AWARDS).map(k=>'<p style="margin-bottom:9px;color:'+(this.awards.includes(k)?'#a0e4ca':'#9bacaa')+'">'+(this.awards.includes(k)?'✓ ':'◇ ')+AWARDS[k]+'</p>').join('')+'<p class="fine">Milestones are local to this browser, not a global leaderboard. Journey saves remain portable through export.</p>';$('modal-content').append(div);};
})(typeof window!=='undefined'?window:globalThis);
