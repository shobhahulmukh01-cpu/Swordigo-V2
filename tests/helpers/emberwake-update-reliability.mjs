import assert from 'node:assert/strict';
import vm from 'node:vm';

// Synthetic completed-schema journey, NOT input-earned gameplay. Evaluate exactly
// the supplied runtime bytes; never import a mutable second copy of the release.
export function makeV4Fixture(snapshot, ending) {
  assert.ok(['mercy', 'rekindle'].includes(ending));
  const sandbox = vm.createContext({});
  for (const name of ['worlds.js', 'engine.js', 'core-v11.js', 'chapter-data.js', 'chapter-save.js']) {
    const file = `assets/scripts/${name}`;
    new vm.Script(snapshot.get(file).toString(), { filename: file }).runInContext(sandbox, { timeout: 2000 });
  }
  return JSON.parse(vm.runInContext(`(() => {
    const cs = EW.ChapterSave, g = new EW.Game(EW_LEVELS).newRun('adventure', 'story');
    const base = g.snapshot();
    base.level = 2; base.checkpoint = EW_LEVELS[2].checkpoints[0].id;
    base.completed = true; base.ending = ${JSON.stringify(ending)};
    base.gold = 38; base.stats = {time:123.75,kills:7,deaths:2};
    base.flags.seen = EW_LEVELS.map(l => l.id);
    base.flags.defeated = EW_LEVELS.map(l => l.boss.id);
    base.flags.runes = EW_LEVELS.flatMap(l => l.sigils.map(s => s.id));
    base.flags.sigils = base.flags.runes.slice();
    const p = cs.migrateV3(base, EW_LEVELS);
    if (!p) throw Error('V4 fixture campaign did not validate');
    Object.assign(p.chapter, {
      active:true, discovered:['ch1:main:moonroot','ch1:room:millpond'],
      mechanisms:['ch1:mechanism:valve-west','ch1:mechanism:valve-east'],
      items:['ch1:item:water-letter'],
      anchor:{sceneId:'ch1:room:millpond',anchorId:'ch1:anchor:millpond-entry'},
      stats:{time:17,kills:1,deaths:0}
    });
    const keys = {}, storage = {
      getItem:k => Object.hasOwn(keys,k) ? keys[k] : null,
      setItem:(k,v) => { keys[k] = v; }
    };
    if (!cs.write(storage,p,EW_LEVELS,0).ok) throw Error('V4 previous fixture failed');
    const paid = cs.writeDelivery(storage,p,'ch1:delivery:water-remembers',EW_LEVELS,1);
    if (!paid.ok || paid.reward !== 60) throw Error('V4 paid fixture failed');
    keys.EW_STORY_V3 = JSON.stringify(base);
    keys['EW_STORY_V3.backup'] = JSON.stringify(base);
    const rush = new EW.Game(EW_LEVELS).newRun('adventure','rush').snapshot();
    keys.EW_RUSH_V3 = JSON.stringify(rush);
    keys['EW_RUSH_V3.backup'] = JSON.stringify(rush);
    return JSON.stringify({keys,envelope:paid.envelope,ending:${JSON.stringify(ending)}});
  })()`, sandbox, { timeout: 2000 }));
}

// A diagnostic must never replace the original acceptance exception or hang it.
export async function boundedObservation(operation, milliseconds = 1500) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise(resolve => { timer = setTimeout(() => resolve({ diagnosticError: 'deadline exceeded' }), milliseconds); })
    ]);
  } catch (error) {
    return { diagnosticError: error.message };
  } finally {
    clearTimeout(timer);
  }
}