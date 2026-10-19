import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { trialPlan, LIMITS, CAVEAT, compareSources, sourceSnapshot, validateHarness, validateInventory,
  workloadProgress, WORKLOAD } from './emberwake-update-experiment.mjs';

test('fixed twelve-trial order preserves exact acceptance bounds and caveat', () => {
  const plan = trialPlan();
  assert.equal(plan.length, 12);
  assert.deepEqual(plan.map(p => p.arm), [...Array(4).fill('full'), ...Array(4).fill('rollback-only'), ...Array(4).fill('full')]);
  assert.deepEqual(plan.map(p => p.competing), [...Array(8).fill(false), ...Array(4).fill(true)]);
  assert.deepEqual(LIMITS, { totalMs: 1800000, externalMs: 175000, internalMs: 150000, predicateMs: 45000 });
  assert.match(CAVEAT, /remains unexplained/);
});
test('source snapshots detect additions/removals/modifications but exclude QA outputs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ew-experiment-unit-'));
  try {
    for (const dir of ['assets/scripts', 'src', 'scripts', 'tests/helpers', 'qa']) fs.mkdirSync(path.join(root, dir), { recursive: true });
    for (const file of ['index.html', 'sw.js', 'assets/scripts/client.js', 'package.json', 'package-lock.json',
      'tests/emberwake-update-browser.mjs', 'tests/helpers/emberwake-update-reliability.mjs', 'tests/emberwake-update-experiment.mjs']) {
      fs.writeFileSync(path.join(root, file), 'fixture');
    }
    const before = sourceSnapshot(root);
    fs.writeFileSync(path.join(root, 'qa/report.json'), 'changing evidence');
    assert.deepEqual(compareSources(before, sourceSnapshot(root)), []);
    fs.writeFileSync(path.join(root, 'assets/scripts/client.js'), 'modified');
    fs.writeFileSync(path.join(root, 'assets/added.txt'), 'added');
    fs.unlinkSync(path.join(root, 'sw.js'));
    assert.throws(() => sourceSnapshot(root), /Required source missing/);
    fs.writeFileSync(path.join(root, 'sw.js'), 'restored differently');
    assert.deepEqual(compareSources(before, sourceSnapshot(root)), ['assets/added.txt', 'assets/scripts/client.js', 'sw.js']);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
function passingReport() {
  return { arm: 'full', passed: 7, failed: 0, checks: Array(7).fill({ name: 'fixture' }), failures: [],
    predicateTimeoutMs: 45000, trialBudgetMs: 150000, controlledRetryFixture: false,
    oldCommit: '6c266e9d0d8eaf8ceb73f298b9cf76174fe25290',
    oldWorkerSHA256: '0dff1449b6dca02b90b3578cd3c6ef901cf8f583ea723ab100e1d5ce86246825',
    browser: '153.fixture', currentSourceHashes: { 'index.html': 'abc', 'sw.js': 'def' } };
}
test('report acceptance rejects failed/skipped checks, widened waits, missing hashes and wrong history', () => {
  const source = { files: { 'index.html': { sha256: 'abc' }, 'sw.js': { sha256: 'def' } } }, trial = trialPlan()[0];
  assert.deepEqual(validateHarness(passingReport(), trial, source), []);
  for (const patch of [{ passed: 6 }, { failed: 1 }, { checks: [] }, { arm: 'rollback-only' },
    { predicateTimeoutMs: 60000 }, { trialBudgetMs: 170000 }, { controlledRetryFixture: true },
    { oldCommit: 'invented' }, { currentSourceHashes: { 'index.html': 'abc' } }, { browser: 'different' }]) {
    assert.ok(validateHarness({ ...passingReport(), ...patch }, trial, source, '153.fixture').length);
  }
  assert.ok(validateInventory({}, '153.fixture').length);
});
function measuredWorkload() {
  return { browser: '153.fixture', contexts: Array(WORKLOAD.contexts).fill({}), pages: Array(WORKLOAD.contexts).fill({}),
    errors: [], samples: [0, 1000, 2000].map((t, i) => ({ hostMonotonicMs: t,
      pages: [1, 2].map(pageId => ({ pageId, frames: i * 10 + 2, pageNow: t + 30, drawMs: i * 7 })) })) };
}
test('workload must progress on every page and remain continuously measured', () => {
  assert.equal(workloadProgress(measuredWorkload()).ok, true);
  const stalled = measuredWorkload(); stalled.samples.forEach(s => { s.pages[1].frames = 2; });
  assert.equal(workloadProgress(stalled).ok, false);
  const gap = measuredWorkload(); gap.samples[2].hostMonotonicMs = 10000;
  assert.equal(workloadProgress(gap).ok, false);
  const error = measuredWorkload(); error.errors.push({ message: 'crash' });
  assert.equal(workloadProgress(error).ok, false);
});