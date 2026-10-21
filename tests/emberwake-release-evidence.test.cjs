const { test } = require('node:test');
const A = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const api = import('../scripts/release-evidence.mjs');
const hash = b => createHash('sha256').update(b).digest('hex');
const put = (root, file, value) => {
  const dest = path.join(root, file); fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
};
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ew-evidence-'));
  const env = { GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '1234', GITHUB_RUN_ATTEMPT: '2', EW_EVIDENCE_WORKFLOW: 'ci',
    EW_EVIDENCE_STATE: path.join(root, 'private-state'), EW_EVIDENCE_OUTPUT: path.join(root, 'output'),
    EW_EVIDENCE_RAW: path.join(root, 'private-raw'), EW_CHECKOUT_OUTCOME: 'success', EW_NODE_OUTCOME: 'success' };
  put(root, 'package.json', { name: 'evidence-test-only', version: '1.2.0-alpha.5' });
  // Hand-authored inert test bytes, not a project prepare/build invocation.
  const files = { 'index.html': '<title>Evidence fixture</title>', 'assets/a.js': '/* fixture only */',
    'sw.js': 'const PREFIX="fixture-",CACHE=PREFIX+"emberwake-0123456789ab",HASHES={};\n' };
  for (const [p, b] of Object.entries(files)) { put(root, p, b); put(root, 'dist/' + p, b); }
  put(root, 'dist/integrity.json', { version: 1, managedBy: 'emberwake-release-v1',
    files: Object.keys(files).sort().map(p => ({ path: p, bytes: Buffer.byteLength(files[p]), sha256: hash(files[p]) })) });
  const options = { root, env, sourceProbe: () => 'a'.repeat(40), execute: () => ({ status: 0 }),
    browserProbe: () => ({ executable: '/fixture/chrome', observation: { name: 'Google Chrome', version: '141.0.1.2' } }),
    readyProbe: async () => ({ ready: true, attempts: 1 }) };
  return { root, env, options, clean: () => fs.rmSync(root, { recursive: true, force: true }) };
}
const suite = (name, fn) => test(name, async () => { const f = fixture(); try { await fn(await api, f); } finally { f.clean(); } });
const state = f => JSON.parse(fs.readFileSync(path.join(f.env.EW_EVIDENCE_STATE, 'state.json')));
const out = (f, file = 'index.json') => JSON.parse(fs.readFileSync(path.join(f.env.EW_EVIDENCE_OUTPUT, file)));
const reportSpecs = {
  'browser-harness': ['browser-harness/browser-results.json', 'smoke'],
  'http-smoke': ['http-smoke/browser-results.json', 'smoke'],
  'chapter-browser': ['chapter/report.json', 'chapter'],
  upgrade: ['upgrade/report.json', 'upgrade'],
  hud: ['hud/report.json', 'hud'],
  update: ['update/report.json', 'update']
};
function passingReport(kind) {
  if (kind === 'smoke') return { passed: 1, failed: 0, checks: [{}], runtimeExceptions: [], missingAssets: [] };
  if (kind === 'chapter') return { pass: true, roomEntered: true, nativeAdvice: true, nativeFollowedDelivery: true,
    nativeUpgradePreview: { pass: true }, postEndingUI: [{ pass: true }, { pass: true }] };
  if (kind === 'upgrade') return { passed: 1, checks: [{}], errors: [], failures: [] };
  if (kind === 'hud') return { status: 'pass', captures: 15, errors: [], results: [{}, {}, {}],
    guardianFixtures: [{}, {}, {}, {}, {}, {}] };
  if (kind === 'update') return { passed: 1, failed: 0, checks: [{}], failures: [], fixtureDiagnosticWriteErrors: 0,
    diagnostics: Object.fromEntries(['requests', 'pageErrors', 'consoleErrors', 'partialInstall', 'events', 'milestones',
      'observations', 'fixtureStages', 'storageEvents'].map(key => [key, []])) };
  throw Error('unknown report fixture');
}
function emitPassingReport(f, gate) {
  const spec = reportSpecs[gate];
  if (spec) put(f.env.EW_EVIDENCE_RAW, spec[0], passingReport(spec[1]));
}
async function through(m, f, last) {
  for (const gate of m.GATES) { if (gate === 'evidence-finalize') break;
    A.equal(await m.runGate(gate, f.options), 0, gate); emitPassingReport(f, gate); if (gate === last) break; }
}

