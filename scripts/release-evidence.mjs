/** Release-only evidence. Never capture stdout, copy raw reports, or write into dist. */
import * as fs from 'node:fs';
import { resolve, join, dirname, parse, delimiter } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { get } from 'node:http';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { loadDist } from './build.mjs';

export const GATES = Object.freeze([
  'install', 'unit', 'secrets', 'build', 'artifact-bind', 'campaign', 'chapter-earned',
  'browser-identity', 'browser-harness', 'http-ready', 'http-smoke', 'firstload',
  'chapter-browser', 'upgrade', 'hud', 'persistence', 'update', 'evidence-finalize'
]);
export const CAPS = Object.freeze({ state: 32768, report: 2097152, output: 65536 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const utc = () => new Date().toISOString();
const refuse = () => { throw Error('Release evidence refused unsafe, missing or inconsistent input'); };
const exists = p => { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
function noLinks(p) {
  for (let q = resolve(p); q !== parse(q).root; q = dirname(q))
    if (exists(q) && fs.lstatSync(q).isSymbolicLink()) refuse();
}
function read(p, cap) {
  noLinks(p);
  const s = fs.lstatSync(p);
  if (!s.isFile() || s.size > cap) refuse();
  const fd = fs.openSync(p, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const current = fs.fstatSync(fd);
    if (!current.isFile() || current.size !== s.size) refuse();
    const b = fs.readFileSync(fd);
    if (b.length !== s.size) refuse();
    return b;
  } finally { fs.closeSync(fd); }
}
function write(p, value) {
  noLinks(p);
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  if (bytes.length > CAPS.output) refuse();
  const temp = p + '.' + randomUUID() + '.tmp';
  try { fs.writeFileSync(temp, bytes, { flag: 'wx', mode: 0o600 }); fs.renameSync(temp, p); }
  finally { if (exists(temp)) fs.unlinkSync(temp); }
}
function directory(p) {
  noLinks(p);
  fs.mkdirSync(p, { recursive: true, mode: 0o700 });
  if (!fs.lstatSync(p).isDirectory()) refuse();
}
function locations(root, env) {
  const state = resolve(env.EW_EVIDENCE_STATE || join(root, '.release-evidence-state'));
  const output = resolve(env.EW_EVIDENCE_OUTPUT || join(root, '.release-evidence-output'));
  const raw = resolve(env.EW_EVIDENCE_RAW || join(root, '.release-evidence-raw'));
  const paths = [state, output, raw, join(resolve(root), 'dist')];
  for (const p of paths) noLinks(p);
  for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++)
    if (paths[i] === paths[j] || paths[i].startsWith(paths[j] + '/') || paths[j].startsWith(paths[i] + '/')) refuse();
  return { state, output, raw };
}
function identity(env) {
  const commit = /^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '') ? env.GITHUB_SHA : null;
  const runId = /^[0-9]{1,20}$/.test(env.GITHUB_RUN_ID || '') ? env.GITHUB_RUN_ID : null;
  const runAttempt = /^[0-9]{1,8}$/.test(env.GITHUB_RUN_ATTEMPT || '') ? env.GITHUB_RUN_ATTEMPT : null;
  const workflow = ['ci', 'pages'].includes(env.EW_EVIDENCE_WORKFLOW) ? env.EW_EVIDENCE_WORKFLOW : null;
  return { commit, workflow, runId, runAttempt };
}
function initial(env) {
  return { schemaVersion: 1, source: identity(env), createdUTC: utc(), binding: null, browser: null,
    gates: GATES.map(id => ({ id, status: 'unrun', startedUTC: null, completedUTC: null, exitCode: null, signal: null, reason: null })) };
}
const isSHA = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const isVersion = x => typeof x === 'string' && x.length <= 128 && /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]{1,64})?(?:\+[A-Za-z0-9.-]{1,64})?$/.test(x);
const isUTC = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x) && Number.isFinite(Date.parse(x));
const REASONS = new Set([null, 'command-exit', 'artifact-verified', 'browser-observed', 'http-200', 'http-not-ready',
  'evidence-or-command-error', 'interrupted', 'index-assembled', 'evidence-incomplete-or-mismatched']);
