import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeV4Fixture, boundedObservation, seedFixture, fixtureSummary, fixtureRecorder } from './helpers/emberwake-update-reliability.mjs';

const snapshot = new Map(['worlds.js', 'engine.js', 'core-v11.js', 'chapter-data.js', 'chapter-save.js']
  .map(name => [`assets/scripts/${name}`, fs.readFileSync(new URL(`../assets/scripts/${name}`, import.meta.url))]));

test('synthetic V4 fixtures retain both endings, paid and prior journey, and frozen key sentinels', () => {
  for (const ending of ['mercy', 'rekindle']) {
    const f = makeV4Fixture(snapshot, ending), e = JSON.parse(f.keys.EW_STORY_V4);
    assert.deepEqual(e, f.envelope);
    assert.equal(e.revision, 2);
    assert.equal(e.previous.base.gold, 38);
    assert.equal(e.current.base.gold, 98);
    assert.deepEqual(e.current.chapter.deliveries, ['ch1:delivery:water-remembers']);
    assert.deepEqual(e.previous.chapter.deliveries, []);
    assert.equal(e.current.base.ending, ending);
    assert.equal(e.previous.base.ending, ending);
    assert.deepEqual(e.current.base.stats, { time: 123.75, kills: 7, deaths: 2 });
    assert.equal(JSON.parse(f.keys.EW_STORY_V3).gold, 38);
    assert.equal(JSON.parse(f.keys.EW_RUSH_V3).mode, 'rush');
    assert.equal(Object.keys(f.keys).length, 5);
  }
});
test('diagnostic errors are values, not replacement exceptions', async () => {
  assert.deepEqual(await boundedObservation(() => { throw Error('probe crashed'); }), { diagnosticError: 'probe crashed' });
  assert.equal(await boundedObservation(() => 42), 42);
});
test('stalled diagnostics terminate without extending acceptance predicates', async () => {
  assert.deepEqual(await boundedObservation(() => new Promise(() => {}), 10), { diagnosticError: 'deadline exceeded' });
});
test('fixture setup reads writer back before bounded observer synchronization', async () => {
  const keys = { V4: 'paid', V3: 'frozen' }, calls = [];
  const writer = { evaluate: async () => { calls.push('write-read'); return keys; } };
  let reads = 0;
  const observer = {
    evaluate: async () => { calls.push('observe'); return ++reads === 1 ? { V4: null, V3: null } : keys; },
    waitForFunction: async (_fn, values, options) => {
      calls.push('barrier'); assert.deepEqual(values, keys); assert.equal(options.timeout, 45000);
    }
  };
  const result = await seedFixture(writer, observer, keys, 45000);
  assert.deepEqual(calls, ['write-read', 'observe', 'barrier', 'observe']);
  assert.deepEqual(result.initial, { V4: null, V3: null });
  assert.deepEqual(result.synchronized, keys);
});
test('fixture setup fails closed on writer or observer mismatch without reseeding', async () => {
  const keys = { V4: 'paid' }; let writes = 0;
  await assert.rejects(seedFixture({ evaluate: async () => { writes++; return {}; } }, {}, keys, 45000), /writer/);
  assert.equal(writes, 1);
  await assert.rejects(seedFixture({ evaluate: async () => keys }, {
    evaluate: async () => ({}), waitForFunction: async () => { throw Error('barrier timeout'); }
  }, keys, 45000), /barrier timeout/);
  await assert.rejects(seedFixture({ evaluate: async () => keys }, {
    evaluate: async () => ({}), waitForFunction: async () => {}
  }, keys, 45000), /observer/);
});