suite('initial index has every gate unrun and no stale-report inheritance', async (m, f) => {
  m.initialize(f.options); A.deepEqual(state(f).gates.map(g => g.status), m.GATES.map(() => 'unrun'));
  A.throws(() => m.initialize(f.options));
  A.equal(m.finalize(f.options), 1);
  const index = out(f); A.equal(index.localGateSetPassed, false); A.equal(index.publicByteVerification, 'unrun');
  A.equal(index.gates.at(-1).status, 'fail');
  A.equal(index.artifactBinding.status, 'unavailable');
  A.ok(out(f, 'reports.json').reports.every(r => r.availability === 'unrun'));
});
suite('complete synthetic gate set binds exact source/package/worker/manifest/browser', async (m, f) => {
  m.initialize(f.options); await through(m, f);
  A.equal(m.finalize(f.options), 0); const index = out(f);
  A.equal(index.localGateSetPassed, true); A.ok(index.gates.every(g => g.status === 'pass'));
  A.equal(index.source.commit, f.env.GITHUB_SHA); A.equal(index.source.runId, '1234');
  const binding = index.artifactBinding.built;
  A.equal(binding.sourceCommit, f.env.GITHUB_SHA); A.equal(binding.package.version, '1.2.0-alpha.5');
  A.equal(binding.package.sha256, hash(fs.readFileSync(path.join(f.root, 'package.json'))));
  A.equal(binding.artifact.workerId, 'emberwake-0123456789ab');
  A.equal(binding.artifact.workerSHA256, hash(fs.readFileSync(path.join(f.root, 'dist/sw.js'))));
  A.equal(binding.artifact.integritySHA256, hash(fs.readFileSync(path.join(f.root, 'dist/integrity.json'))));
  A.equal(index.browser.observed.version, '141.0.1.2'); A.equal(index.browser.status, 'verified');
  A.equal(index.diagnostics.sha256, hash(fs.readFileSync(path.join(f.env.EW_EVIDENCE_OUTPUT, 'reports.json'))));
  A.deepEqual(fs.readdirSync(f.env.EW_EVIDENCE_OUTPUT).sort(), ['index.json', 'reports.json']);
});
suite('failed command keeps exact exit code; later gates are unrun and no retry is allowed', async (m, f) => {
  m.initialize(f.options); await through(m, f, 'install');
  let executions = 0;
  const options = { ...f.options, execute: (_file, _args, opts) => { executions++; A.equal(opts.stdio, 'inherit'); return { status: 23 }; } };
  A.equal(await m.runGate('unit', options), 23); A.equal(executions, 1);
  await A.rejects(m.runGate('secrets', f.options)); await A.rejects(m.runGate('unit', f.options));
  A.equal(m.finalize(f.options), 1); const index = out(f);
  A.equal(index.gates.find(g => g.id === 'unit').exitCode, 23);
  A.equal(index.gates.find(g => g.id === 'unit').status, 'fail');
  A.ok(index.gates.slice(2, -1).every(g => g.status === 'unrun')); A.equal(index.localGateSetPassed, false);
});
suite('signal/launch failures cannot be recorded as passes', async (m, f) => {
  m.initialize(f.options);
  A.equal(await m.runGate('install', { ...f.options, execute: () => ({ status: null, signal: 'SIGTERM' }) }), 143);
  A.equal(state(f).gates[0].signal, 'SIGTERM'); A.equal(m.exitCode({ status: null, error: Error('launch') }), 1);
  A.equal(m.exitCode({ status: 7 }), 7); A.equal(m.exitCode({ status: null, signal: 'UNTRUSTED_PRIVATE' }), 1);
});
suite('unknown or out-of-order gates are rejected without a false pass', async (m, f) => {
  m.initialize(f.options); await A.rejects(m.runGate('unknown', f.options)); await A.rejects(m.runGate('unit', f.options));
  A.ok(state(f).gates.every(g => g.status === 'unrun'));
});
suite('in-progress gate is failed as interrupted and untouched following gates stay unrun', async (m, f) => {
  m.initialize(f.options); const s = state(f); s.gates[0].startedUTC = new Date().toISOString();
  put(f.root, 'private-state/state.json', s); m.finalize(f.options);
  A.equal(out(f).gates[0].status, 'fail'); A.equal(out(f).gates[0].reason, 'interrupted');
  A.equal(out(f).gates[0].exitCode, null); A.equal(out(f).gates[1].status, 'unrun');
});
suite('state corruption yields an explicit failing index rather than a guessed pass', async (m, f) => {
  m.initialize(f.options); put(f.root, 'private-state/state.json', '{incomplete');
  A.equal(m.finalize(f.options), 1); A.equal(out(f).localGateSetPassed, false);
  A.equal(out(f).gates.at(-1).status, 'fail'); A.ok(out(f).gates.slice(0, -1).every(g => g.status === 'unrun'));
});
suite('changed Git identity cannot consume earlier state', async (m, f) => {
  m.initialize(f.options); f.env.GITHUB_SHA = 'b'.repeat(40);
  await A.rejects(m.runGate('install', f.options)); A.equal(m.finalize(f.options), 1);
  A.equal(out(f).source.commit, 'b'.repeat(40)); A.equal(out(f).localGateSetPassed, false);
});
suite('missing Chrome is a failed identity gate, not a skipped browser pass', async (m, f) => {
  m.initialize(f.options); await through(m, f, 'chapter-earned');
  A.equal(await m.runGate('browser-identity', { ...f.options, browserProbe: () => { throw Error('no Chrome'); } }), 1);
  m.finalize(f.options); A.equal(out(f).browser.status, 'unavailable');
  A.equal(out(f).gates.find(g => g.id === 'browser-harness').status, 'unrun');
});
suite('failed HTTP readiness blocks every HTTP/browser continuation', async (m, f) => {
  m.initialize(f.options); await through(m, f, 'browser-harness');
  A.equal(await m.runGate('http-ready', { ...f.options, readyProbe: async () => ({ ready: false, attempts: 30 }) }), 1);
  await A.rejects(m.runGate('http-smoke', f.options)); m.finalize(f.options);
  const index = out(f); A.equal(index.gates.find(g => g.id === 'http-ready').reason, 'http-not-ready');
  A.equal(index.gates.find(g => g.id === 'http-ready').attempts, 30);
  A.ok(index.gates.slice(m.GATES.indexOf('http-smoke'), -1).every(g => g.status === 'unrun'));
});