function cleanBinding(value) {
  if (value === null) return null;
  const p = value?.package, a = value?.artifact;
  if (!/^[a-f0-9]{40}$/.test(value?.sourceCommit || '') || !isVersion(p?.version) || !isSHA(p?.sha256) ||
      a?.directory !== 'dist' || !isSHA(a.integritySHA256) || !isSHA(a.workerSHA256) ||
      !/^emberwake-[a-f0-9]{12}$/.test(a.workerId || '') || !Number.isSafeInteger(a.runtimeFiles) ||
      a.runtimeFiles < 1 || a.runtimeFiles > 2048 || !Number.isSafeInteger(a.runtimeBytes) || a.runtimeBytes < 1 || a.runtimeBytes > 67108864) refuse();
  return { sourceCommit: value.sourceCommit, package: { version: p.version, sha256: p.sha256 },
    artifact: { directory: 'dist', integritySHA256: a.integritySHA256, workerId: a.workerId, workerSHA256: a.workerSHA256,
      runtimeFiles: a.runtimeFiles, runtimeBytes: a.runtimeBytes } };
}
function cleanBrowser(value) {
  if (value === null) return null;
  if (!['Google Chrome', 'Google Chrome for Testing'].includes(value?.name) ||
      typeof value?.version !== 'string' || value.version.length > 64 || !/^\d+\.\d+\.\d+\.\d+$/.test(value.version)) refuse();
  return { name: value.name, version: value.version };
}
function stateAt(paths, env) {
  const s = JSON.parse(read(join(paths.state, 'state.json'), CAPS.state));
  if (s.schemaVersion !== 1 || JSON.stringify(s.source) !== JSON.stringify(identity(env)) || !isUTC(s.createdUTC) ||
      !Array.isArray(s.gates) || s.gates.length !== GATES.length) refuse();
  const gates = s.gates.map((g, i) => {
    if (g.id !== GATES[i] || !['pass', 'fail', 'unrun'].includes(g.status) ||
        !(g.startedUTC === null || isUTC(g.startedUTC)) || !(g.completedUTC === null || isUTC(g.completedUTC)) ||
        !(g.exitCode === null || (Number.isInteger(g.exitCode) && g.exitCode >= 0 && g.exitCode <= 255)) ||
        !(g.signal === null || allowedSignal(g.signal)) || !REASONS.has(g.reason) ||
        (g.status === 'pass' && (!g.startedUTC || !g.completedUTC || g.exitCode !== 0)) ||
        (g.status === 'fail' && (!g.startedUTC || !g.completedUTC)) ||
        (g.status === 'unrun' && (g.completedUTC !== null || g.exitCode !== null)) ||
        (g.attempts !== undefined && (g.id !== 'http-ready' || !Number.isInteger(g.attempts) || g.attempts < 0 || g.attempts > 30))) refuse();
    return { id: g.id, status: g.status, startedUTC: g.startedUTC, completedUTC: g.completedUTC,
      exitCode: g.exitCode, signal: g.signal, reason: g.reason, ...(g.attempts === undefined ? {} : { attempts: g.attempts }) };
  });
  const binding = cleanBinding(s.binding), browser = cleanBrowser(s.browser);
  if ((gates[GATES.indexOf('artifact-bind')].status === 'pass') !== !!binding ||
      (gates[GATES.indexOf('browser-identity')].status === 'pass') !== !!browser ||
      (binding && binding.sourceCommit !== s.source.commit)) refuse();
  let stopped = false;
  for (const gate of gates.slice(0, -1)) {
    if (stopped && gate.status !== 'unrun') refuse();
    if (gate.status !== 'pass') stopped = true;
  }
  // Even private state is projected: unknown keys/strings cannot become upload content.
  return { schemaVersion: 1, source: identity(env), createdUTC: s.createdUTC, binding, browser, gates };
}
function save(paths, state) { write(join(paths.state, 'state.json'), state); }
function readSourceCommit(root) {
  // CI runtime only: local, read-only checkout identity; no network/authentication.
  const result = spawnSync('git', ['rev-parse', '--verify', 'HEAD'],
    { cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 256, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  const commit = result.status === 0 ? result.stdout.trim() : '';
  if (!/^[a-f0-9]{40}$/.test(commit)) refuse();
  return commit;
}
export function initialize({ root = process.cwd(), env = process.env, sourceProbe = readSourceCommit } = {}) {
  const paths = locations(root, env);
  // Never reuse previous-run evidence or committed historical QA outputs.
  for (const p of Object.values(paths)) {
    directory(p);
    if (fs.readdirSync(p).length) refuse();
  }
  const state = initial(env);
  if (!state.source.commit || !state.source.workflow || sourceProbe(root) !== state.source.commit) refuse();
  save(paths, state);
}
export function artifactBinding(root, source, sourceProbe = readSourceCommit) {
  if (sourceProbe(root) !== source.commit) refuse();
  const packageBytes = read(join(root, 'package.json'), 65536);
  const version = JSON.parse(packageBytes).version;
  if (!isVersion(version)) refuse();
  const dist = loadDist(join(root, 'dist'));
  // Browser suites use both dist and source fixtures: they must be the same bytes.
  for (const entry of dist.manifest.files)
    if (sha(read(join(root, entry.path), 16777216)) !== entry.sha256) refuse();
  const worker = dist.files.get('sw.js');
  const workerId = worker?.toString('utf8').match(/\bCACHE\s*=\s*PREFIX\s*\+\s*"(emberwake-[a-f0-9]{12})"\s*,/)?.[1];
  if (!workerId || !/^[a-f0-9]{40}$/.test(source.commit || '')) refuse();
  return { sourceCommit: source.commit, package: { version, sha256: sha(packageBytes) },
    artifact: { directory: 'dist', integritySHA256: sha(dist.files.get('integrity.json')),
      workerId, workerSHA256: sha(worker), runtimeFiles: dist.manifest.files.length,
      runtimeBytes: dist.manifest.files.reduce((n, f) => n + f.bytes, 0) } };
}
export function resolveExecutable(command, env = process.env) {
  if (typeof command !== 'string' || !command) return null;
  const candidates = command.includes('/') ? [resolve(command)] :
    (env.PATH || '').split(delimiter).filter(Boolean).map(p => resolve(p, command));
  for (const file of candidates) try {
    if (!fs.statSync(file).isFile()) continue;
    fs.accessSync(file, fs.constants.X_OK); return file;
  } catch { /* Try the next PATH entry; do not serialize filesystem errors. */ }
  return null;
}
function observeBrowser(env) {
  // Same required Chrome choices as the original workflows; no Chromium fallback.
  for (const command of [env.CHROME_BIN, 'google-chrome', 'google-chrome-stable'].filter(Boolean)) {
    const executable = resolveExecutable(command, env);
    if (!executable) continue;
    const result = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 5000, maxBuffer: 4096 });
    const match = result.status === 0 && result.stdout.trim().match(/^(Google Chrome(?: for Testing)?) (\d+\.\d+\.\d+\.\d+)$/);
    if (match) return { executable, observation: { name: match[1], version: match[2] } };
  }
  refuse();
}
export function commandFor(id, raw) {
  const commands = {
    install: ['npm', ['ci']], unit: ['npm', ['test']], secrets: ['npm', ['run', 'check:secrets']],
    build: ['npm', ['run', 'build']], campaign: ['npm', ['run', 'test:campaign']],
    'chapter-earned': ['npm', ['run', 'test:chapter:earned']],
    'browser-harness': ['npm', ['run', 'test:browser', '--', '--output', join(raw, 'browser-harness')]],
    'http-smoke': ['python3', ['tests/browser-smoke.py', '--base-url', 'http://127.0.0.1:4173/Swordigo-V2/', '--output', join(raw, 'http-smoke')]],
    firstload: ['npm', ['run', 'test:firstload:browser']], 'chapter-browser': ['npm', ['run', 'test:chapter:browser']],
    upgrade: ['npm', ['run', 'test:upgrade:browser']], hud: ['npm', ['run', 'test:hud:browser']],
    persistence: ['npm', ['run', 'test:persistence:browser']], update: ['npm', ['run', 'test:update:browser']]
  };
  return Object.hasOwn(commands, id) ? commands[id] : null;
}
const SIGNAL_CODES = { SIGHUP: 129, SIGINT: 130, SIGKILL: 137, SIGTERM: 143, SIGABRT: 134, SIGSEGV: 139 };
const allowedSignal = value => Object.hasOwn(SIGNAL_CODES, value || '') ? value : null;
export function exitCode(result) {
  if (Number.isInteger(result.status) && result.status >= 0 && result.status <= 255) return result.status;
  return SIGNAL_CODES[allowedSignal(result.signal)] || 1;
}
function probeHttp(timeoutMs) {
  return new Promise(resolveProbe => {
    let done = false;
    const finish = value => { if (!done) { done = true; clearTimeout(timer); resolveProbe(value); } };
    // Hard deadline, not just a socket-idle timeout. No redirects or response bodies.
    const request = get('http://127.0.0.1:4173/Swordigo-V2/', response => {
      const ok = response.statusCode === 200;
      response.destroy(); finish(ok);
    });
    const timer = setTimeout(() => { request.destroy(); finish(false); }, timeoutMs);
    request.on('error', () => finish(false));
  });
}
export async function waitForHttpReady({ probe = probeHttp, sleep = delay, now = () => performance.now(),
  attempts = 30, requestMs = 1000, intervalMs = 1000, deadlineMs = 30000 } = {}) {
  if (![attempts, requestMs, intervalMs, deadlineMs].every(Number.isInteger) || attempts < 1 || attempts > 30 ||
      requestMs < 1 || requestMs > 1000 || intervalMs < 0 || intervalMs > 1000 || deadlineMs < 1 || deadlineMs > 30000) refuse();
  const deadline = now() + deadlineMs;
  for (let n = 1; n <= attempts; n++) {
    const remaining = deadline - now();
    if (remaining <= 0) return { ready: false, attempts: n - 1 };
    if (await probe(Math.min(requestMs, remaining)) && now() <= deadline) return { ready: true, attempts: n };
    if (n < attempts && now() < deadline) await sleep(Math.min(intervalMs, deadline - now()));
  }
  return { ready: false, attempts };
}
export async function runGate(id, { root = process.cwd(), env = process.env,
  execute = (file, args, options) => spawnSync(file, args, options), browserProbe = observeBrowser,
  readyProbe = waitForHttpReady, sourceProbe = readSourceCommit } = {}) {
  if (!GATES.includes(id) || id === 'evidence-finalize') refuse();
  const paths = locations(root, env), state = stateAt(paths, env), gate = state.gates.find(g => g.id === id);
  const index = GATES.indexOf(id);
  // No blind retries or out-of-order passes after an earlier failure/unrun gate.
  if (gate.startedUTC || state.gates.slice(0, index).some(g => g.status !== 'pass')) refuse();
  gate.startedUTC = utc(); save(paths, state);
  let result = { status: 1 }, reason = 'command-exit';
  try {
    if (id === 'artifact-bind') {
      state.binding = artifactBinding(root, state.source, sourceProbe); result = { status: 0 }; reason = 'artifact-verified';
    } else if (id === 'browser-identity') {
      state.browser = cleanBrowser(browserProbe(env).observation); result = { status: 0 }; reason = 'browser-observed';
    } else if (id === 'http-ready') {
      const ready = await readyProbe(); gate.attempts = ready.attempts;
      result = { status: ready.ready ? 0 : 1 }; reason = ready.ready ? 'http-200' : 'http-not-ready';
    } else {
      const [file, args] = commandFor(id, paths.raw);
      const childEnv = { ...env, EW_UPGRADE_OUTPUT: join(paths.raw, 'upgrade'), EW_CHAPTER_OUTPUT: join(paths.raw, 'chapter'),
        EW_HUD_OUTPUT: join(paths.raw, 'hud'), EW_UPDATE_OUTPUT: join(paths.raw, 'update') };
      if (index > GATES.indexOf('browser-identity')) {
        const browser = browserProbe(env);
        if (JSON.stringify(browser.observation) !== JSON.stringify(state.browser)) refuse();
        childEnv.CHROME_BIN = browser.executable; childEnv.CHROME_PATH = browser.executable;
      }
      result = execute(file, args, { cwd: root, env: childEnv, stdio: 'inherit' });
    }
  } catch { reason = 'evidence-or-command-error'; }
  const code = exitCode(result);
  Object.assign(gate, { status: code === 0 ? 'pass' : 'fail', completedUTC: utc(), exitCode: code,
    signal: allowedSignal(result.signal), reason });
  save(paths, state);
  // Exact ordinary exit code; the original error remains in the job console only.
  return code;
}

