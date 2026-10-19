/** Independent worker/update acceptance. No project builds or source mutations.
 * Run from repository root after preparing the final Emberwake worker.
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { makeV4Fixture, boundedObservation } from './helpers/emberwake-update-reliability.mjs';

const root = process.cwd();
const oldRef = process.env.EW_OLD_REF || '6c266e9';
const prefix = '/Swordigo-V2/';
const timeout = Number(process.env.EW_UPDATE_TIMEOUT_MS || 45000);
const output = process.env.EW_UPDATE_OUTPUT || 'qa/correction/update';
fs.mkdirSync(output, { recursive: true });
const arm = process.env.EW_UPDATE_ARM || 'full';
assert.ok(['full', 'rollback-only', 'v4'].includes(arm), 'EW_UPDATE_ARM must be full, rollback-only or v4');
const trialMs = Number(process.env.EW_UPDATE_TRIAL_MS || 150000);
assert.ok(Number.isFinite(trialMs) && trialMs > 0 && trialMs <= 150000, 'Trial budget must be 1..150000 ms');
assert.ok(Number.isFinite(timeout) && timeout > 0 && timeout <= 45000, 'Predicate timeout must be 1..45000 ms; do not widen acceptance');
const sha = b => createHash('sha256').update(b).digest('hex');
const checks = [], failures = [], contexts = [];
const diagnostics = { requests: [], pageErrors: [], consoleErrors: [], partialInstall: [], events: [], milestones: [], observations: [], dropped: {} };
const startedAt = performance.now(), pageIds = new WeakMap(), contextIds = new WeakMap(), workerIds = new WeakMap();
let pageCount = 0, requestCount = 0, workerCount = 0;
const stamp = () => ({ utc: new Date().toISOString(), elapsedMs: Math.round(performance.now() - startedAt), scenario: currentScenario });
function record(key, value, cap = 2000) {
  if (diagnostics[key].length < cap) diagnostics[key].push({ ...stamp(), ...value });
  else diagnostics.dropped[key] = (diagnostics.dropped[key] || 0) + 1;
}
let currentScenario = 'setup';
const gitRead = (...args) => execFileSync('git', args, { cwd: root, timeout: 10000, maxBuffer: 64 * 1024 * 1024 });
// Validate the ref as an existing commit and retain its exact resolved identity.
// Fail with an explicit setup artifact before opening any server/browser.
let oldCommit;
const oldSnapshot = new Map();
try {
  oldCommit = gitRead('rev-parse', '--verify', `${oldRef}^{commit}`).toString().trim();
  assert.equal(oldCommit, '6c266e9d0d8eaf8ceb73f298b9cf76174fe25290', 'Unapproved historical fixture identity');
  for (const file of gitRead('ls-tree', '-r', '--name-only', oldCommit).toString().split('\n')) {
    if (file === 'index.html' || file === 'sw.js' || file.startsWith('assets/'))
      oldSnapshot.set(file, gitRead('show', `${oldCommit}:${file}`));
  }
  assert.equal(sha(oldSnapshot.get('sw.js')), '0dff1449b6dca02b90b3578cd3c6ef901cf8f583ea723ab100e1d5ce86246825',
    'Historical worker digest differs from approved final evidence');
} catch (error) {
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
    generatedUTC: new Date().toISOString(), arm, status: 'setup-blocked', passed: 0, failed: 1,
    rollbackTested: false, failures: [{ name: 'historical-fixture availability/integrity', message: error.message }]
  }, null, 2));
  throw error;
}
const currentSnapshot = new Map();
function inventory(dir, relative = '') {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = relative ? `${relative}/${item.name}` : item.name;
    const absolute = path.join(dir, item.name);
    if (item.isSymbolicLink()) throw Error(`Refusing fixture symlink: ${name}`);
    if (item.isDirectory()) inventory(absolute, name);
    else if (item.isFile()) currentSnapshot.set(name, fs.readFileSync(absolute));
  }
}
for (const file of ['index.html', 'sw.js']) currentSnapshot.set(file, fs.readFileSync(path.join(root, file)));
inventory(path.join(root, 'assets'), 'assets');
const worker = currentSnapshot.get('sw.js').toString();
// The generated-worker contract must expose its literal HASHES object. Do not guess a new API.
const match = worker.match(/\bHASHES\s*=\s*(\{[^\n]+?\})\s*[,;]/);
assert.ok(match, 'Integration blocker: generated sw.js must expose a literal HASHES object; consult parent if contract changes');
const hashes = JSON.parse(match[1]);
for (const [file, expected] of Object.entries(hashes)) {
  const bytes = currentSnapshot.get(file === './' ? 'index.html' : file);
  assert.ok(bytes, `Missing declared worker fixture: ${file}`);
  assert.equal(sha(bytes), expected, `Stale worker hash for ${file}; parent must prepare/build final source before running`);
}
assert.ok(!worker.includes('skipWaiting('), 'This harness requires the agreed wait-until-old-clients-close policy');
assert.ok(oldSnapshot.get('sw.js')?.toString().includes('lumen-'), 'Historical fixture must contain an actual Lumen worker');
const target = 'assets/scripts/client.js';
assert.ok(hashes[target], 'Integration blocker: expected client.js must be declared in HASHES');
const wrongBytes = Buffer.from('/* deliberately incompatible network bytes: acceptance fixture */\n');
let snapshot = oldSnapshot, corrupt = null, corruptDelayMs = 0;
const debugRetry = process.env.EW_UPDATE_DEBUG_RETRY === '1';
const mime = file => ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream');
function server() {
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/__observer.html') {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      res.end('<!doctype html><title>Independent update observer</title>Outside worker scope'); return;
    }
    if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
    const file = pathname.slice(prefix.length) || 'index.html';
    const bytes = snapshot.get(file);
    const request = { id: ++requestCount, file, query: new URL(req.url, 'http://localhost').search,
      method: req.method, historical: snapshot === oldSnapshot, corrupt: corrupt === file,
      ...stamp(), referer: req.headers.referer || null, destination: req.headers['sec-fetch-dest'] || null };
    record('requests', request, 4000);
    res.once('finish', () => record('events', { kind: 'server-response-complete', requestId: request.id,
      status: res.statusCode, bodySHA256: request.bodySHA256, historical: request.historical }));
    res.once('close', () => { if (!res.writableFinished) record('events', { kind: 'server-response-aborted', requestId: request.id }); });
    if (!bytes) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime(file), 'Cache-Control': 'no-store', 'Service-Worker-Allowed': prefix });
    const payload = req.method === 'HEAD' ? undefined : corrupt === file ? wrongBytes : bytes;
    request.bodySHA256 = sha(payload || Buffer.alloc(0));
    if (corrupt === file && corruptDelayMs) setTimeout(() => res.end(payload), corruptDelayMs);
    else res.end(payload);
  });
}
const primary = server(), foreign = server();
await Promise.all([primary, foreign].map(s => new Promise(resolve => s.listen(0, '127.0.0.1', resolve))));
const origin = `http://127.0.0.1:${primary.address().port}`;
const foreignOrigin = `http://127.0.0.1:${foreign.address().port}`;
const url = origin + prefix;
let browser;
const trialTimer = setTimeout(async () => {
  failures.push({ name: currentScenario, message: `Trial wall-clock budget ${trialMs} ms exhausted; not acceptance` });
  report();
  // The parent runner must also enforce an external process deadline. No retry.
  await boundedObservation(() => browser?.close(), 1500);
  process.exit(1);
}, Math.max(1, trialMs - (performance.now() - startedAt)));
function report() {
  fs.mkdirSync(output, { recursive: true });
  const sourceHashes = Object.fromEntries([...currentSnapshot].filter(([p]) => p === 'index.html' || p === 'sw.js' || p.startsWith('assets/scripts/') || p.startsWith('assets/styles/')).map(([p, b]) => [p, sha(b)]));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
    generatedUTC: new Date().toISOString(), arm, trialBudgetMs: trialMs, predicateTimeoutMs: timeout,
    passed: checks.length, failed: failures.length,
    checks, failures, oldCommit, currentSourceHashes: sourceHashes,
    oldWorkerSHA256: sha(oldSnapshot.get('sw.js')), declaredAssets: Object.keys(hashes).length,
    browser: browser?.version(), fixtureOrigin: origin, foreignFixtureOrigin: foreignOrigin, controlledRetryFixture: debugRetry,
    repeatabilityCaveat: 'Earlier concurrent historical rollback window.lumen timeout remains unexplained; neither a diagnostic pass nor this run establishes its cause or production robustness.',
    scope: 'Selected independent loopback arm; approved historical worker/root/assets, current generated worker, synthetic V3/V4 fixtures. full preserves all five original checks and adds V4; rollback-only isolates the original rollback; v4 isolates its V4 lifecycle. Not human gameplay, public deployment, devices or certification.',
    diagnostics
  }, null, 2));
}
async function check(name, fn) {
  const started = Date.now(); currentScenario = name;
  try { const evidence = await fn(); checks.push({ name, milliseconds: Date.now() - started, evidence }); console.log(`PASS ${name}`); }
  catch (error) {
    failures.push({ name, message: error.message, stack: error.stack });
    const probe = await boundedObservation(() => observeFailure(name), 6000);
    if (probe?.diagnosticError) record('observations', { stage: 'failure-probe', ...probe }, 200);
    throw error;
  }
}
async function milestone(stage, o) {
  record('milestones', { stage, pages: contexts.flatMap(c => c.pages().map(p => ({ contextId: contextIds.get(c), pageId: pageIds.get(p), url: p.url() }))) });
  await Promise.all(contexts.flatMap(c => c.serviceWorkers()).slice(-8).map(async w => {
    const value = await boundedObservation(() => w.evaluate(async () => ({
      scope: self.registration.scope,
      clients: (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).map(c => ({ id: c.id, url: c.url(), visibilityState: c.visibilityState }))
    })));
    record('observations', { stage, workerId: workerIds.get(w), url: w.url(), value }, 200);
  }));
  if (o && !o.isClosed()) {
    const value = await boundedObservation(() => o.evaluate(async base => {
      const r = await navigator.serviceWorker.getRegistration(base);
      const w = worker => worker && ({ state: worker.state, url: worker.scriptURL });
      const inventory = {};
      // Bounded representative contents; cache names alone do not identify bytes.
      for (const key of (await caches.keys()).slice(0, 16)) {
        const c = await caches.open(key), requests = await c.keys();
        inventory[key] = { entries: requests.length, samples: [] };
        for (const req of requests.filter(r => /(?:\/$|index\.html$|client\.js$|game\.js$)/.test(new URL(r.url).pathname)).slice(0, 4)) {
          const response = await c.match(req), bytes = await response.arrayBuffer();
          const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
          inventory[key].samples.push({ url: req.url, bytes: bytes.byteLength, sha256: digest });
        }
      }
      return { registration: r && { scope: r.scope, active: w(r.active), waiting: w(r.waiting), installing: w(r.installing) }, inventory };
    }, url));
    record('observations', { stage, pageId: pageIds.get(o), value }, 200);
  }
}
async function observeFailure(stage) {
  // Parallel independent, deadline-limited probes: a dead target cannot prevent
  // observing the outside-scope page or replace the original assertion exception.
  const pages = contexts.flatMap(c => c.pages()).filter(p => !p.isClosed()).slice(-8);
  await Promise.all(pages.map(async p => {
    const pageId = pageIds.get(p);
    const value = await boundedObservation(() => p.evaluate(async () => ({
      url: location.href, title: document.title, body: document.body?.innerText.slice(0, 1500),
      scripts: [...document.scripts].map(s => ({ src: s.src, loaded: s.dataset.loaded })),
      controller: navigator.serviceWorker.controller?.scriptURL,
      boot: { lumen: !!window.lumen, emberwake: !!window.emberwake, failed: window.EW_BOOT_FAILED },
      cacheKeys: await caches.keys(), resources: performance.getEntriesByType('resource').slice(-25).map(r => ({ name: r.name, duration: r.duration }))
    })));
    record('observations', { stage, pageId, value }, 200);
    const screenshot = await boundedObservation(() => p.screenshot({ path: path.join(output, `failure-${pageId}.png`), timeout: 1500 }));
    if (screenshot?.diagnosticError) record('observations', { stage, pageId, screenshot }, 200);
  }));
  await Promise.all(pages.filter(p => p.url().endsWith('/__observer.html')).map(p => milestone(`${stage}:outside-scope`, p)));
}
async function context() {
  const c = await browser.newContext({ serviceWorkers: 'allow' }); contexts.push(c);
  contextIds.set(c, contexts.length);
  c.setDefaultTimeout(timeout); c.setDefaultNavigationTimeout(timeout);
  await c.exposeBinding('__ewReliabilityEvent', ({ page }, event) => record('events', { kind: 'page-lifecycle', contextId: contextIds.get(c), pageId: pageIds.get(page), event }));
  await c.addInitScript(() => {
    const emit = (kind, extra = {}) => window.__ewReliabilityEvent({ kind, pageTime: performance.now(), ...extra }).catch(() => {});
    for (const name of ['webglcontextlost', 'webglcontextrestored']) document.addEventListener(name, e => emit(name, { statusMessage: e.statusMessage }), true);
    if (!navigator.serviceWorker) return;
    const seen = new WeakSet();
    const watch = r => {
      const worker = w => {
        if (!w || seen.has(w)) return; seen.add(w);
        emit('worker-state', { state: w.state, scriptURL: w.scriptURL });
        w.addEventListener('statechange', () => emit('worker-state', { state: w.state, scriptURL: w.scriptURL }));
      };
      [r.active, r.waiting, r.installing].forEach(worker);
      if (!seen.has(r)) { seen.add(r); r.addEventListener('updatefound', () => { emit('updatefound'); worker(r.installing); }); }
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => emit('controllerchange', { scriptURL: navigator.serviceWorker.controller?.scriptURL }));
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(watch)).catch(() => {});
    navigator.serviceWorker.ready.then(watch).catch(() => {});
  });
  c.on('serviceworker', w => {
    workerIds.set(w, ++workerCount);
    record('events', { kind: 'serviceworker-created', contextId: contextIds.get(c), workerId: workerIds.get(w), url: w.url() });
    w.on('console', m => record('events', { kind: 'serviceworker-console', url: w.url(), type: m.type(), text: m.text().slice(0, 1500) }));
  });
  c.on('page', p => {
    const pageId = ++pageCount; pageIds.set(p, pageId);
    p.on('crash', () => record('events', { kind: 'page-crash', pageId }));
    p.on('close', () => record('events', { kind: 'page-close', pageId }));
    p.on('requestfailed', r => record('events', { kind: 'requestfailed', pageId, url: r.url(), error: r.failure()?.errorText }));
    p.on('response', r => {
      if (!r.url().startsWith(origin + prefix) || !['document', 'script', 'stylesheet'].includes(r.request().resourceType())) return;
      // Body read itself has a deadline. Hash delivered bytes, not a second fetch.
      boundedObservation(async () => {
        const body = await r.body();
        record('events', { kind: 'browser-response', pageId, url: r.url(), status: r.status(), fromServiceWorker: r.fromServiceWorker(), bodySHA256: sha(body), bytes: body.length });
      }).then(result => { if (result?.diagnosticError) record('events', { kind: 'response-observation-error', pageId, url: r.url(), ...result }); });
    });
    p.on('pageerror', e => diagnostics.pageErrors.push({ url: p.url(), message: e.message }));
    p.on('console', m => { if (m.type() === 'error') diagnostics.consoleErrors.push({ url: p.url(), message: m.text() }); });
    boundedObservation(async () => {
      const session = await c.newCDPSession(p);
      session.on('ServiceWorker.workerVersionUpdated', e => record('events', { kind: 'worker-versions', pageId, versions: e.versions }));
      session.on('ServiceWorker.workerRegistrationUpdated', e => record('events', { kind: 'worker-registrations', pageId, registrations: e.registrations }));
      session.on('Debugger.scriptParsed', e => { if (e.url.startsWith(origin + prefix)) record('events', { kind: 'script-parsed', pageId, url: e.url, scriptId: e.scriptId, hash: e.hash }); });
      session.on('Network.loadingFailed', e => record('events', { kind: 'cdp-loading-failed', pageId, ...e }));
      await Promise.all(['ServiceWorker.enable', 'Debugger.enable', 'Network.enable'].map(method => session.send(method)));
    }).then(result => { if (result?.diagnosticError) record('events', { kind: 'cdp-observation-error', pageId, ...result }); });
  });
  return c;
}
async function observer(c, baseOrigin = origin) {
  const p = await c.newPage(); await p.goto(baseOrigin + '/__observer.html'); return p;
}
async function active(p) {
  await p.evaluate(async () => { await navigator.serviceWorker.ready; });
  await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout });
}
async function oldBoot(c) {
  snapshot = oldSnapshot; corrupt = null;
  const p = await c.newPage(); await p.goto(url);
  await p.waitForFunction(() => !!window.lumen, null, { timeout }); await active(p);
  const o = await observer(c);
  await o.evaluate(async base => { window.previousWorker = (await navigator.serviceWorker.getRegistration(base)).active; }, url);
  return { p, o };
}
async function seedV3(c) {
  const legacy = await c.newPage(); await legacy.goto(url + 'assets/legacy.html');
  await legacy.waitForFunction(() => !!window.emberwake, null, { timeout });
  const save = await legacy.evaluate(() => {
    // Deliberately a fresh checkpoint fixture, not an earned completion claim.
    const g = emberwake.game; g.newRun('adventure', 'story');
    emberwake.paused = true; // Freeze the synthetic fixture; no input-earned gameplay claim.
    const s = g.snapshot(); const result = EW.Save.write(localStorage, 'EW_STORY_V3', s, EW_LEVELS);
    if (!result.ok) throw Error(result.error);
    return localStorage.getItem('EW_STORY_V3');
  });
  await legacy.close(); return save;
}
async function waitUpdate(o) {
  await milestone('before-update', o);
  await o.evaluate(async base => { const r = await navigator.serviceWorker.getRegistration(base); if (!r) throw Error('Registration missing'); await r.update(); }, url);
  await o.waitForFunction(async base => { const r = await navigator.serviceWorker.getRegistration(base); return !!r?.waiting && r.waiting.state === 'installed'; }, url, { timeout });
  await milestone('update-waiting', o);
}
async function afterClientsClose(o, c, oldPages) {
  await milestone('before-last-client-close', o);
  await Promise.all(oldPages.map(p => p.close()));
  await o.waitForFunction(async base => { const r = await navigator.serviceWorker.getRegistration(base); return window.previousWorker?.state === 'redundant' && r?.active?.state === 'activated' && !r.waiting; }, url, { timeout });
  await milestone('replacement-active-before-navigation', o);
  const p = await c.newPage(); await p.goto(url); await active(p); return p;
}
async function bootNew(c) {
  snapshot = currentSnapshot; corrupt = null;
  const p = await c.newPage(); await p.goto(url);
  await p.waitForFunction(() => !!window.emberwake && !!window.EW_SEQUEL_PRESENTATION, null, { timeout });
  await active(p); return p;
}
async function cacheInventory(o) {
  return o.evaluate(async () => {
    const result = {};
    for (const key of await caches.keys()) result[key] = (await (await caches.open(key)).keys()).map(r => r.url);
    return result;
  });
}
async function assertFixture(p, fixture, validateV4 = false) {
  const actual = await p.evaluate(keys => Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)])), Object.keys(fixture.keys));
  assert.deepEqual(actual, fixture.keys, 'V4 current/previous/revision, V3 and rush keys must remain byte-exact');
  if (validateV4) {
    const evidence = await p.evaluate(() => {
      const cs = EW.ChapterSave, read = cs.read(localStorage, EW_LEVELS);
      if (!read.ok || !read.envelope) throw Error('V4 unavailable after current boot');
      const repeated = cs.prepareDelivery(read.envelope.current, 'ch1:delivery:water-remembers', EW_LEVELS);
      const app = window.emberwake;
      return { envelope: read.envelope, savedJourney: app.savedJourney, storyRevision: app.storyRevision,
        repeated: { ok: repeated.ok, reward: repeated.reward, payload: repeated.payload } };
    });
    assert.deepEqual(evidence.envelope, fixture.envelope);
    assert.deepEqual(evidence.savedJourney, fixture.envelope.current, 'Client must actually select V4, not frozen V3');
    assert.equal(evidence.storyRevision, fixture.envelope.revision);
    assert.equal(evidence.envelope.current.base.ending, fixture.ending);
    assert.equal(evidence.envelope.current.base.gold, 98);
    assert.equal(evidence.envelope.previous.base.gold, 38);
    assert.equal(evidence.repeated.ok, true);
    assert.equal(evidence.repeated.reward, 0, 'Saved delivery must not pay twice after re-upgrade');
    assert.deepEqual(evidence.repeated.payload, fixture.envelope.current);
  }
}
async function v4Lifecycle(ending) {
  const fixture = makeV4Fixture(currentSnapshot, ending);
  const c = await context(), { p: historical, o } = await oldBoot(c);
  await o.evaluate(keys => { for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v); }, fixture.keys);
  await assertFixture(historical, fixture);
  // Deterministic incompatible current asset while the actual old worker owns
  // the scope. No weakened assertion or retry-to-success loop.
  const before = Object.keys(await cacheInventory(o)).sort();
  snapshot = currentSnapshot; corrupt = target;
  await o.evaluate(async base => {
    const r = await navigator.serviceWorker.getRegistration(base);
    window.v4FailedAttempt = null; window.v4InstallHistory = [];
    r.addEventListener('updatefound', () => {
      const worker = r.installing; window.v4FailedAttempt = worker;
      const attempt = { states: [worker.state] }; window.v4InstallHistory.push(attempt);
      worker.addEventListener('statechange', () => attempt.states.push(worker.state));
    });
    await r.update().catch(() => {});
  }, url);
  await o.waitForFunction(() => window.v4FailedAttempt?.state === 'redundant', null, { timeout });
  // Observe a bounded quiet period across *all* automatic attempts, without
  // issuing another update or accepting a waiting/activated corrupt worker.
  const deadline = Date.now() + timeout;
  let settled = false;
  while (Date.now() < deadline) {
    await o.waitForFunction(async base => {
      const r = await navigator.serviceWorker.getRegistration(base);
      return !r.installing && !r.waiting && window.v4InstallHistory.length > 0 &&
        window.v4InstallHistory.every(h => h.states.at(-1) === 'redundant');
    }, url, { timeout: Math.max(1, deadline - Date.now()) });
    const count = await o.evaluate(() => window.v4InstallHistory.length);
    await o.waitForTimeout(500);
    const state = await o.evaluate(async base => {
      const r = await navigator.serviceWorker.getRegistration(base);
      return { installing: !!r.installing, waiting: !!r.waiting, attempts: window.v4InstallHistory };
    }, url);
    record('observations', { stage: 'v4-failed-install-quiet', state }, 200);
    if (state.installing || state.attempts.length !== count) continue;
    assert.equal(state.waiting, false);
    assert.ok(state.attempts.every(h => h.states.at(-1) === 'redundant'));
    settled = true; break;
  }
  assert.ok(settled, 'V4 corrupt installation did not settle within its bounded observation window');
  await assertFixture(historical, fixture);
  assert.deepEqual(Object.keys(await cacheInventory(o)).sort(), before);
  assert.equal(await o.evaluate(() => window.previousWorker.state), 'activated');
  assert.equal(await o.evaluate(async base => !!(await navigator.serviceWorker.getRegistration(base)).waiting, url), false);
  corrupt = null;
  await waitUpdate(o);
  await assertFixture(historical, fixture);
  let current = await afterClientsClose(o, c, [historical]);
  await current.waitForFunction(() => !!window.emberwake && !!window.EW_SEQUEL_PRESENTATION, null, { timeout });
  await assertFixture(current, fixture, true);
  await c.setOffline(true); await current.reload();
  await current.waitForFunction(() => !!window.emberwake && !!window.EW_SEQUEL_PRESENTATION, null, { timeout });
  await assertFixture(current, fixture, true);
  await c.setOffline(false);
  await o.evaluate(async base => { window.previousWorker = (await navigator.serviceWorker.getRegistration(base)).active; }, url);
  snapshot = oldSnapshot; await waitUpdate(o);
  await assertFixture(current, fixture, true);
  const rolledBack = await afterClientsClose(o, c, [current]);
  await rolledBack.waitForFunction(() => !!window.lumen, null, { timeout });
  await assertFixture(rolledBack, fixture);
  const legacy = await c.newPage(); await legacy.goto(url + 'assets/legacy.html');
  await legacy.waitForFunction(() => !!window.emberwake, null, { timeout });
  assert.equal(await legacy.evaluate(() => !!EW.validateSave(localStorage.getItem('EW_STORY_V3'), EW_LEVELS)), true);
  await assertFixture(legacy, fixture);
  await legacy.close();
  await o.evaluate(async base => { window.previousWorker = (await navigator.serviceWorker.getRegistration(base)).active; }, url);
  snapshot = currentSnapshot; await waitUpdate(o);
  await assertFixture(rolledBack, fixture);
  current = await afterClientsClose(o, c, [rolledBack]);
  await current.waitForFunction(() => !!window.emberwake && !!window.EW_SEQUEL_PRESENTATION, null, { timeout });
  await assertFixture(current, fixture, true);
  const resumed = await current.evaluate(() => {
    const cs = EW.ChapterSave, before = localStorage.getItem(cs.KEY);
    const read = cs.read(localStorage, EW_LEVELS);
    const conflict = cs.write(localStorage, read.envelope.current, EW_LEVELS, read.envelope.revision - 1);
    if (conflict.ok || conflict.code !== 'conflict' || localStorage.getItem(cs.KEY) !== before) throw Error('Stale revision did not fail closed');
    emberwake.continue(); emberwake.paused = true;
    return { journey: emberwake.game.snapshotJourney(), status: emberwake.game.status };
  });
  assert.equal(resumed.status, 'won', 'Completed journey must resume its ending, not silently enter chapter play');
  assert.deepEqual(resumed.journey, fixture.envelope.current);
  await assertFixture(current, fixture, true);
  await milestone(`v4-${ending}-reupgrade-ready`, o);
  await c.close();
  return { ending, syntheticCompletedFixture: true, v4SHA256: sha(fixture.keys.EW_STORY_V4),
    revision: fixture.envelope.revision, goldBefore: 38, goldAfter: 98, duplicateReward: 0,
    failedInstall: true, activation: true, offlineReload: true, historicalRollbackAndLegacy: true, reupgrade: true,
    allJourneyKeysByteExact: true };
}
try {
  const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  if (process.env.EW_UPDATE_NO_SANDBOX === '1') args.push('--no-sandbox');
  browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/usr/local/bin/chromium', headless: true, args });
  let upgradedContext, upgradedPage, upgradedObserver, v3;
  if (arm === 'full') {
  await check('actual historical worker waits with old clients; new root retains V3 and other cache ownership', async () => {
    const c = await context(); const { p, o } = await oldBoot(c); v3 = await seedV3(c);
    const foreignPage = await observer(c, foreignOrigin);
    const foreignKey = 'emberwake-foreign-origin-fixture';
    await foreignPage.evaluate(async key => { const cache = await caches.open(key); await cache.put('/sentinel', new Response('other origin')); }, foreignKey);
    // Intentionally legacy-shaped cache keys under another path: must not be globally wiped by the NEW worker.
    const retainedKeys = ['lumen-other-deployment-fixture', 'emberwake-other-deployment-fixture'];
    await o.evaluate(async keys => { for (const key of keys) await (await caches.open(key)).put('/Elsewhere/sentinel', new Response('other scope')); }, retainedKeys);
    const secondOldTab = await c.newPage(); await secondOldTab.goto(url); await secondOldTab.waitForFunction(() => !!window.lumen, null, { timeout });
    snapshot = currentSnapshot; await waitUpdate(o);
    assert.equal(await p.evaluate(() => !!window.lumen && !window.emberwake), true);
    assert.equal(await o.evaluate(() => window.previousWorker.state), 'activated');
    await p.close();
    assert.equal(await o.evaluate(async base => { const registration = await navigator.serviceWorker.getRegistration(base); if (!registration) throw Error('Expected registration missing for explicit update scope'); return !!registration.waiting; }, url), true, 'Remaining old client must keep worker waiting');
    const newPage = await afterClientsClose(o, c, [secondOldTab]);
    await newPage.waitForFunction(() => !!window.emberwake && !!window.EW_SEQUEL_PRESENTATION, null, { timeout });
    assert.equal(await newPage.evaluate(() => !!window.lumen), false);
    assert.equal(await newPage.evaluate(() => localStorage.getItem('EW_STORY_V3')), v3, 'Boot must not rewrite original save');
    assert.equal(await newPage.evaluate(() => !!EW.validateSave(localStorage.getItem('EW_STORY_V3'), EW_LEVELS)), true);
    for (const key of retainedKeys) assert.equal(await o.evaluate(async key => await caches.has(key), key), true, `Must retain another deployment's ${key}`);
    assert.equal(await foreignPage.evaluate(async key => await caches.has(key), foreignKey), true);
    await foreignPage.close(); upgradedContext = c; upgradedPage = newPage; upgradedObserver = o;
    return { oldWorkerActual: true, waitingWithTwoClients: true, waitingWithLastClient: true, saveSHA256: sha(v3), retainedKeys, foreignOriginRetained: true };
  });
  await check('cache miss refuses incompatible network bytes with 503', async () => {
    const inventory = await cacheInventory(upgradedObserver), targetURL = url + target;
    const keys = Object.keys(inventory).filter(k => inventory[k].includes(targetURL));
    assert.equal(keys.length, 1, 'Expected one current asset-owning cache');
    await upgradedObserver.evaluate(async ({ key, targetURL }) => { const ok = await (await caches.open(key)).delete(targetURL); if (!ok) throw Error('Cache deletion failed'); }, { key: keys[0], targetURL });
    corrupt = target;
    const result = await upgradedPage.evaluate(async targetURL => { const r = await fetch(targetURL); return { status: r.status, body: await r.text() }; }, targetURL);
    assert.equal(result.status, 503); assert.notEqual(result.body, wrongBytes.toString());
    assert.equal(await upgradedObserver.evaluate(async ({ key, targetURL }) => !!await (await caches.open(key)).match(targetURL), { key: keys[0], targetURL }), false);
    corrupt = null;
    const recovered = await upgradedPage.evaluate(async targetURL => { const r = await fetch(targetURL); return { status: r.status, body: await r.text() }; }, targetURL);
    assert.equal(recovered.status, 200); assert.equal(sha(recovered.body), hashes[target]);
    return { status: result.status, incompatibleBytesNotReturned: true, correctDigestRecovered: true };
  });
  await check('coherent offline reload retains original checkpoint journey', async () => {
    // Independent complete install: cache-miss fallback need not repopulate a deleted entry.
    const c = await context(), p = await bootNew(c);
    await p.evaluate(save => localStorage.setItem('EW_STORY_V3', save), v3);
    await c.setOffline(true); await p.reload();
    await p.waitForFunction(() => !!window.emberwake && !!window.EW_SEQUEL_PRESENTATION, null, { timeout });
    assert.equal(await p.evaluate(() => localStorage.getItem('EW_STORY_V3')), v3);
    assert.equal(await p.evaluate(() => !!EW.validateSave(localStorage.getItem('EW_STORY_V3'), EW_LEVELS)), true);
    await c.setOffline(false); await c.close();
    return { networkDisabled: true, validVersion: 3, originalBytesRetained: true, independentCompleteInstall: true };
  });
  await check('partial failed install cannot activate or leave its cache behind', async () => {
    const c = await context(), { p, o } = await oldBoot(c); const saved = await seedV3(c);
    const before = Object.keys(await cacheInventory(o)).sort(); snapshot = currentSnapshot; corrupt = target;
    await o.evaluate(async base => {
      const r = await navigator.serviceWorker.getRegistration(base); window.attemptedWorker = null;
      window.installHistory = [];
      r.addEventListener('updatefound', () => {
        const w = r.installing; window.attemptedWorker = w;
        const record = { id: window.installHistory.length + 1, utc: new Date().toISOString(), states: [{ state: w.state, utc: new Date().toISOString() }] };
        window.installHistory.push(record);
        w.addEventListener('statechange', () => record.states.push({ state: w.state, utc: new Date().toISOString() }));
      });
      await r.update().catch(e => { window.updateRejection = e.message; });
    }, url);
    await o.waitForFunction(() => window.attemptedWorker?.state === 'redundant', null, { timeout });
    const firstInventory = await cacheInventory(o), remaining = Object.keys(firstInventory).sort();
    diagnostics.partialInstall.push({ stage: 'first-redundant', before, inventory: firstInventory, registration: await o.evaluate(async base => { const r = await navigator.serviceWorker.getRegistration(base); return { active: r?.active?.state, installing: r?.installing?.state, waiting: r?.waiting?.state, history: window.installHistory }; }, url) });
    assert.deepEqual(remaining, before, 'No partially installed new-release cache may remain');
    // Optional controlled reproduction of a browser retry while its cache is legitimately being populated.
    if (debugRetry) {
      corruptDelayMs = 1500;
      await o.evaluate(async base => { await (await navigator.serviceWorker.getRegistration(base)).update(); }, url);
    }
    // Check again after outstanding server responses settle, so late Promise writes cannot hide residue.
    await o.waitForTimeout(500);
    const lateInventory = await cacheInventory(o);
    diagnostics.partialInstall.push({ stage: 'late-settle', inventory: lateInventory, registration: await o.evaluate(async base => { const r = await navigator.serviceWorker.getRegistration(base); return { active: r?.active?.state, installing: r?.installing?.state, waiting: r?.waiting?.state, history: window.installHistory }; }, url) });
    // A navigation-triggered/explicit retry can legitimately recreate CACHE while installing.
    // Require all observed attempts to fail, then a quiet registration before checking residue.
    // Never treat timeout, a waiting worker or successful activation as acceptance.
    const deadline = Date.now() + timeout;
    let settled = false;
    while (Date.now() < deadline) {
      await o.waitForFunction(async base => {
        const r = await navigator.serviceWorker.getRegistration(base);
        return !!r && !r.installing && !r.waiting && window.previousWorker.state === 'activated'
          && window.installHistory.length > 0
          && window.installHistory.every(h => h.states.at(-1).state === 'redundant');
      }, url, { timeout: Math.max(1, deadline - Date.now()) });
      const observedAttempts = await o.evaluate(() => window.installHistory.length);
      await o.waitForTimeout(500);
      const finalInventory = await cacheInventory(o);
      const finalState = await o.evaluate(async base => {
        const r = await navigator.serviceWorker.getRegistration(base);
        return { active: r?.active?.state, previous: window.previousWorker.state,
          installing: r?.installing?.state, waiting: r?.waiting?.state,
          history: window.installHistory };
      }, url);
      diagnostics.partialInstall.push({ stage: 'quiescence-check', inventory: finalInventory, registration: finalState });
      if (finalState.installing || finalState.history.length !== observedAttempts) continue;
      assert.equal(finalState.waiting, undefined, 'A failed release must not leave a waiting worker');
      assert.equal(finalState.previous, 'activated', 'Original active worker must survive every failed attempt');
      assert.ok(finalState.history.every(h => h.states.at(-1).state === 'redundant'), 'Every install attempt must terminate as redundant');
      assert.deepEqual(Object.keys(finalInventory).sort(), before, 'No partially installed new-release cache may remain after every attempt settles');
      settled = true; break;
    }
    assert.ok(settled, 'Failed installations did not reach bounded quiescence; no cleanup acceptance');
    assert.equal(await o.evaluate(() => window.previousWorker.state), 'activated');
    assert.equal(await o.evaluate(async base => { const registration = await navigator.serviceWorker.getRegistration(base); if (!registration) throw Error('Expected registration missing for explicit update scope'); return !!registration.waiting; }, url), false);
    assert.equal(await p.evaluate(() => localStorage.getItem('EW_STORY_V3')), saved);
    corrupt = null; await c.close();
    return { installState: 'redundant', noWaitingWorker: true, oldActiveRetained: true, noPartialCacheResidue: true };
  });
  }
  if (arm === 'rollback-only') {
    // No earlier fault scenarios/other contexts: deliberately isolate rollback.
    upgradedContext = await context();
    upgradedPage = await bootNew(upgradedContext);
    upgradedObserver = await observer(upgradedContext);
    v3 = makeV4Fixture(currentSnapshot, 'mercy').keys.EW_STORY_V3;
    await upgradedPage.evaluate(save => localStorage.setItem('EW_STORY_V3', save), v3);
  }
  if (arm !== 'v4') {
  await check('actual historical-worker rollback retains a valid Emberwake journey via old legacy entry', async () => {
    // Other scenarios used fresh contexts; restore the new-release server before staging rollback.
    snapshot = currentSnapshot; corrupt = null;
    await upgradedObserver.evaluate(async base => { window.previousWorker = (await navigator.serviceWorker.getRegistration(base)).active; }, url);
    snapshot = oldSnapshot; await waitUpdate(upgradedObserver);
    assert.equal(await upgradedPage.evaluate(() => !!window.emberwake), true, 'Old page remains new product until closed');
    const rolledBack = await afterClientsClose(upgradedObserver, upgradedContext, [upgradedPage]);
    await rolledBack.waitForFunction(() => !!window.lumen, null, { timeout });
    await milestone('historical-lumen-ready', upgradedObserver);
    assert.equal(await rolledBack.evaluate(() => localStorage.getItem('EW_STORY_V3')), v3);
    const legacy = await upgradedContext.newPage(); await legacy.goto(url + 'assets/legacy.html');
    await legacy.waitForFunction(() => !!window.emberwake, null, { timeout });
    assert.equal(await legacy.evaluate(() => !!EW.validateSave(localStorage.getItem('EW_STORY_V3'), EW_LEVELS)), true);
    assert.equal(await legacy.evaluate(() => localStorage.getItem('EW_STORY_V3')), v3);
    await legacy.close(); await rolledBack.close();
    return { historicalWorkerActual: true, defaultRollbackProduct: 'Lumenblade (historical fixture only)', legacyEmberwakeV3Valid: true, originalSaveBytesRetained: true };
  });
  await upgradedContext.close();
  }
  if (arm !== 'rollback-only') {
    for (const ending of ['mercy', 'rekindle']) {
      await check(`V4 ${ending}: failed install, activation, offline, historical rollback and re-upgrade preserve paid journey`,
        () => v4Lifecycle(ending));
    }
  }
} catch (error) {
  if (!failures.length) failures.push({ name: 'harness setup/runtime', message: error.message, stack: error.stack });
  process.exitCode = 1; console.error(error.message);
} finally {
  report();
  clearTimeout(trialTimer);
  await Promise.all(contexts.map(c => c.close().catch(() => {})));
  if (browser) await browser.close();
  await Promise.all([primary, foreign].map(s => new Promise(resolve => { s.close(resolve); s.closeAllConnections(); })));
}