test('HTTP readiness is bounded by attempt count and explicit total deadline without network', async () => {
  const m = await api; let clock = 0, calls = 0, sleeps = 0;
  const options = { probe: async ms => { calls++; A.ok(ms <= 1000); clock += ms; return false; },
    sleep: async ms => { sleeps++; clock += ms; }, now: () => clock };
  const failed = await m.waitForHttpReady(options);
  A.equal(failed.ready, false); A.ok(calls <= 30); A.ok(clock <= 30000); A.ok(sleeps > 0);
  let fastCalls = 0;
  const exhausted = await m.waitForHttpReady({ ...options, now: () => 0, probe: async () => { fastCalls++; return false; } });
  A.deepEqual(exhausted, { ready: false, attempts: 30 }); A.equal(fastCalls, 30);
});
test('HTTP readiness only succeeds on an affirmative probe and never widens budgets', async () => {
  const m = await api; let calls = 0;
  A.deepEqual(await m.waitForHttpReady({ probe: async () => ++calls === 3, sleep: async () => {}, now: () => 0 }), { ready: true, attempts: 3 });
  await A.rejects(m.waitForHttpReady({ attempts: 31 })); await A.rejects(m.waitForHttpReady({ deadlineMs: 30001 }));
  await A.rejects(m.waitForHttpReady({ requestMs: 1001 }));
});
for (const [name, change] of [
  ['dist runtime bytes', f => put(f.root, 'dist/assets/a.js', 'tampered')],
  ['dist manifest bytes', f => fs.appendFileSync(path.join(f.root, 'dist/integrity.json'), ' ')],
  ['source fixture bytes', f => put(f.root, 'assets/a.js', 'changed source')],
  ['package bytes', f => put(f.root, 'package.json', { version: '1.2.0-alpha.6' })],
  ['extra dist entry', f => put(f.root, 'dist/extra.txt', 'not allowed')]
]) suite('finalizer fails closed on ' + name + ' drift', async (m, f) => {
  m.initialize(f.options); await through(m, f); change(f);
  A.equal(m.finalize(f.options), 1); A.equal(out(f).artifactBinding.status, 'mismatch');
  A.equal(out(f).localGateSetPassed, false); A.equal(out(f).gates.at(-1).status, 'fail');
});
suite('finalizer refuses changed browser version even when all original commands passed', async (m, f) => {
  m.initialize(f.options); await through(m, f);
  A.equal(m.finalize({ ...f.options, browserProbe: () => ({ observation: { name: 'Google Chrome', version: '142.0.0.0' } }) }), 1);
  A.equal(out(f).browser.status, 'mismatch'); A.equal(out(f).localGateSetPassed, false);
});
suite('browser suites receive the observed executable and isolated report paths', async (m, f) => {
  m.initialize(f.options); await through(m, f, 'browser-identity'); let executed;
  A.equal(await m.runGate('browser-harness', { ...f.options, execute: (...args) => { executed = args; return { status: 0 }; } }), 0);
  A.equal(executed[0], 'npm'); A.equal(executed[2].env.CHROME_BIN, '/fixture/chrome');
  A.equal(executed[2].env.CHROME_PATH, '/fixture/chrome'); A.equal(executed[2].env.EW_UPDATE_OUTPUT, path.join(f.env.EW_EVIDENCE_RAW, 'update'));
  A.ok(executed[1].includes(path.join(f.env.EW_EVIDENCE_RAW, 'browser-harness')));
});
suite('diagnostics contain only projected primitives, never raw journeys, names, logs or tokens', async (m, f) => {
  m.initialize(f.options); await through(m, f);
  const secret = 'PRIVATE_JOURNEY_AND_ERROR_DO_NOT_UPLOAD';
  for (const [gate, [file, kind]] of Object.entries(reportSpecs)) {
    const raw = passingReport(kind); raw.private = secret;
    if (raw.checks) raw.checks[0] = { name: secret, evidence: secret };
    if (raw.postEndingUI) raw.postEndingUI = raw.postEndingUI.map(entry => ({ ...entry, journey: secret }));
    if (raw.results) raw.results = raw.results.map(entry => ({ ...entry, text: secret }));
    if (raw.guardianFixtures) raw.guardianFixtures = raw.guardianFixtures.map(entry => ({ ...entry, text: secret }));
    if (raw.diagnostics) {
      raw.diagnostics.requests.push({ headers: secret });
      raw.diagnostics.storageEvents.push({ value: secret });
    }
    put(f.env.EW_EVIDENCE_RAW, file, raw);
    A.ok(reportSpecs[gate]);
  }
  put(f.env.EW_EVIDENCE_RAW, 'journey.json', { data: secret }); put(f.env.EW_EVIDENCE_RAW, 'profile/log.txt', secret);
  A.equal(m.finalize(f.options), 0); const reports = out(f, 'reports.json');
  A.ok(reports.reports.every(r => r.availability === 'projected' && r.summary.internallyPassing));
  A.equal(reports.reports[0].summary.passed, 1);
  A.equal(reports.reports.at(-1).summary.diagnosticCounts.storageEvents, 1);
  for (const file of fs.readdirSync(f.env.EW_EVIDENCE_OUTPUT)) A.ok(!fs.readFileSync(path.join(f.env.EW_EVIDENCE_OUTPUT, file), 'utf8').includes(secret));
});
suite('successful report gate with a missing report blocks final eligibility', async (m, f) => {
  m.initialize(f.options); await through(m, f);
  fs.unlinkSync(path.join(f.env.EW_EVIDENCE_RAW, reportSpecs.update[0]));
  A.equal(m.finalize(f.options), 1);
  A.equal(out(f, 'reports.json').reports.find(r => r.gateId === 'update').availability, 'missing');
  A.equal(out(f).localGateSetPassed, false); A.equal(out(f).gates.at(-1).status, 'fail');
});
suite('successful report gate with malformed schema blocks final eligibility', async (m, f) => {
  m.initialize(f.options); await through(m, f);
  put(f.env.EW_EVIDENCE_RAW, reportSpecs['chapter-browser'][0], { pass: true });
  A.equal(m.finalize(f.options), 1);
  A.equal(out(f, 'reports.json').reports.find(r => r.gateId === 'chapter-browser').availability, 'invalid-or-unsafe');
  A.equal(out(f).gates.at(-1).exitCode, 1);
});
suite('successful gate with a contradictory internally failing report blocks eligibility', async (m, f) => {
  m.initialize(f.options); await through(m, f);
  const contradictory = passingReport('smoke'); contradictory.passed = 2;
  put(f.env.EW_EVIDENCE_RAW, reportSpecs['browser-harness'][0], contradictory);
  A.equal(m.finalize(f.options), 1);
  const report = out(f, 'reports.json').reports.find(r => r.gateId === 'browser-harness');
  A.equal(report.availability, 'projected'); A.equal(report.summary.internallyPassing, false);
  A.equal(out(f).localGateSetPassed, false);
});
test('every report schema projects its own valid internal failure as non-passing', async () => {
  const m = await api;
  const cases = [
    ['smoke', report => { report.failed = 1; }],
    ['upgrade', report => { report.errors.push({ private: 'not projected' }); }],
    ['chapter', report => { report.nativeAdvice = false; }],
    ['hud', report => { report.status = 'fail'; }],
    ['update', report => { report.failed = 1; report.failures.push({ private: 'not projected' }); }]
  ];
  for (const [kind, fail] of cases) {
    const report = passingReport(kind); fail(report);
    A.equal(m.projectReport(kind, report).internallyPassing, false, kind);
  }
});
suite('failed report-producing gate stays ineligible even with a passing report', async (m, f) => {
  m.initialize(f.options); await through(m, f, 'browser-identity');
  A.equal(await m.runGate('browser-harness', { ...f.options, execute: () => ({ status: 19 }) }), 19);
  emitPassingReport(f, 'browser-harness');
  A.equal(m.finalize(f.options), 1);
  const report = out(f, 'reports.json').reports.find(r => r.gateId === 'browser-harness');
  A.equal(report.availability, 'projected'); A.equal(report.summary.internallyPassing, true);
  A.equal(out(f).gates.find(g => g.id === 'browser-harness').status, 'fail');
  A.equal(out(f).gates.at(-1).status, 'fail');
});
suite('malformed, over-cap and symlink reports do not hide the original failed gate', async (m, f) => {
  m.initialize(f.options); await through(m, f, 'browser-identity');
  A.equal(await m.runGate('browser-harness', { ...f.options, execute: () => ({ status: 19 }) }), 19);
  put(f.env.EW_EVIDENCE_RAW, 'browser-harness/browser-results.json', '{broken');
  A.equal(m.finalize(f.options), 1); A.equal(out(f, 'reports.json').reports[0].availability, 'invalid-or-unsafe');
  put(f.env.EW_EVIDENCE_RAW, 'browser-harness/browser-results.json', 'x'.repeat(m.CAPS.report + 1));
  A.equal(m.finalize(f.options), 1); A.equal(out(f, 'reports.json').reports[0].availability, 'over-cap');
  fs.unlinkSync(path.join(f.env.EW_EVIDENCE_RAW, 'browser-harness/browser-results.json'));
  fs.symlinkSync(path.join(f.root, 'package.json'), path.join(f.env.EW_EVIDENCE_RAW, 'browser-harness/browser-results.json'));
  A.equal(m.finalize(f.options), 1); A.equal(out(f, 'reports.json').reports[0].availability, 'invalid-or-unsafe');
  A.equal(out(f).gates.find(g => g.id === 'browser-harness').exitCode, 19);
});
suite('unrun gates ignore even syntactically valid stale reports', async (m, f) => {
  m.initialize(f.options); put(f.env.EW_EVIDENCE_RAW, 'upgrade/report.json', passingReport('upgrade'));
  A.equal(m.finalize(f.options), 1);
  A.equal(out(f, 'reports.json').reports.find(r => r.gateId === 'upgrade').availability, 'unrun');
  A.equal(out(f).gates.at(-1).status, 'fail');
});
suite('upload output refuses unknown files and symlink targets', async (m, f) => {
  m.initialize(f.options); put(f.root, 'output/raw-log.txt', 'private'); A.throws(() => m.finalize(f.options));
  fs.unlinkSync(path.join(f.root, 'output/raw-log.txt'));
  fs.symlinkSync(path.join(f.root, 'package.json'), path.join(f.root, 'output/index.json'));
  A.throws(() => m.finalize(f.options)); A.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'package.json'))).version, '1.2.0-alpha.5');
});
suite('state/raw/output directories cannot overlap dist or each other and refuse symlinks', async (m, f) => {
  A.throws(() => m.initialize({ ...f.options, env: { ...f.env, EW_EVIDENCE_OUTPUT: path.join(f.root, 'dist/qa') } }));
  A.throws(() => m.initialize({ ...f.options, env: { ...f.env, EW_EVIDENCE_RAW: f.env.EW_EVIDENCE_STATE } }));
  fs.symlinkSync(path.join(f.root, 'assets'), f.env.EW_EVIDENCE_STATE, 'dir'); A.throws(() => m.initialize(f.options));
});
suite('source/package metadata refuses arbitrary strings instead of leaking them', async (m, f) => {
  A.throws(() => m.initialize({ ...f.options, env: { ...f.env, GITHUB_SHA: 'PRIVATE' } }));
  put(f.root, 'package.json', { version: 'PRIVATE_PAYLOAD' }); A.throws(() => m.artifactBinding(f.root, { commit: 'a'.repeat(40) }, f.options.sourceProbe));
  A.throws(() => m.projectReport('smoke', { passed: 'PRIVATE_PAYLOAD', failed: -1, checks: [] }));
});

