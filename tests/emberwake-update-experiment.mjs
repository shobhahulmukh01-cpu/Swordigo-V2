#!/usr/bin/env node
/**
 * Coordinated, opt-in experiment. Never imported by the normal browser suite.
 * Run ONLY after parent GO, source freeze and final build:
 *   node tests/emberwake-update-experiment.mjs --output qa/correction/next-final/update-experiment
 * No builds, installs, authentication, retries or acceptance-predicate changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { chromium } from '@playwright/test';

const SELF = fileURLToPath(import.meta.url);
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const HISTORICAL_COMMIT = '6c266e9d0d8eaf8ceb73f298b9cf76174fe25290';
const HISTORICAL_WORKER = '0dff1449b6dca02b90b3578cd3c6ef901cf8f583ea723ab100e1d5ce86246825';
export const LIMITS = Object.freeze({ totalMs: 1800000, externalMs: 175000, internalMs: 150000, predicateMs: 45000 });
export const SCREEN_LIMITS = Object.freeze({ totalMs: 720000, externalMs: 175000, internalMs: 150000, predicateMs: 45000 });
export const SCREEN_CAVEAT = 'Four-cell causal SCREEN only: passes mean non-reproduction under recorded conditions, not cause closure, historical12 completion, repeatability clearance or production robustness.';
export const CAVEAT = 'The earlier historical rollback window.lumen timeout remains unexplained. Even 12/12 passes establish only bounded observations under recorded conditions, not root-cause resolution or production rollback robustness.';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const now = () => new Date().toISOString();
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function save(file, value) {
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temp, file);
}
export function trialPlan() {
  return Array.from({ length: 12 }, (_, i) => ({
    number: i + 1, arm: i >= 4 && i < 8 ? 'rollback-only' : 'full',
    competing: i >= 8, expectedChecks: i >= 4 && i < 8 ? 1 : 7
  }));
}
export function experimentConfig(mode = 'historical12') {
  if (mode === 'historical12') return { mode, limits: LIMITS, plan: trialPlan(), caveat: CAVEAT, passedStatus: 'passed-bounded-12-trials' };
  if (mode !== 'screen4') throw Error('Unknown experiment plan');
  return { mode, limits: SCREEN_LIMITS, plan: [
    { number: 1, arm: 'rollback-only', competing: false, expectedChecks: 1 },
    { number: 2, arm: 'full', competing: false, expectedChecks: 7 },
    { number: 3, arm: 'rollback-only', competing: true, expectedChecks: 1 },
    { number: 4, arm: 'full', competing: true, expectedChecks: 7 }
  ], caveat: SCREEN_CAVEAT, passedStatus: 'passed-screen4-non-reproduction' };
}
export function parseExperimentArgs(args) {
  const options = { mode: 'historical12' }, seen = new Set();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i], value = args[i + 1];
    if (!['--plan', '--output', '--freeze'].includes(flag) || !value || value.startsWith('--') || seen.has(flag))
      throw Error('Usage: --plan historical12|screen4 --output DIRECTORY [--freeze JSON]');
    seen.add(flag);
    options[flag === '--plan' ? 'mode' : flag.slice(2)] = value;
  }
  experimentConfig(options.mode);
  if (options.mode === 'screen4' && !options.freeze) throw Error('screen4 requires a parent-approved --freeze JSON');
  if (options.mode !== 'screen4' && options.freeze) throw Error('--freeze is scoped to screen4');
  return options;
}
export function validateFreeze(freeze, source, executableSHA256) {
  const problems = [];
  if (freeze?.sourceSHA256 !== source.sha256) problems.push('Frozen source inventory differs');
  if (freeze?.workerSHA256 !== source.files['sw.js']?.sha256) problems.push('Frozen worker differs');
  if (!freeze?.browserVersion || typeof freeze.browserVersion !== 'string') problems.push('Frozen browser version required');
  if (!executableSHA256 || freeze?.browserExecutableSHA256 !== executableSHA256) problems.push('Frozen browser executable differs');
  return problems;
}
export function validateScreenDiagnostics(report, trial) {
  const problems = [], d = report.diagnostics;
  if (!d || !Array.isArray(d.events) || !d.events.some(e => e.kind === 'page-target')) problems.push('Missing page/target identity diagnostics');
  if (report.fixtureDiagnosticWriteErrors !== 0) problems.push('Fixture diagnostic persistence incomplete');
  if (Object.values(d?.dropped || {}).some(n => n > 0) || d?.storageEvents?.some(e => e.event?.status === 'document-cap-reached')) problems.push('Capped diagnostics incomplete; screen interpretation blocked');
  if (trial.arm === 'full') {
    for (const ending of ['mercy', 'rekindle']) {
      const stages = d?.fixtureStages?.filter(e => e.ending === ending) || [];
      if (!['writer-readback', 'observer-initial', 'observer-synchronized', 'fixture-ready', 'immediate-equality'].every(stage => stages.some(e => e.stage === stage)))
        problems.push(`Missing progressive fixture evidence: ${ending}`);
      if (stages.filter(e => e.stage === 'writer-readback').some(e => !e.writer?.frame?.origin || !e.observer?.frame?.origin || !e.writer?.contextId))
        problems.push(`Missing fixture frame/origin identities: ${ending}`);
    }
  }
  return problems;
}
export function screenShouldStop(entry) { return entry.status !== 'passed'; }
export function compareSources(before, after) {
  return [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].sort()
    .filter(file => before.files[file]?.sha256 !== after.files[file]?.sha256 ||
      before.files[file]?.bytes !== after.files[file]?.bytes);
}
export function sourceSnapshot(root = ROOT) {
  const files = {};
  function walk(relative, required = true) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) {
      if (required) throw Error(`Required source missing: ${relative}`);
      return;
    }
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw Error(`Source symlink refused: ${relative}`);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) walk(`${relative}/${name}`);
    } else {
      if (!stat.isFile() || stat.size > 32 * 1024 * 1024) throw Error(`Unexpected source file: ${relative}`);
      const bytes = fs.readFileSync(absolute);
      files[relative] = { bytes: bytes.length, sha256: sha(bytes) };
    }
  }
  // Exclude changing QA outputs, documentation, node_modules and Git storage.
  for (const p of ['index.html', 'sw.js', 'assets', 'src', 'scripts', 'package.json', 'package-lock.json',
    'tests/emberwake-update-browser.mjs', 'tests/helpers/emberwake-update-reliability.mjs',
    'tests/emberwake-update-experiment.mjs']) walk(p);
  for (const p of ['tests/emberwake-update-reliability.test.mjs', 'tests/emberwake-update-experiment.test.mjs']) walk(p, false);
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  return { generatedUTC: now(), sha256: sha(JSON.stringify(sorted)), files: sorted };
}
export function validateHarness(report, trial, source, expectedBrowser) {
  const problems = [];
  if (report.status === 'setup-blocked') problems.push('Historical/current setup blocked; rollback not accepted');
  if (report.arm !== trial.arm || report.passed !== trial.expectedChecks || report.failed !== 0 ||
      !Array.isArray(report.checks) || report.checks.length !== trial.expectedChecks ||
      !Array.isArray(report.failures) || report.failures.length) problems.push('Wrong arm/check count or failed harness assertion');
  if (report.predicateTimeoutMs !== LIMITS.predicateMs || report.trialBudgetMs !== LIMITS.internalMs ||
      report.controlledRetryFixture !== false) problems.push('Acceptance bounds/debug-fixture configuration differed');
  if (report.oldCommit !== HISTORICAL_COMMIT || report.oldWorkerSHA256 !== HISTORICAL_WORKER) problems.push('Historical identity/digest differed');
  if (!report.browser || (expectedBrowser && report.browser !== expectedBrowser)) problems.push('Missing or changed Chromium version');
  if (!report.currentSourceHashes || !Object.keys(report.currentSourceHashes).length) problems.push('Missing harness runtime digests');
  else {
    const expected = Object.keys(source.files).filter(file => ['index.html', 'sw.js'].includes(file) ||
      file.startsWith('assets/scripts/') || file.startsWith('assets/styles/')).sort();
    if (JSON.stringify(Object.keys(report.currentSourceHashes).sort()) !== JSON.stringify(expected)) problems.push('Harness runtime digest inventory incomplete');
    for (const [file, hash] of Object.entries(report.currentSourceHashes)) {
      if (source.files[file]?.sha256 !== hash) problems.push(`Harness runtime differs: ${file}`);
    }
  }
  return problems;
}

// Fixed local-only Canvas2D pressure, two contexts with one visible-sized page
// each. No network, gameplay, WebGL substitution, randomized load or target FPS.
export const WORKLOAD = Object.freeze({ contexts: 2, pagesPerContext: 1, width: 960, height: 540,
  rectanglesPerFrame: 512, linesPerFrame: 64, sampleMs: 1000, minimumFrames: 2 });
const CANVAS_HTML = `<!doctype html><title>Fixed reliability canvas workload</title>
<canvas width="${WORKLOAD.width}" height="${WORKLOAD.height}"></canvas><script>
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d',{alpha:false});
if(!ctx)throw Error('Canvas2D unavailable');
window.workload={frames:0,started:performance.now(),lastFrame:null,drawMs:0};
function draw(t){
 const start=performance.now(),f=workload.frames;
 ctx.fillStyle='#11232d';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let i=0;i<${WORKLOAD.rectanglesPerFrame};i++){
  ctx.fillStyle='hsl('+((i*17+f)%360)+' 65% 50%)';
  ctx.fillRect((i*73+f*3)%canvas.width,(i*41+f*2)%canvas.height,24+i%31,18+i%23);
 }
 ctx.strokeStyle='#d7edcf';ctx.beginPath();
 for(let i=0;i<${WORKLOAD.linesPerFrame};i++){
  ctx.moveTo((i*43+f)%canvas.width,(i*29)%canvas.height);
  ctx.lineTo((i*67)%canvas.width,(i*47+f)%canvas.height);
 }
 ctx.stroke();workload.frames++;workload.lastFrame=t;workload.drawMs+=performance.now()-start;
 requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
</script>`;

// --import preload in the harness CHILD ONLY. Observe the existing public
// factories/events, without altering launch arguments, navigation or assertions.
// This supplies a complete page/context inventory absent from some milestones.
async function installChildInventory(file) {
  const state = { generatedUTC: now(), role: 'harness', browsers: [], contexts: [], pages: [], dropped: 0 };
  let browserId = 0, contextId = 0, pageId = 0;
  const flush = () => { state.generatedUTC = now(); save(file, state); };
  const launch = chromium.launch.bind(chromium);
  chromium.launch = async (...args) => {
    const browser = await launch(...args);
    const b = { id: ++browserId, version: browser.version(), createdUTC: now(), disconnectedUTC: null };
    state.browsers.push(b);
    browser.on('disconnected', () => { b.disconnectedUTC = now(); flush(); });
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...contextArgs) => {
      const c = await newContext(...contextArgs);
      const record = { id: ++contextId, browserId: b.id, createdUTC: now(), closedUTC: null };
      state.contexts.push(record);
      c.on('close', () => { record.closedUTC = now(); flush(); });
      const seen = new WeakSet();
      const watch = p => {
        if (seen.has(p)) return; seen.add(p);
        const entry = { id: ++pageId, contextId: record.id, createdUTC: now(), initialURL: p.url(), navigations: [], closedUTC: null, crashedUTC: null };
        state.pages.push(entry);
        p.on('framenavigated', f => {
          if (f === p.mainFrame()) {
            if (entry.navigations.length < 100) entry.navigations.push({ utc: now(), url: f.url() });
            else state.dropped++;
          }
        });
        p.on('close', () => { entry.closedUTC = now(); flush(); });
        p.on('crash', () => { entry.crashedUTC = now(); flush(); });
      };
      c.on('page', watch); c.pages().forEach(watch);
      flush(); return c;
    };
    flush(); return browser;
  };
  const interval = setInterval(flush, 500); interval.unref();
  process.on('exit', flush);
  flush();
}
async function deadline(operation, ms, label) {
  let timer;
  try { return await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => {
    timer = setTimeout(() => reject(Error(`${label} deadline (${ms} ms)`)), ms);
  })]); } finally { clearTimeout(timer); }
}
function browserPath() {
  return process.env.CHROME_BIN || (fs.existsSync('/usr/local/bin/chromium') ? '/usr/local/bin/chromium' : chromium.executablePath());
}
async function runWorkload(file) {
  const state = { role: 'competing-canvas', config: WORKLOAD, documentSHA256: sha(CANVAS_HTML),
    generatedUTC: now(), browser: null, contexts: [], pages: [], samples: [], errors: [], stopped: false };
  let browser, sampling = false, interval, stopping = false;
  const flush = () => { state.generatedUTC = now(); save(file, state); };
  const send = message => { if (process.connected) process.send(message); };
  const fail = error => { state.errors.push({ utc: now(), message: error.message || String(error) }); flush(); send({ type: 'failure', message: state.errors.at(-1).message }); };
  const pages = [];
  async function sample() {
    if (sampling || stopping) return;
    sampling = true;
    try {
      const values = await deadline(() => Promise.all(pages.map(async (p, i) => ({
        pageId: i + 1, url: p.url(), ...await p.evaluate(() => ({ ...window.workload, pageNow: performance.now(), visibility: document.visibilityState }))
      }))), 2000, 'Workload sample');
      const sample = { utc: now(), hostMonotonicMs: performance.now(), pages: values };
      if (state.samples.length < 240) state.samples.push(sample);
      else throw Error('Workload sample bound exhausted');
      flush(); send({ type: 'sample', sample });
    } catch (error) { fail(error); } finally { sampling = false; }
  }
  async function stop() {
    if (stopping) return; stopping = true;
    clearInterval(interval);
    try {
      // Do not close a page underneath its last scheduled measurement.
      await deadline(async () => { while (sampling) await new Promise(resolve => setTimeout(resolve, 10)); }, 2200, 'Workload sample drain');
      if (browser) await deadline(() => browser.close(), 2000, 'Workload close');
    }
    catch (error) { fail(error); }
    state.stopped = true; flush();
    process.exit(state.errors.length ? 1 : 0);
  }
  process.on('message', message => { if (message?.type === 'stop') stop(); });
  process.on('disconnect', stop);
  process.on('exit', flush);
  try {
    const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'];
    if (process.env.EW_UPDATE_NO_SANDBOX === '1') args.push('--no-sandbox');
    state.launch = { executablePath: browserPath(), headless: true, args };
    browser = await chromium.launch({ executablePath: browserPath(), headless: true, args, timeout: 15000 });
    state.browser = browser.version();
    browser.on('disconnected', () => { if (!stopping) fail(Error('Competing browser unexpectedly disconnected')); });
    for (let i = 0; i < WORKLOAD.contexts; i++) {
      const context = await browser.newContext({ viewport: { width: WORKLOAD.width, height: WORKLOAD.height }, serviceWorkers: 'block' });
      state.contexts.push({ id: i + 1, createdUTC: now() });
      const page = await context.newPage(); pages.push(page);
      page.on('crash', () => fail(Error(`Workload page ${i + 1} crashed`)));
      page.on('pageerror', fail);
      await page.goto('data:text/html;charset=utf-8,' + encodeURIComponent(CANVAS_HTML), { timeout: 8000 });
      await page.waitForFunction(min => window.workload?.frames >= min, WORKLOAD.minimumFrames, { timeout: 8000 });
      state.pages.push({ id: i + 1, contextId: i + 1, url: 'data:text/html (fixed local canvas)', createdUTC: now() });
    }
    await sample();
    send({ type: 'ready', browser: state.browser, contextCount: state.contexts.length, pageCount: state.pages.length });
    interval = setInterval(sample, WORKLOAD.sampleMs);
  } catch (error) { fail(error); await stop(); }
}

function terminate(child, signal = 'SIGKILL') {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') {
      // Standard Windows process-tree teardown, not a shell dependency.
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      killer.on('error', () => { try { child.kill(signal); } catch {} });
    } else process.kill(-child.pid, signal);
  } catch (error) { if (error.code !== 'ESRCH') { try { child.kill(signal); } catch {} } }
}
export function validateInventory(inventory, browserVersion) {
  const errors = [];
  if (inventory?.browsers?.length !== 1 || inventory.browsers[0].version !== browserVersion) errors.push('Harness browser inventory missing/mismatched');
  if (!inventory?.contexts?.length || !inventory?.pages?.length) errors.push('Missing complete harness context/page inventory');
  if (inventory?.dropped) errors.push('Harness navigation inventory truncated');
  return errors;
}
export function workloadProgress(state) {
  if (!state || state.errors?.length || state.browser == null || state.contexts?.length !== WORKLOAD.contexts ||
      state.pages?.length !== WORKLOAD.contexts || state.samples?.length < 2) return { ok: false, reason: 'Incomplete/error workload evidence' };
  const first = state.samples[0], last = state.samples.at(-1);
  const deltas = first.pages.map(p => {
    const end = last.pages.find(q => q.pageId === p.pageId);
    return { pageId: p.pageId, frames: end ? end.frames - p.frames : 0,
      elapsedMs: end ? end.pageNow - p.pageNow : 0,
      drawMs: end ? end.drawMs - p.drawMs : 0 };
  });
  let continuous = true;
  for (const firstPage of first.pages) {
    let lastFrames = firstPage.frames, lastProgress = first.hostMonotonicMs, previousTime = first.hostMonotonicMs;
    for (const sample of state.samples.slice(1)) {
      const page = sample.pages.find(p => p.pageId === firstPage.pageId);
      if (!page || sample.hostMonotonicMs - previousTime > 6000 || page.frames < lastFrames) { continuous = false; break; }
      if (page.frames > lastFrames) lastProgress = sample.hostMonotonicMs;
      if (sample.hostMonotonicMs - lastProgress > 6000) continuous = false;
      lastFrames = page.frames; previousTime = sample.hostMonotonicMs;
    }
  }
  return { ok: continuous && deltas.length === WORKLOAD.contexts && deltas.every(d => d.frames > 0 && d.elapsedMs > 0),
    continuousMeasuredProgress: continuous, deltas };
}

async function runExperiment(outputBase, options = { mode: 'historical12' }) {
  const config = experimentConfig(options.mode), limits = config.limits, screen = config.mode === 'screen4';
  const start = performance.now(), active = new Set();
  const runId = `${now().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const output = path.resolve(outputBase, runId);
  fs.mkdirSync(output, { recursive: true });
  const state = { runId, generatedUTC: now(), status: 'running', mode: config.mode, limits, plan: config.plan, trials: [],
    repeatabilityClearance: false, experimentComplete: false,
    historicalCaveat: CAVEAT, interpretationCaveat: config.caveat, output, host: { platform: os.platform(), arch: os.arch(), release: os.release(),
      logicalCPUs: os.cpus().length, cpuModel: os.cpus()[0]?.model, totalMemory: os.totalmem() },
    launchPolicy: { executablePath: browserPath(), noSandbox: process.env.EW_UPDATE_NO_SANDBOX === '1' },
    workload: { ...WORKLOAD, documentSHA256: sha(CANVAS_HTML) }, sourceBaselineSHA256: null, browser: null, failure: null };
  const flush = () => { state.generatedUTC = now(); state.elapsedMs = Math.round(performance.now() - start);
    state.notRunTrials = state.plan.filter(p => !state.trials.some(t => t.number === p.number)).map(p => p.number);
    state.completedTrials = state.trials.filter(t => t.status === 'passed').length;
    state.experimentComplete = state.status === config.passedStatus;
    save(path.join(output, 'experiment.json'), state); };
  console.log(`Experiment evidence: ${output}`);
  function halt(message, exitCode) {
    state.status = 'stopped-first-failure'; state.failure ||= message;
    for (const child of active) terminate(child);
    const entry = state.trials.at(-1);
    if (entry && !entry.finishedUTC) {
      entry.status = 'failed'; entry.failure = message; entry.finishedUTC = now();
      save(path.join(entry.output, 'trial.json'), entry);
    }
    try {
      const final = sourceSnapshot(); save(path.join(output, 'source-final.json'), final);
      state.sourceChanges = baseline ? compareSources(baseline, final) : null;
    } catch (error) { state.sourceObservationError = error.message; }
    flush(); process.exit(exitCode);
  }
  const globalTimer = setTimeout(() => halt(`${limits.totalMs} ms experiment ceiling exhausted; incomplete is not acceptance`, 1),
    Math.max(1, limits.totalMs - (performance.now() - start)));
  const onINT = () => halt('Experiment interrupted; no automatic continuation', 130);
  const onTERM = () => halt('Experiment terminated; no automatic continuation', 143);
  process.once('SIGINT', onINT); process.once('SIGTERM', onTERM);
  function launch(args, env, directory, name, ipc = false) {
    const out = fs.openSync(path.join(directory, `${name}.stdout.log`), 'wx');
    const err = fs.openSync(path.join(directory, `${name}.stderr.log`), 'wx');
    let child;
    try {
      child = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env },
        detached: process.platform !== 'win32', windowsHide: true, stdio: ['ignore', out, err, ...(ipc ? ['ipc'] : [])] });
    } finally { fs.closeSync(out); fs.closeSync(err); }
    active.add(child);
    const done = new Promise(resolve => {
      child.once('error', error => { active.delete(child); resolve({ code: null, error: error.message }); });
      child.once('exit', (code, signal) => { active.delete(child); resolve({ code, signal }); });
    });
    return { child, done };
  }
  let baseline;
  try {
    baseline = sourceSnapshot();
    save(path.join(output, 'source-baseline.json'), baseline);
    state.sourceBaselineSHA256 = baseline.sha256;
    if (screen) {
      const freeze = json(path.resolve(options.freeze));
      const executable = browserPath();
      const errors = validateFreeze(freeze, baseline, sha(fs.readFileSync(executable)));
      if (errors.length) throw Error(errors.join('; '));
      state.freeze = { ...freeze, executablePath: executable, freezeFile: path.resolve(options.freeze) };
      state.browser = freeze.browserVersion;
      save(path.join(output, 'parent-freeze.json'), state.freeze);
    }
    flush();
    for (const trial of state.plan) {
      const directory = path.join(output, `${String(trial.number).padStart(2, '0')}-${trial.arm}${trial.competing ? '-competing' : ''}`);
      fs.mkdirSync(directory);
      const cellStarted = performance.now();
      const entry = { ...trial, startedUTC: now(), status: 'running', output: directory,
        hostBefore: { freeMemory: os.freemem(), loadAverage: os.loadavg() } };
      state.trials.push(entry); flush();
      // SCREEN bounds the entire cell, not just the harness: setup, measured
      // workload startup, validation and process-tree cleanup share 175 seconds.
      // At 173.5s kill process trees; reserve the final 1.5s for artifact/exit.
      const cellTimer = screen ? setTimeout(() => halt('Screen cell deadline exhausted including setup/cleanup; no continuation', 1), Math.max(1, limits.externalMs - 1500 - (performance.now() - cellStarted))) : null;
      let harness, load, externalTimer, workloadReady, workloadFailure, lastSample, firstSample, workloadBrowser;
      const liveProgress = new Map();
      try {
        entry.phase = 'source-preflight';
        const before = sourceSnapshot();
        save(path.join(directory, 'source-pre.json'), before);
        const preChanges = compareSources(baseline, before);
        if (preChanges.length) throw Error(`Source changed before trial: ${preChanges.join(', ')}`);
        if (screen && sha(fs.readFileSync(browserPath())) !== state.freeze.browserExecutableSHA256) throw Error('Frozen browser executable changed before cell');
        const env = { CHROME_BIN: browserPath(), EW_OLD_REF: HISTORICAL_COMMIT,
          EW_UPDATE_DEBUG_RETRY: '0', EW_UPDATE_TIMEOUT_MS: String(limits.predicateMs),
          EW_UPDATE_TRIAL_MS: String(limits.internalMs), EW_UPDATE_ARM: trial.arm,
          EW_UPDATE_OUTPUT: directory, EW_UPDATE_EXPERIMENT_ROLE: 'inventory',
          EW_UPDATE_EXPERIMENT_TELEMETRY: path.join(directory, 'harness-inventory.json') };
        if (trial.competing) {
          entry.phase = 'workload-startup';
          let readyResolve, failedResolve;
          workloadReady = new Promise(resolve => { readyResolve = resolve; });
          workloadFailure = new Promise(resolve => { failedResolve = resolve; });
          load = launch([SELF], { CHROME_BIN: browserPath(), EW_UPDATE_EXPERIMENT_ROLE: 'workload',
            EW_UPDATE_EXPERIMENT_TELEMETRY: path.join(directory, 'workload.json') }, directory, 'workload', true);
          load.child.on('message', message => {
            if (message.type === 'ready') { workloadBrowser = message.browser; readyResolve(message); }
            if (message.type === 'sample') {
              lastSample = message.sample; firstSample ||= message.sample;
              if (screen) for (const page of message.sample.pages) {
                const previous = liveProgress.get(page.pageId);
                if (previous && page.frames < previous.frames) failedResolve({ workloadFailure: 'Competing frame counter regressed' });
                liveProgress.set(page.pageId, { frames: page.frames,
                  lastAdvance: !previous || page.frames > previous.frames ? performance.now() : previous.lastAdvance });
              }
            }
            if (message.type === 'failure') failedResolve({ workloadFailure: message.message });
          });
          load.done.then(result => failedResolve({ workloadFailure: `Competing process ended: ${JSON.stringify(result)}` }));
          const ready = await deadline(() => Promise.race([workloadReady, workloadFailure]), 25000, 'Competing workload startup');
          if (ready.workloadFailure) throw Error(ready.workloadFailure);
          if (screen && ready.browser !== state.browser) throw Error('Workload browser differs from parent freeze');
          entry.workloadReady = ready; flush();
        }
        entry.phase = 'harness';
        const childStarted = performance.now();
        entry.harnessStartedUTC = now();
        harness = launch(['--import', pathToFileURL(SELF).href, path.join(ROOT, 'tests/emberwake-update-browser.mjs')], env, directory, 'harness');
        const timedOut = new Promise(resolve => {
          externalTimer = setTimeout(() => { terminate(harness.child); resolve({ externalTimeout: true }); }, limits.externalMs);
        });
        let heartbeat;
        const stalledWorkload = new Promise(resolve => {
          if (!trial.competing) return;
          heartbeat = setInterval(() => {
            if (!lastSample || Date.now() - Date.parse(lastSample.utc) > 6000) resolve({ workloadFailure: 'Competing workload heartbeat stalled' });
            if (screen && (liveProgress.size !== WORKLOAD.contexts || [...liveProgress.values()].some(p => performance.now() - p.lastAdvance > 6000)))
              resolve({ workloadFailure: 'Competing workload page stopped advancing; no continuation' });
          }, 1000);
        });
        let result;
        try {
          result = await Promise.race([harness.done, timedOut, stalledWorkload,
            ...(trial.competing ? [workloadFailure] : [])]);
        } finally { clearInterval(heartbeat); clearTimeout(externalTimer); }
        entry.harnessMilliseconds = Math.round(performance.now() - childStarted);
        entry.harnessFinishedUTC = now();
        entry.process = result;
        if (result.externalTimeout || result.workloadFailure || result.code !== 0 || result.signal || result.error) {
          terminate(harness.child);
          throw Error(`Harness/workload process failed: ${JSON.stringify(result)}`);
        }
        const report = json(path.join(directory, 'report.json'));
        entry.phase = 'validation';
        const errors = validateHarness(report, trial, baseline, state.browser);
        if (screen) errors.push(...validateScreenDiagnostics(report, trial));
        const inventory = json(path.join(directory, 'harness-inventory.json'));
        errors.push(...validateInventory(inventory, report.browser));
        entry.browser = report.browser; state.browser ||= report.browser;
        entry.harness = { passed: report.passed, failed: report.failed, checks: report.checks.map(c => ({ name: c.name, milliseconds: c.milliseconds })),
          contextCount: inventory.contexts.length, pageCount: inventory.pages.length, allPages: inventory.pages,
          contexts: inventory.contexts, browsers: inventory.browsers, diagnosticDropped: report.diagnostics?.dropped };
        if (trial.competing) {
          if (workloadBrowser !== report.browser) errors.push('Workload and harness Chromium versions differed');
          if (!firstSample || !lastSample || Date.parse(firstSample.utc) > Date.parse(entry.harnessStartedUTC) ||
              Date.parse(entry.harnessFinishedUTC) - Date.parse(lastSample.utc) > 2500) errors.push('Workload did not cover the harness interval');
          load.child.send({ type: 'stop' });
          const exit = await deadline(() => load.done, 5000, 'Competing workload shutdown');
          if (exit.code !== 0) errors.push(`Competing workload failed during shutdown: ${JSON.stringify(exit)}`);
          const workload = json(path.join(directory, 'workload.json')), progress = workloadProgress(workload);
          entry.workload = { browser: workload.browser, contextCount: workload.contexts.length, pageCount: workload.pages.length,
            allPages: workload.pages, contexts: workload.contexts, progress, samples: workload.samples.length, errors: workload.errors };
          if (!progress.ok) errors.push('Competing workload did not demonstrate positive frame progress on every page');
        }
        if (errors.length) throw Error(errors.join('; '));
        entry.status = 'passed';
      } catch (error) {
        entry.status = entry.phase === 'workload-startup' ? 'setup-blocked' : 'failed';
        entry.failure = error.message;
        state.status = entry.status === 'setup-blocked' ? 'setup-blocked' : 'stopped-first-failure';
        state.failure = `Trial ${trial.number}: ${error.message}`;
      } finally {
        clearTimeout(externalTimer);
        if (harness && (screen || entry.status !== 'passed')) terminate(harness.child);
        if (load) terminate(load.child);
        try {
          const after = sourceSnapshot();
          save(path.join(directory, 'source-post.json'), after);
          entry.sourceChanges = compareSources(baseline, after);
          if (entry.sourceChanges.length) {
            entry.status = 'superseded-source'; state.status = 'superseded-source';
            state.supersededReason = `Trial ${trial.number}: source changed; do not mix identities or count this as a runtime failure`;
          }
        } catch (error) { entry.status = 'failed'; state.status = 'stopped-first-failure'; state.failure ||= error.message; }
        if (screen) await Promise.all([harness, load].filter(Boolean).map(child => deadline(() => child.done, 1500, 'Screen process cleanup').catch(error => {
          entry.status = 'failed'; entry.failure ||= error.message; state.status = 'stopped-first-failure'; state.failure ||= error.message;
        })));
        entry.finishedUTC = now();
        entry.hostAfter = { freeMemory: os.freemem(), loadAverage: os.loadavg() };
        if (screen) {
          try {
            if (sha(fs.readFileSync(browserPath())) !== state.freeze.browserExecutableSHA256) {
              entry.status = 'superseded-source'; state.status = 'superseded-source';
              state.supersededReason = 'Frozen browser executable changed during cell';
            }
          } catch (error) { entry.status = 'failed'; state.status = 'stopped-first-failure'; state.failure ||= error.message; }
        }
        save(path.join(directory, 'trial.json'), entry); flush();
        clearTimeout(cellTimer);
      }
      console.log(`Trial ${trial.number}/${state.plan.length} ${trial.arm}${trial.competing ? ' competing' : ''}: ${entry.status}`);
      if (screenShouldStop(entry)) break;
    }
    if (!['superseded-source', 'setup-blocked'].includes(state.status)) {
      if (state.trials.length === state.plan.length && state.trials.every(t => t.status === 'passed')) {
        state.status = config.passedStatus; state.experimentComplete = true;
      }
      else state.status = 'stopped-first-failure';
    }
  } catch (error) { state.status = 'stopped-first-failure'; state.failure ||= error.message; }
  finally {
    clearTimeout(globalTimer);
    process.removeListener('SIGINT', onINT); process.removeListener('SIGTERM', onTERM);
    for (const child of active) terminate(child);
    if (baseline) {
      try {
        const final = sourceSnapshot(); save(path.join(output, 'source-final.json'), final);
        state.sourceChanges = compareSources(baseline, final);
        if (state.sourceChanges.length) {
          state.status = 'superseded-source';
          state.supersededReason = 'Final source hashes changed; observations are not a final-source experiment';
        }
      } catch (error) { state.status = 'stopped-first-failure'; state.failure ||= error.message; }
    }
    state.finishedUTC = now(); state.completedTrials = state.trials.filter(t => t.status === 'passed').length;
    flush();
  }
  console.log(`${state.status}: ${state.completedTrials}/${state.plan.length}; ${config.caveat}; ${CAVEAT}`);
  process.exitCode = state.status === config.passedStatus ? 0 : 1;
}

const role = process.env.EW_UPDATE_EXPERIMENT_ROLE;
if (role === 'inventory') {
  await installChildInventory(process.env.EW_UPDATE_EXPERIMENT_TELEMETRY);
} else if (role === 'workload') {
  await runWorkload(process.env.EW_UPDATE_EXPERIMENT_TELEMETRY);
} else if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const options = parseExperimentArgs(process.argv.slice(2));
  await runExperiment(options.output || process.env.EW_UPDATE_EXPERIMENT_OUTPUT || path.join(ROOT, 'qa/correction/update-experiment'), options);
}