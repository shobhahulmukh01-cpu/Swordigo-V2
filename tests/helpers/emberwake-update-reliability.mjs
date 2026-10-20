import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

// Establish the synthetic fixture in the page being tested, then explicitly
// synchronize the other renderer before any worker lifecycle action. This is a
// setup barrier only: preservation assertions after actions remain immediate,
// byte-exact reads and never reseed or retry.
// Never put save contents in diagnostic artifacts. Even absent/mismatched keys
// get an explicit presence entry; summaries cannot accidentally satisfy equality.
export function fixtureSummary(values) {
  return Object.fromEntries(Object.entries(values).slice(0, 16).map(([key, value]) => [key.slice(0, 100), {
    present: typeof value === 'string',
    bytes: typeof value === 'string' ? Buffer.byteLength(value) : 0,
    sha256: typeof value === 'string' ? createHash('sha256').update(value).digest('hex') : null
  }]));
}

// Synchronous, capped emission: persist each stage before the next acceptance
// operation. A diagnostic sink failure must never replace an acceptance error.
export function fixtureRecorder(emit = () => {}, cap = 24) {
  const state = { emitted: 0, dropped: 0, sinkErrors: 0 };
  return { state, record(stage, values, extra = {}) {
    if (state.emitted >= cap) { state.dropped++; return; }
    state.emitted++;
    try { emit({ stage, ...extra, ...(values ? { keys: fixtureSummary(values) } : {}) }); }
    catch { state.sinkErrors++; }
  } };
}

export async function seedFixture(writer, observer, keys, timeout, onStage = () => {}) {
  const trace = fixtureRecorder(onStage);
  const read = page => page.evaluate(values =>
    Object.fromEntries(Object.keys(values).map(key => [key, localStorage.getItem(key)])), keys);
  let stage = 'writer-start';
  trace.record(stage, keys, { role: 'writer', expected: true });
  try {
    const written = await writer.evaluate(values => {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
      return Object.fromEntries(Object.keys(values).map(key => [key, localStorage.getItem(key)]));
    }, keys);
    stage = 'writer-readback';
    trace.record(stage, written, { role: 'writer' });
    assert.deepEqual(written, keys, 'Fixture writer must immediately read back every seeded byte');
    stage = 'observer-initial';
    const initial = await read(observer);
    trace.record(stage, initial, { role: 'observer' });
    stage = 'observer-barrier';
    trace.record(stage, null, { role: 'observer', status: 'started', timeoutMs: timeout });
    await observer.waitForFunction(values =>
      Object.entries(values).every(([key, value]) => localStorage.getItem(key) === value),
    keys, { timeout });
    trace.record(stage, null, { role: 'observer', status: 'completed' });
    stage = 'observer-synchronized';
    const synchronized = await read(observer);
    trace.record(stage, synchronized, { role: 'observer' });
    assert.deepEqual(synchronized, keys, 'Fixture observer must see every seeded byte before lifecycle actions');
    trace.record('fixture-ready', null, { status: 'completed' });
    return { written, initial, synchronized };
  } catch (error) {
    trace.record('fixture-failed', null, { failedStage: stage, errorName: error.name });
    // A writer can throw after a partial setItem sequence. Read-only failure
    // evidence is bounded, never reseeds, and never replaces the original error.
    if (stage !== 'writer-readback') {
      const probe = await boundedObservation(() => read(stage === 'writer-start' ? writer : observer), 250);
      if (probe?.diagnosticError) trace.record('failure-readback', null, { failedStage: stage, status: 'unavailable' });
      else trace.record('failure-readback', probe, { failedStage: stage });
    }
    throw error;
  }
}

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