test('progressive fixture evidence survives partial writer failure, without raw bytes or exception replacement', async () => {
  const keys = { V4: 'PRIVATE_SYNTHETIC_PAID_BYTES', V3: 'frozen' }, records = [];
  const original = Error('writer threw after first key'); let evaluations = 0;
  const writer = { evaluate: async () => {
    if (++evaluations === 1) throw original;
    return { V4: keys.V4, V3: null };
  } };
  await assert.rejects(seedFixture(writer, {}, keys, 45, event => records.push(event)), error => error === original);
  assert.deepEqual(records.map(r => r.stage), ['writer-start', 'fixture-failed', 'failure-readback']);
  assert.equal(records.at(-1).keys.V4.sha256, fixtureSummary(keys).V4.sha256);
  assert.equal(records.at(-1).keys.V3.present, false);
  assert.equal(records[1].failedStage, 'writer-start');
  assert.ok(!JSON.stringify(records).includes(keys.V4));
  assert.equal(evaluations, 2, 'one write and one read-only failure observation; no reseed');
});
test('writer readback and observer initial evidence survive barrier failure, original error retained', async () => {
  const keys = { V4: 'paid', V3: 'frozen' }, records = [], original = Error('barrier timeout');
  let writes = 0, reads = 0;
  await assert.rejects(seedFixture({ evaluate: async () => { writes++; return keys; } }, {
    evaluate: async () => { reads++; return { V4: null, V3: null }; },
    waitForFunction: async (_fn, _keys, options) => { assert.equal(options.timeout, 45); throw original; }
  }, keys, 45, event => records.push(event)), error => error === original);
  assert.equal(writes, 1); assert.equal(reads, 2);
  assert.deepEqual(records.map(r => r.stage), ['writer-start', 'writer-readback', 'observer-initial',
    'observer-barrier', 'fixture-failed', 'failure-readback']);
  assert.equal(records[1].keys.V4.present, true);
  assert.equal(records[2].keys.V4.present, false);
  assert.ok(!records.some(r => r.stage === 'fixture-ready'));
});
test('stalled failure readback stays bounded and cannot hide barrier exception', async () => {
  const keys = { V4: 'paid' }, records = [], original = Error('barrier timeout'); let reads = 0;
  const started = performance.now();
  await assert.rejects(seedFixture({ evaluate: async () => keys }, {
    evaluate: () => ++reads === 1 ? Promise.resolve({ V4: null }) : new Promise(() => {}),
    waitForFunction: async () => { throw original; }
  }, keys, 45, event => records.push(event)), error => error === original);
  assert.ok(performance.now() - started < 1500);
  assert.equal(records.at(-1).stage, 'failure-readback');
  assert.equal(records.at(-1).status, 'unavailable');
  assert.equal(records[1].stage, 'writer-readback');
});
test('fixture diagnostic emission is capped, sanitized and best effort', async () => {
  const records = [], trace = fixtureRecorder(event => records.push(event), 2);
  trace.record('one', { key: 'private' }); trace.record('two'); trace.record('three');
  assert.equal(records.length, 2); assert.equal(trace.state.dropped, 1);
  assert.ok(!JSON.stringify(records).includes('private'));
  const keys = { V4: 'paid' }, original = Error('preserve me');
  await assert.rejects(seedFixture({ evaluate: async () => { throw original; } }, {}, keys, 45,
    () => { throw Error('diagnostic filesystem unavailable'); }), error => error === original);
});
test('writer-start is emitted before a stalled writer and contains only expected hashes', async () => {
  const records = []; let release;
  const keys = { V4: 'paid' };
  const pending = seedFixture({ evaluate: () => new Promise(resolve => { release = resolve; }) }, {
    evaluate: async () => keys, waitForFunction: async () => {}
  }, keys, 45, event => records.push(event));
  assert.equal(records.length, 1); assert.equal(records[0].stage, 'writer-start');
  release(keys); await pending;
  assert.equal(records.at(-1).stage, 'fixture-ready');
});


test('progressive sink persists writer evidence before a pending observer barrier fails', async () => {
  const dir = fs.mkdtempSync('/tmp/ew-fixture-stage-'), file = `${dir}/stages.json`;
  const records = [], keys = { V4: 'private synthetic journey bytes' }, original = Error('barrier failed');
  let rejectBarrier, entered;
  const inBarrier = new Promise(resolve => { entered = resolve; });
  try {
    const pending = seedFixture({ evaluate: async () => keys }, {
      evaluate: async () => ({ V4: null }),
      waitForFunction: () => { entered(); return new Promise((_resolve, reject) => { rejectBarrier = reject; }); }
    }, keys, 45, event => { records.push(event); fs.writeFileSync(file, JSON.stringify(records)); });
    await inBarrier;
    const partial = JSON.parse(fs.readFileSync(file));
    assert.deepEqual(partial.map(e => e.stage), ['writer-start', 'writer-readback', 'observer-initial', 'observer-barrier']);
    assert.equal(partial[1].keys.V4.present, true);
    assert.ok(!fs.readFileSync(file, 'utf8').includes(keys.V4));
    rejectBarrier(original);
    await assert.rejects(pending, error => error === original);
    assert.equal(JSON.parse(fs.readFileSync(file)).at(-1).stage, 'failure-readback');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
