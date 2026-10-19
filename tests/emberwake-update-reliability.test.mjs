import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeV4Fixture, boundedObservation } from './helpers/emberwake-update-reliability.mjs';

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