import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeV4Fixture, boundedObservation, seedFixture } from './helpers/emberwake-update-reliability.mjs';

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