const REPORTS = Object.freeze([
  ['browser-harness', 'browser-harness/browser-results.json', 'smoke'],
  ['http-smoke', 'http-smoke/browser-results.json', 'smoke'],
  ['chapter-browser', 'chapter/report.json', 'chapter'], ['upgrade', 'upgrade/report.json', 'upgrade'],
  ['hud', 'hud/report.json', 'hud'], ['update', 'update/report.json', 'update']
]);
const count = x => Number.isSafeInteger(x) && x >= 0 && x <= 1000000 ? x : null;
const size = x => Array.isArray(x) && x.length <= 100000 ? x.length : null;
const bool = x => typeof x === 'boolean' ? x : null;
export function projectReport(kind, report) {
  if (!report || Array.isArray(report) || typeof report !== 'object') refuse();
  const required = values => {
    if (values.some(value => value === null)) refuse();
    return values;
  };
  if (kind === 'smoke') {
    const [passed, failed, checks, runtimeExceptions, missingAssets] = required([
      count(report.passed), count(report.failed), size(report.checks),
      size(report.runtimeExceptions), size(report.missingAssets)
    ]);
    return { passed, failed, checks, runtimeExceptions, missingAssets,
      internallyPassing: failed === 0 && passed === checks && runtimeExceptions === 0 && missingAssets === 0 };
  }
  if (kind === 'upgrade') {
    const [passed, checks, errors, failures] = required([
      count(report.passed), size(report.checks), size(report.errors), size(report.failures)
    ]);
    return { passed, failed: count(report.failed), checks, errors, failures,
      internallyPassing: passed === checks && errors === 0 && failures === 0 };
  }
  if (kind === 'chapter') {
    const [pass, roomEntered, nativeAdvice, nativeFollowedDelivery, nativeUpgradePreview, postEndingChecks] = required([
      bool(report.pass), bool(report.roomEntered), bool(report.nativeAdvice),
      bool(report.nativeFollowedDelivery), bool(report.nativeUpgradePreview?.pass), size(report.postEndingUI)
    ]);
    if (report.postEndingUI.some(entry => !entry || Array.isArray(entry) || typeof entry !== 'object' || bool(entry.pass) === null)) refuse();
    return { pass, roomEntered, nativeAdvice, nativeFollowedDelivery, nativeUpgradePreview, postEndingChecks,
      internallyPassing: pass && roomEntered && nativeAdvice && nativeFollowedDelivery && nativeUpgradePreview &&
        postEndingChecks === 2 && report.postEndingUI.every(entry => entry.pass) };
  }
  if (kind === 'hud') {
    if (!['pass', 'fail'].includes(report.status)) refuse();
    const [captures, errors, viewports, guardianFixtures] = required([
      count(report.captures), size(report.errors), size(report.results), size(report.guardianFixtures)
    ]);
    return { pass: report.status === 'pass', captures, errors, viewports, guardianFixtures,
      internallyPassing: report.status === 'pass' && captures === 15 && errors === 0 &&
        viewports === 3 && guardianFixtures === 6 };
  }
  if (kind === 'update') {
    const [passed, failed, checks, failures, fixtureDiagnosticWriteErrors] = required([
      count(report.passed), count(report.failed), size(report.checks), size(report.failures),
      count(report.fixtureDiagnosticWriteErrors)
    ]);
    const diagnostics = {};
    for (const key of ['requests', 'pageErrors', 'consoleErrors', 'partialInstall', 'events', 'milestones', 'observations', 'fixtureStages', 'storageEvents'])
      diagnostics[key] = size(report.diagnostics?.[key]);
    required(Object.values(diagnostics));
    const setupBlocked = report.status === 'setup-blocked';
    if (!(report.status === undefined || setupBlocked)) refuse();
    return { passed, failed, checks, failures, setupBlocked, fixtureDiagnosticWriteErrors,
      diagnosticCounts: diagnostics, internallyPassing: !setupBlocked && failed === 0 &&
        passed === checks && failures === 0 && fixtureDiagnosticWriteErrors === 0 };
  }
  refuse();
}
function reportsAt(paths, state) {
  return REPORTS.map(([gateId, path, kind]) => {
    const gate = state.gates.find(g => g.id === gateId);
    if (!gate.startedUTC) return { gateId, availability: 'unrun', summary: null };
    const file = join(paths.raw, path);
    try {
      if (!exists(file)) return { gateId, availability: 'missing', summary: null };
      noLinks(file);
      if (fs.lstatSync(file).size > CAPS.report) return { gateId, availability: 'over-cap', summary: null };
      return { gateId, availability: 'projected', summary: projectReport(kind, JSON.parse(read(file, CAPS.report))) };
    } catch { return { gateId, availability: 'invalid-or-unsafe', summary: null }; }
  });
}
const SETUP_OUTCOMES = { success: 'pass', failure: 'fail', cancelled: 'fail', skipped: 'unrun' };
const setupOutcome = value => Object.hasOwn(SETUP_OUTCOMES, value || '') ? SETUP_OUTCOMES[value] : 'unrun';
export function finalize({ root = process.cwd(), env = process.env, browserProbe = observeBrowser, sourceProbe = readSourceCommit } = {}) {
  const paths = locations(root, env);
  directory(paths.state); directory(paths.output); directory(paths.raw);
  if (fs.readdirSync(paths.output).some(n => !['index.json', 'reports.json'].includes(n))) refuse();
  let state, recovered = false;
  try { state = stateAt(paths, env); }
  catch { state = initial(env); recovered = true; }
  for (const gate of state.gates) if (gate.startedUTC && !gate.completedUTC)
    Object.assign(gate, { status: 'fail', completedUTC: utc(), reason: 'interrupted' });
  let bindingStatus = state.binding ? 'mismatch' : 'unavailable', browserStatus = state.browser ? 'mismatch' : 'unavailable';
  if (state.binding) try {
    if (JSON.stringify(artifactBinding(root, state.source, sourceProbe)) === JSON.stringify(state.binding)) bindingStatus = 'verified';
  } catch { /* Static status only; no paths or raw errors enter artifacts. */ }
  if (state.browser) try {
    if (JSON.stringify(browserProbe(env).observation) === JSON.stringify(state.browser)) browserStatus = 'verified';
  } catch { /* Preserve original gate result, explicitly fail final binding. */ }
  const allPassed = state.gates.filter(g => g.id !== 'evidence-finalize').every(g => g.status === 'pass');
  const consistent = !recovered && !!state.source.commit && !!state.source.workflow &&
    (!state.binding ? !allPassed : bindingStatus === 'verified') && (!state.browser ? !allPassed : browserStatus === 'verified');
  const setup = { checkout: setupOutcome(env.EW_CHECKOUT_OUTCOME), node: setupOutcome(env.EW_NODE_OUTCOME) };
  const reports = { schemaVersion: 1, reports: reportsAt(paths, state) };
  const setupPass = Object.values(setup).every(status => status === 'pass');
  const requiredReportsPass = reports.reports.every(report => {
    const reportGate = state.gates.find(g => g.id === report.gateId);
    return reportGate.status !== 'pass' ||
      (report.availability === 'projected' && report.summary?.internallyPassing === true);
  });
  const eligible = consistent && allPassed && setupPass && requiredReportsPass;
  const gate = state.gates.find(g => g.id === 'evidence-finalize');
  Object.assign(gate, { status: eligible ? 'pass' : 'fail', startedUTC: utc(), completedUTC: utc(),
    exitCode: eligible ? 0 : 1, reason: eligible ? 'index-assembled' : 'evidence-incomplete-or-mismatched' });
  const index = { schemaVersion: 1, generatedUTC: utc(), source: state.source, setup,
    localGateSetPassed: eligible,
    artifactBinding: { status: bindingStatus, built: state.binding },
    browser: { status: browserStatus, observed: state.browser }, gates: state.gates,
    diagnostics: { file: 'reports.json', sha256: sha(Buffer.from(JSON.stringify(reports, null, 2) + '\n')) },
    publicByteVerification: 'unrun',
    limitations: ['Local CI gates only; not public deployment, hardware, human gameplay or accessibility certification.',
      'Numeric/boolean report projections only; missing reports never imply a pass. Raw logs, journeys and profiles are excluded.'] };
  write(join(paths.output, 'reports.json'), reports);
  write(join(paths.output, 'index.json'), index);
  save(paths, state);
  // An always-run upload must never follow an unsafe/stale symlink after a failed finalizer.
  // Publish the safety marker only after both allowlisted files were freshly assembled.
  if (env.GITHUB_OUTPUT) {
    noLinks(env.GITHUB_OUTPUT);
    if (exists(env.GITHUB_OUTPUT) && !fs.lstatSync(env.GITHUB_OUTPUT).isFile()) refuse();
    fs.appendFileSync(env.GITHUB_OUTPUT, 'upload_safe=true\n', { mode: 0o600 });
  }
  // Early failed gates already block the job; artifact/browser drift must also block Pages.
  return eligible ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const [command, id, ...extra] = process.argv.slice(2);
    if (extra.length || (command !== 'run' && id)) refuse();
    if (command === 'init') initialize();
    else if (command === 'run') process.exitCode = await runGate(id);
    else if (command === 'finalize') process.exitCode = finalize();
    else refuse();
  } catch {
    console.error('Release evidence failed: unsafe, missing or inconsistent input (details withheld).');
    process.exitCode = 1;
  }
}
