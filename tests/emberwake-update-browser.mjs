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

const root = process.cwd();
const oldRef = process.env.EW_OLD_REF || '6c266e9';
const prefix = '/Swordigo-V2/';
const timeout = Number(process.env.EW_UPDATE_TIMEOUT_MS || 45000);
const output = process.env.EW_UPDATE_OUTPUT || 'qa/correction/update';
const sha = b => createHash('sha256').update(b).digest('hex');
const checks = [], failures = [], contexts = [];
const diagnostics = { requests: [], pageErrors: [], consoleErrors: [], partialInstall: [] };
let currentScenario = 'setup';
const gitRead = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
// Validate the ref as an existing commit and retain its exact resolved identity.
const oldCommit = gitRead('rev-parse', '--verify', `${oldRef}^{commit}`).toString().trim();
const oldSnapshot = new Map();
for (const file of gitRead('ls-tree', '-r', '--name-only', oldCommit).toString().split('\n')) {
  if (file === 'index.html' || file === 'sw.js' || file.startsWith('assets/'))
    oldSnapshot.set(file, gitRead('show', `${oldCommit}:${file}`));
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
    diagnostics.requests.push({ file, historical: snapshot === oldSnapshot, corrupt: corrupt === file, scenario: currentScenario, utc: new Date().toISOString(), referer: req.headers.referer || null, destination: req.headers['sec-fetch-dest'] || null });
    if (!bytes) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime(file), 'Cache-Control': 'no-store', 'Service-Worker-Allowed': prefix });
    const payload = req.method === 'HEAD' ? undefined : corrupt === file ? wrongBytes : bytes;
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
function report() {
  fs.mkdirSync(output, { recursive: true });
  const sourceHashes = Object.fromEntries([...currentSnapshot].filter(([p]) => p === 'index.html' || p === 'sw.js' || p.startsWith('assets/scripts/') || p.startsWith('assets/styles/')).map(([p, b]) => [p, sha(b)]));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
    generatedUTC: new Date().toISOString(), passed: checks.length, failed: failures.length,
    checks, failures, oldCommit, currentSourceHashes: sourceHashes,
    oldWorkerSHA256: sha(oldSnapshot.get('sw.js')), declaredAssets: Object.keys(hashes).length,
    browser: browser?.version(), fixtureOrigin: origin, foreignFixtureOrigin: foreignOrigin, controlledRetryFixture: debugRetry,
    scope: 'Independent dynamic loopback HTTP snapshots; actual historical Lumen worker/root/assets, current generated Emberwake worker, checkpoint-save fixture, waiting/activation, digest refusal, failed-install cleanup, offline and rollback. Synthetic save/controlled network/cache faults; not human gameplay, public deployment, physical devices, browser campaign or certification.',
    diagnostics
  }, null, 2));
}
async function check(name, fn) {
  const started = Date.now(); currentScenario = name;
  try { const evidence = await fn(); checks.push({ name, milliseconds: Date.now() - started, evidence }); console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, message: error.message, stack: error.stack }); throw error; }
}
async function context() {
  const c = await browser.newContext({ serviceWorkers: 'allow' }); contexts.push(c);
  c.setDefaultTimeout(timeout); c.setDefaultNavigationTimeout(timeout);
  c.on('page', p => {
    p.on('pageerror', e => diagnostics.pageErrors.push({ url: p.url(), message: e.message }));
    p.on('console', m => { if (m.type() === 'error') diagnostics.consoleErrors.push({ url: p.url(), message: m.text() }); });
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
  await o.evaluate(async base => { const r = await navigator.serviceWorker.getRegistration(base); if (!r) throw Error('Registration missing'); await r.update(); }, url);
  await o.waitForFunction(async base => { const r = await navigator.serviceWorker.getRegistration(base); return !!r?.waiting && r.waiting.state === 'installed'; }, url, { timeout });
}
async function afterClientsClose(o, c, oldPages) {
  await Promise.all(oldPages.map(p => p.close()));
  await o.waitForFunction(async base => { const r = await navigator.serviceWorker.getRegistration(base); return window.previousWorker?.state === 'redundant' && r?.active?.state === 'activated' && !r.waiting; }, url, { timeout });
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
try {
  const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  if (process.env.EW_UPDATE_NO_SANDBOX === '1') args.push('--no-sandbox');
  browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/usr/local/bin/chromium', headless: true, args });
  let upgradedContext, upgradedPage, upgradedObserver, v3;
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
  await check('actual historical-worker rollback retains a valid Emberwake journey via old legacy entry', async () => {
    // Other scenarios used fresh contexts; restore the new-release server before staging rollback.
    snapshot = currentSnapshot; corrupt = null;
    await upgradedObserver.evaluate(async base => { window.previousWorker = (await navigator.serviceWorker.getRegistration(base)).active; }, url);
    snapshot = oldSnapshot; await waitUpdate(upgradedObserver);
    assert.equal(await upgradedPage.evaluate(() => !!window.emberwake), true, 'Old page remains new product until closed');
    const rolledBack = await afterClientsClose(upgradedObserver, upgradedContext, [upgradedPage]);
    await rolledBack.waitForFunction(() => !!window.lumen, null, { timeout });
    assert.equal(await rolledBack.evaluate(() => localStorage.getItem('EW_STORY_V3')), v3);
    const legacy = await upgradedContext.newPage(); await legacy.goto(url + 'assets/legacy.html');
    await legacy.waitForFunction(() => !!window.emberwake, null, { timeout });
    assert.equal(await legacy.evaluate(() => !!EW.validateSave(localStorage.getItem('EW_STORY_V3'), EW_LEVELS)), true);
    assert.equal(await legacy.evaluate(() => localStorage.getItem('EW_STORY_V3')), v3);
    await legacy.close(); await rolledBack.close();
    return { historicalWorkerActual: true, defaultRollbackProduct: 'Lumenblade (historical fixture only)', legacyEmberwakeV3Valid: true, originalSaveBytesRetained: true };
  });
} catch (error) {
  if (!failures.length) failures.push({ name: 'harness setup/runtime', message: error.message, stack: error.stack });
  process.exitCode = 1; console.error(error.message);
} finally {
  report();
  await Promise.all(contexts.map(c => c.close().catch(() => {})));
  if (browser) await browser.close();
  await Promise.all([primary, foreign].map(s => new Promise(resolve => { s.close(resolve); s.closeAllConnections(); })));
}
