import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { trialPlan, LIMITS, CAVEAT, compareSources, sourceSnapshot, validateHarness, validateInventory,
  workloadProgress, WORKLOAD, SCREEN_LIMITS, SCREEN_CAVEAT, experimentConfig, parseExperimentArgs,
  validateFreeze, validateScreenDiagnostics, screenShouldStop } from './emberwake-update-experiment.mjs';

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

test('opt-in four-cell SCREEN keeps legacy default and distinct interpretation', () => {
  const screen = experimentConfig('screen4');
  assert.deepEqual(screen.plan.map(({ arm, competing }) => [arm, competing]), [
    ['rollback-only', false], ['full', false], ['rollback-only', true], ['full', true]
  ]);
  assert.deepEqual(screen.plan.map(p => p.expectedChecks), [1, 7, 1, 7]);
  assert.deepEqual(SCREEN_LIMITS, { totalMs: 720000, externalMs: 175000, internalMs: 150000, predicateMs: 45000 });
  assert.equal(experimentConfig().plan.length, 12);
  assert.equal(parseExperimentArgs([]).mode, 'historical12');
  assert.match(screen.passedStatus, /non-reproduction/);
  assert.match(SCREEN_CAVEAT, /not cause closure/);
  assert.notEqual(screen.passedStatus, experimentConfig().passedStatus);
  assert.throws(() => experimentConfig('invented'), /Unknown/);
});
test('SCREEN requires explicit frozen source/worker/browser and rejects ambiguous arguments', () => {
  assert.throws(() => parseExperimentArgs(['--plan', 'screen4']), /freeze/);
  assert.deepEqual(parseExperimentArgs(['--plan', 'screen4', '--freeze', 'freeze.json', '--output', 'out']),
    { mode: 'screen4', freeze: 'freeze.json', output: 'out' });
  for (const args of [['--output'], ['--plan', 'screen4', '--plan', 'historical12'],
    ['--freeze', 'f'], ['--unknown', 'x'], ['--output', '--plan']]) assert.throws(() => parseExperimentArgs(args));
  const source = { sha256: 'source', files: { 'sw.js': { sha256: 'worker' } } };
  const freeze = { sourceSHA256: 'source', workerSHA256: 'worker', browserVersion: '153.fixture', browserExecutableSHA256: 'browser' };
  assert.deepEqual(validateFreeze(freeze, source, 'browser'), []);
  for (const patch of [{ sourceSHA256: 'changed' }, { workerSHA256: 'changed' }, { browserVersion: '' }, { browserExecutableSHA256: 'changed' }])
    assert.ok(validateFreeze({ ...freeze, ...patch }, source, 'browser').length);
});
function screenReport() {
  return { fixtureDiagnosticWriteErrors: 0, diagnostics: { dropped: {}, storageEvents: [], events: [{ kind: 'page-target' }],
    fixtureStages: ['mercy', 'rekindle'].flatMap(ending =>
      ['writer-readback', 'observer-initial', 'observer-synchronized', 'fixture-ready', 'immediate-equality'].map(stage => ({
        ending, stage, writer: { contextId: 1, frame: { origin: 'http://fixture' } }, observer: { frame: { origin: 'http://fixture' } }
      }))) } };
}
test('missing/truncated SCREEN diagnostics stop interpretation, never substitute for assertions', () => {
  const trial = experimentConfig('screen4').plan[1];
  assert.deepEqual(validateScreenDiagnostics(screenReport(), trial), []);
  for (const change of [r => { r.fixtureDiagnosticWriteErrors = 1; }, r => { r.diagnostics.events = []; },
    r => { r.diagnostics.dropped.events = 1; }, r => { r.diagnostics.fixtureStages = []; },
    r => { r.diagnostics.fixtureStages[0].writer.contextId = null; },
    r => { r.diagnostics.storageEvents.push({ event: { status: 'document-cap-reached' } }); }]) {
    const report = screenReport(); change(report); assert.ok(validateScreenDiagnostics(report, trial).length);
  }
  assert.ok(validateScreenDiagnostics({}, trial).length);
});
test('first unsuccessful cell stops the SCREEN schedule without filling unrun cells', () => {
  const plan = experimentConfig('screen4').plan;
  for (const status of ['failed', 'setup-blocked', 'superseded-source']) {
    const visited = [];
    for (const trial of plan) {
      const entry = { ...trial, status: trial.number === 2 ? status : 'passed' };
      visited.push(entry);
      if (screenShouldStop(entry)) break;
    }
    assert.deepEqual(visited.map(t => t.number), [1, 2]);
    assert.deepEqual(plan.filter(p => !visited.some(t => t.number === p.number)).map(t => t.number), [3, 4]);
  }
});