test('both workflows preserve required gates, exact upload allowlist, pinned actions and Pages boundaries', async () => {
  const m = await api;
  const sources = ['ci', 'pages'].map(name => fs.readFileSync(path.join(__dirname, '../.github/workflows/' + name + '.yml'), 'utf8'));
  for (const [i, text] of sources.entries()) {
    const gates = [...text.matchAll(/node scripts\/release-evidence\.mjs run ([a-z-]+)/g)].map(x => x[1]);
    A.deepEqual(gates, m.GATES.filter(id => id !== 'evidence-finalize'));
    A.match(text, /name: Finalize artifact-bound release evidence\n\s+if: always\(\)/);
    A.match(text, /name: Retain allowlisted release diagnostics\n\s+if: always\(\) && steps\.evidence\.outputs\.upload_safe == 'true'/);
    A.match(text, /upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4\.6\.2/);
    A.match(text, /path: \|\n\s+\/tmp\/emberwake-release-evidence\/index.json\n\s+\/tmp\/emberwake-release-evidence\/reports.json/);
    A.ok(!/continue-on-error:|path: (?:qa|\*|dist\/)/.test(text)); A.match(text, /retention-days: 14/);
    A.ok([...text.matchAll(/uses: ([^\s]+)/g)].every(x => /@[a-f0-9]{40}$/.test(x[1])));
    A.match(text, new RegExp('EW_EVIDENCE_WORKFLOW: ' + ['ci', 'pages'][i]));
  }
  A.match(sources[0], /push:\n\s+branches: \[main\]\n\s+pull_request:/);
  A.match(sources[1], /workflow_dispatch:/); A.match(sources[1], /if: github.ref == 'refs\/heads\/main'/);
  A.match(sources[1], /cancel-in-progress: false/); A.match(sources[1], /deploy:\n\s+needs: verify/);
  A.match(sources[1], /upload-pages-artifact@[a-f0-9]{40}[^\n]*\n\s+with:\n\s+path: dist/);
  A.ok(sources[1].indexOf('mjs finalize') < sources[1].indexOf('upload-pages-artifact@'));
  A.match(sources[1], /environment:\n\s+name: github-pages/);
});

suite('unknown private-state fields are projected away rather than uploaded', async (m, f) => {
  m.initialize(f.options); await through(m, f); const s = state(f), privateText = 'PRIVATE_UNKNOWN_STATE_FIELD';
  s.log = privateText; s.gates[0].commandOutput = privateText; s.binding.package.raw = privateText;
  s.binding.artifact.debug = privateText; s.browser.path = privateText;
  put(f.root, 'private-state/state.json', s); A.equal(m.finalize(f.options), 0);
  A.equal(out(f).localGateSetPassed, true);
  for (const file of ['index.json', 'reports.json']) A.ok(!JSON.stringify(out(f, file)).includes(privateText));
});
suite('unsafe typed state is failed and discarded without serializing private values', async (m, f) => {
  m.initialize(f.options); const s = state(f), privateText = 'PRIVATE_ERROR_TEXT'; s.gates[0].reason = privateText;
  put(f.root, 'private-state/state.json', s); A.equal(m.finalize(f.options), 1);
  A.ok(!JSON.stringify(out(f)).includes(privateText)); A.equal(out(f).gates[0].status, 'unrun');
});
suite('setup failure is represented exactly and cannot produce an eligible gate set', async (m, f) => {
  m.initialize(f.options); await through(m, f);
  A.equal(m.finalize({ ...f.options, env: { ...f.env, EW_CHECKOUT_OUTCOME: 'success', EW_NODE_OUTCOME: 'failure' } }), 1);
  A.deepEqual(out(f).setup, { checkout: 'pass', node: 'fail' }); A.equal(out(f).localGateSetPassed, false);
  A.equal(out(f).gates.at(-1).status, 'fail');
});
suite('missing state still emits a failing bounded index if checkout left the script available', async (m, f) => {
  A.equal(m.finalize(f.options), 1); A.equal(out(f).localGateSetPassed, false);
  A.equal(out(f).artifactBinding.status, 'unavailable'); A.ok(out(f).gates.slice(0, -1).every(g => g.status === 'unrun'));
});

suite('declared source SHA must match independently observed checkout before initialization', async (m, f) => {
  A.throws(() => m.initialize({ ...f.options, sourceProbe: () => 'b'.repeat(40) }));
});
suite('checkout HEAD drift fails final artifact binding without invoking local Git', async (m, f) => {
  m.initialize(f.options); await through(m, f);
  A.equal(m.finalize({ ...f.options, sourceProbe: () => 'b'.repeat(40) }), 1);
  A.equal(out(f).artifactBinding.status, 'mismatch'); A.equal(out(f).localGateSetPassed, false);
});

test('late HTTP success after the total deadline is still not ready', async () => {
  const m = await api; let clock = 0;
  const result = await m.waitForHttpReady({ now: () => clock, probe: async () => { clock = 30001; return true; }, sleep: async () => {} });
  A.deepEqual(result, { ready: false, attempts: 1 });
});
suite('corrupt state cannot pair a passing artifact gate with missing binding', async (m, f) => {
  m.initialize(f.options); await through(m, f, 'artifact-bind'); const s = state(f); s.binding = null;
  put(f.root, 'private-state/state.json', s); A.equal(m.finalize(f.options), 1);
  A.equal(out(f).localGateSetPassed, false); A.equal(out(f).gates.find(g => g.id === 'artifact-bind').status, 'unrun');
});


suite('Chrome PATH discovery yields an absolute executable for Playwright, without launching it', async (m, f) => {
  put(f.root, 'bin/google-chrome', '#!/bin/false\n'); fs.chmodSync(path.join(f.root, 'bin/google-chrome'), 0o755);
  A.equal(m.resolveExecutable('google-chrome', { PATH: path.join(f.root, 'bin') }), path.join(f.root, 'bin/google-chrome'));
  A.equal(m.resolveExecutable(path.join(f.root, 'bin/google-chrome'), {}), path.join(f.root, 'bin/google-chrome'));
  A.equal(m.resolveExecutable('google-chrome-stable', { PATH: path.join(f.root, 'bin') }), null);
  fs.chmodSync(path.join(f.root, 'bin/google-chrome'), 0o644);
  A.equal(m.resolveExecutable('google-chrome', { PATH: path.join(f.root, 'bin') }), null);
});


suite('safe diagnostics can be uploaded after a binding failure without making the gate pass', async (m, f) => {
  m.initialize(f.options); await through(m, f); put(f.root, 'assets/a.js', 'drift');
  const file = path.join(f.root, 'step-output');
  A.equal(m.finalize({ ...f.options, env: { ...f.env, GITHUB_OUTPUT: file } }), 1);
  A.equal(fs.readFileSync(file, 'utf8'), 'upload_safe=true\n');
  A.equal(out(f).localGateSetPassed, false); A.equal(out(f).artifactBinding.status, 'mismatch');
});
suite('unsafe allowlisted files cannot grant the always-run upload safety marker', async (m, f) => {
  m.initialize(f.options); const file = path.join(f.root, 'step-output');
  fs.symlinkSync(path.join(f.root, 'package.json'), path.join(f.env.EW_EVIDENCE_OUTPUT, 'index.json'));
  A.throws(() => m.finalize({ ...f.options, env: { ...f.env, GITHUB_OUTPUT: file } }));
  A.equal(fs.existsSync(file), false);
});
