/**
 * Alpha.5 browser acceptance. Run ONLY against the parent's final integrated build.
 * No build/server/git/install is performed here. Synthetic and imported fixtures
 * are reported separately from fresh input-earned acquisition. See external
 * plan/next3/native-acceptance.md for evidence boundaries and execution instructions.
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = process.env.EW_URL || 'http://127.0.0.1:4173/Swordigo-V2/';
const output = process.env.EW_ALPHA5_OUTPUT || 'qa/correction/next3/native-browser';
const executablePath = process.env.CHROME_BIN ||
  ['/usr/bin/chromium', '/usr/local/bin/chromium', '/usr/bin/google-chrome'].find(p => fs.existsSync(p));
const atlasPath = 'assets/art/terrain-materials-v13.png';
fs.mkdirSync(output, { recursive: true });

const cases = [
  ['desktop-native', 'Fresh desktop UI; native settings, input-earned cache and correspondence reader'],
  ['portrait-touch', 'Fresh 390x844 UI; CDP-dispatched touch, held drop and cancelled multitouch recovery'],
  ['landscape-touch', 'Fresh 844x390 UI; CDP-dispatched touch, held drop and cancelled multitouch recovery'],
  ['atlas-missing-fallback', 'Fresh native UI with an explicitly aborted atlas request; degraded renderer'],
  ['letter-coda-fixtures', 'Validated synthetic imports; native approach and interact, not earned campaigns/repairs'],
  ['short-room-camera-fixture', 'Imported cleared-room fixture and render-only invariance, not earned traversal'],
].map(([name, scope]) => ({ name, scope, status: 'unrun' }));

const report = {
  kind: 'Alpha.5 source-grounded native Chromium acceptance',
  pass: false,
  startedAt: new Date().toISOString(),
  base,
  harnessSHA256: createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),
  cases,
  captures: [],
  limits: [
    'No physical touch/controller, human discovery/pacing, screen-reader, Safari/Firefox or device-performance qualification.',
    'Controller polling uses a labelled synthetic standard-gamepad event/navigator shim, not physical hardware.',
    'Touch uses Chromium CDP Input.dispatchTouchEvent; no claim of real-device reach/comfort.',
    'Only the first Moonroot cache is input-earned here; ending/Archive/repair/cleared-room imports are synthetic fixtures.',
    'Touch drop proves held dispatch and cancelled-pointer recovery, not an earned one-way-platform descent.',
    'Screenshots are evidence for individual human inspection, not an automatic visual/contrast/accessibility pass.',
    'Camera rendering invariance is a bounded fixture; campaign and exact-replay gates remain separate.',
  ],
};
const flush = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
flush();
let browser;

const frames = (page, n = 3) => page.evaluate(n => new Promise(resolve => {
  let left = n;
  function tick() {
    if (--left <= 0) resolve();
    else requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}), n);

const observe = page => page.evaluate(() => {
  const a = window.emberwake, g = a?.game;
  return a && {
    status: g.status,
    modal: a.modalKind,
    paused: a.paused,
    running: a.running,
    scene: g.scene?.id,
    p: g.p && { x: g.p.x, y: g.p.y, vx: g.p.vx, vy: g.p.vy, hp: g.p.hp, mp: g.p.mp },
    near: g.near && { type: g.near.type, id: g.near.item?.id },
    held: [...a.held.entries()],
    activeElement: document.activeElement?.id || document.activeElement?.dataset?.act,
    atlas: a.renderer._terrainMaterial &&
      { ready: a.renderer._terrainMaterial.ready, failed: a.renderer._terrainMaterial.failed },
  };
});

async function capture(page, name, scope) {
  await page.screenshot({ path: path.join(output, name + '.png') });
  report.captures.push({ filename: name + '.png', scope, viewport: page.viewportSize() });
}

async function boot(page) {
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => window.emberwake && window.EW_JOURNAL && window.EW_SEQUEL_PRESENTATION);
  assert.equal(await page.evaluate(() => emberwake.game.status), 'menu');
  assert.equal(await page.locator('#continue').isVisible(), false, 'fresh context must not inherit a save');
  return page.evaluate(() => ({
    version: document.querySelector('meta[name="application-version"]')?.content,
    engineVersion: EW.version,
  }));
}

async function click(page, selector, touch = false) {
  const locator = page.locator(selector);
  if (touch) await locator.tap();
  else await locator.click();
}

async function dialogues(page, touch = false) {
  for (let i = 0; i < 16 && await page.evaluate(() => emberwake.modalKind === 'dialogue'); i++) {
    await click(page, '[data-act="dialog-next"]', touch);
    await frames(page, 2);
  }
  assert.notEqual(await page.evaluate(() => emberwake.modalKind), 'dialogue',
    'dialogue must complete without a forced close');
}

async function launch(page, touch = false) {
  await click(page, '#begin', touch);
  await click(page, '[data-act="launch"]', touch);
  await dialogues(page, touch);
  await page.waitForFunction(() => emberwake.game.status === 'playing' && !emberwake.paused && !emberwake.modalKind);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'world');
}

async function atlasReady(page) {
  await page.waitForFunction(() => emberwake.renderer._terrainMaterial?.ready ||
    emberwake.renderer._terrainMaterial?.failed);
  const state = await page.evaluate(() => {
    const r = emberwake.renderer, s = r._terrainMaterial;
    return {
      quality: emberwake.settings.quality,
      ready: s.ready,
      failed: s.failed,
      width: s.image.naturalWidth,
      height: s.image.naturalHeight,
      path: new URL(s.image.src).pathname,
      selected: r.terrainMaterial() === s.image,
    };
  });
  assert.deepEqual(
    { ready: state.ready, failed: state.failed, width: state.width, height: state.height, selected: state.selected },
    { ready: true, failed: false, width: 1264, height: 848, selected: true },
    'decoded authored atlas must actually be selected',
  );
  assert.equal(state.quality, 'high', 'ready cache alone is not evidence of high-quality atlas selection');
  assert(state.path.endsWith('/' + atlasPath));
  return state;
}

async function layout(page, touch) {
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    touch: [...document.querySelectorAll('[data-touch]')]
      .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
      .map(e => {
        const r = e.getBoundingClientRect();
        return {
          action: e.dataset.touch, x: r.x, y: r.y, width: r.width, height: r.height,
          centerAction: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            ?.closest('[data-touch]')?.dataset.touch,
          onscreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        };
      }),
  }));
  assert.equal(result.overflow, false, 'viewport must not horizontally overflow');
  if (touch) {
    assert(result.touch.some(t => t.action === 'drop'), 'touch DOWN must be visible');
    for (const t of result.touch) {
      assert(t.width >= 43.99 && t.height >= 43.99, 'touch target >=44 CSS px: ' + JSON.stringify(t));
      assert(t.onscreen, 'touch target must remain onscreen: ' + JSON.stringify(t));
      assert.equal(t.centerAction, t.action, 'target center cannot be covered by another DOM control');
    }
  }
  return result;
}

async function isolated(page) {
  const state = await page.evaluate(() => {
    const modal = document.getElementById('modal'), input = document.getElementById('import-file');
    return {
      kind: emberwake.modalKind,
      modalInert: !!modal.closest('[inert]'),
      titleInert: !!document.getElementById('title-screen').closest('[inert]'),
      worldInert: !!document.getElementById('world').closest('[inert]'),
      liveInert: !!document.getElementById('live').closest('[inert]'),
      importInert: !!input.closest('[inert]'),
      importInModal: modal.contains(input),
      importHidden: input.hidden,
      focusInside: modal.contains(document.activeElement),
    };
  });
  assert(state.kind && state.focusInside, 'visible dialog initially owns focus');
  assert(state.titleInert && state.worldInert, 'nonmodal regions are actually inert');
  assert(!state.modalInert && !state.liveInert && !state.importInert,
    'modal ancestry and the explicit announcer exemption stay usable');
  assert(state.importInModal && state.importHidden,
    'hidden import input must be contained by the non-inert modal');
  await page.evaluate(() => document.getElementById('begin').focus());
  assert.equal(await page.evaluate(() => document.getElementById('modal').contains(document.activeElement)), true,
    'inert background cannot steal focus');
  const count = await page.locator(
    '#modal button:visible:not([disabled]), #modal input:visible:not([disabled]), #modal select:visible:not([disabled])',
  ).count();
  assert(count > 1);
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < count + 2; i++) {
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(() => document.getElementById('modal').contains(document.activeElement)), true,
        key + ' focus remains trapped');
    }
  }
  return state;
}

async function nativeChooserCancel(page, selector) {
  const session = await page.context().newCDPSession(page);
  try {
    await page.evaluate(() => {
      window.__alpha5NativeChooserCancel = null;
      document.getElementById('import-file').addEventListener('cancel', e => {
        window.__alpha5NativeChooserCancel = { trusted: e.isTrusted, value: e.currentTarget.value };
      }, { once: true });
    });
    await session.send('Page.enable');
    await session.send('Page.setInterceptFileChooserDialog', { enabled: true, cancel: true });
    await page.locator(selector).click();
    await page.waitForFunction(sel => {
      const trigger = document.querySelector(sel);
      return window.__alpha5NativeChooserCancel && emberwake._importTrigger == null &&
        document.activeElement === trigger;
    }, selector);
    const proof = await page.evaluate(sel => {
      const trigger = document.querySelector(sel), input = document.getElementById('import-file');
      return {
        ...window.__alpha5NativeChooserCancel,
        triggerVisible: !!trigger?.getClientRects().length,
        triggerValid: emberwake.validFocusTarget(trigger),
        focused: document.activeElement === trigger,
        contained: document.getElementById('modal').contains(input),
        hidden: input.hidden,
      };
    }, selector);
    assert.deepEqual(proof, {
      trusted: true, value: '', triggerVisible: true, triggerValid: true,
      focused: true, contained: true, hidden: true,
    }, 'real chooser cancellation must clear ownership and restore its still-valid visible trigger');
    return proof;
  } finally {
    await session.send('Page.setInterceptFileChooserDialog', { enabled: false, cancel: true }).catch(() => {});
    await session.detach().catch(() => {});
  }
}

async function uninert(page) {
  assert.equal(await page.evaluate(() =>
    !!document.getElementById('title-screen').closest('[inert]') ||
    !!document.getElementById('world').closest('[inert]')), false,
  'closing must remove owned inertness');
}

async function nativeMove(page, target, tolerance = 14) {
  const start = await page.evaluate(() => emberwake.game.p.x);
  const code = start < target ? 'KeyD' : 'KeyA';
  await page.keyboard.down(code);
  try {
    await page.waitForFunction(({ target, tolerance }) =>
      Math.abs(emberwake.game.p.x - target) <= tolerance, { target, tolerance });
  } finally {
    await page.keyboard.up(code);
  }
}

const stableJourney = page => page.evaluate(() => JSON.stringify({
  journey: emberwake.game.snapshotJourney(),
  revision: emberwake.game.chapterRevision,
  hp: emberwake.game.p?.hp,
  mp: emberwake.game.p?.mp,
  flasks: emberwake.game.p?.flasks,
  store: localStorage.getItem('EW_STORY_V4'),
}));

const activeLabels = (page, mode) => page.evaluate(mode => ({
  mode,
  active: emberwake.lastInput,
  jump: emberwake.inputLabel('jump'),
  attack: emberwake.inputLabel('attack'),
  drop: emberwake.inputLabel('drop'),
  guide: document.getElementById('guide')?.innerText,
  badges: [...document.querySelectorAll('.ability b')].map(e => e.textContent),
}), mode);

function syntheticPadInit() {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const pad = { id: 'Alpha.5 synthetic standard gamepad', index: 0, connected: true,
    mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: 0 };
  let connected = false;
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => connected ? [pad] : [],
  });
  const emit = type => {
    const e = new Event(type);
    Object.defineProperty(e, 'gamepad', { value: pad });
    window.dispatchEvent(e);
  };
  window.__EW_ALPHA5_PAD = {
    connect() { connected = true; pad.connected = true; pad.timestamp++; emit('gamepadconnected'); },
    disconnect() { connected = false; pad.connected = false; pad.timestamp++; emit('gamepaddisconnected'); },
    set(indices = []) {
      const pressed = new Set(indices);
      buttons.forEach((b, i) => {
        b.pressed = pressed.has(i); b.touched = b.pressed; b.value = b.pressed ? 1 : 0;
      });
      pad.timestamp++;
    },
  };
}

async function padButtons(page, indices, n = 3) {
  await page.evaluate(indices => window.__EW_ALPHA5_PAD.set(indices), indices);
  await frames(page, n);
}

async function desktop(page, result) {
  result.versions = await boot(page);
  const titleSettings = '.topactions [data-act="settings"]';
  await page.locator(titleSettings).focus();
  await click(page, titleSettings);
  result.titleIsolation = await isolated(page);
  await page.locator('#set-volume').focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  assert.equal(Number(await page.locator('#set-volume').inputValue()), .5);

  await page.evaluate(() => window.__EW_ALPHA5_PAD.connect());
  await frames(page, 4);
  await padButtons(page, [15]); await padButtons(page, []);
  assert.equal(Number(await page.locator('#set-volume').inputValue()), .55);
  await padButtons(page, [14]); await padButtons(page, []);
  assert.equal(Number(await page.locator('#set-volume').inputValue()), .5);
  await padButtons(page, [14]); await padButtons(page, []);
  assert.equal(Number(await page.locator('#set-volume').inputValue()), .45);
  await page.keyboard.press('End');
  await padButtons(page, [15], 8);
  assert.equal(Number(await page.locator('#set-volume').inputValue()), 1, 'held edge changes once and clamps');
  await padButtons(page, []);
  await page.keyboard.press('Home');
  await padButtons(page, [14]); await padButtons(page, []);
  assert.equal(Number(await page.locator('#set-volume').inputValue()), 0, 'left clamps at minimum');
  await page.keyboard.press('Home');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'set-volume');

  const focusCount = await page.locator(
    '#modal button:visible:not([disabled]), #modal input:visible:not([disabled]), #modal select:visible:not([disabled])',
  ).count();
  for (let i = 0; i < focusCount + 2; i++) {
    await padButtons(page, []); await padButtons(page, [13]);
    assert.equal(await page.evaluate(() => document.getElementById('modal').contains(document.activeElement)), true,
      'synthetic controller navigation stays inside the dialog');
  }
  await click(page, '#modal [data-act="bindings"]');
  await isolated(page);
  await click(page, '#modal [data-primary][data-act="close"]');
  assert.equal(await page.evaluate(() => document.activeElement?.matches('.topactions [data-act="settings"]')), true,
    'settings→bindings→close restores original title opener');
  await page.evaluate(() => window.__EW_ALPHA5_PAD.disconnect());

  await click(page, titleSettings);
  await page.evaluate(() => { document.querySelector('.topactions [data-act="settings"]').hidden = true; });
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'begin',
    'invalid hidden opener falls back to visible Begin');
  await page.evaluate(() => { document.querySelector('.topactions [data-act="settings"]').hidden = false; });
  result.invalidOrigin = { scope: 'explicit hidden-DOM-origin fixture', fallback: 'begin' };

  await launch(page);
  result.atlas = await atlasReady(page);
  result.layout = await layout(page, false);
  await capture(page, 'native-fresh-desktop-1440x1000',
    'Native fresh launch, decoded atlas, no positioned game state');
  await page.evaluate(() => window.__EW_ALPHA5_PAD.connect());
  await frames(page, 5);
  await padButtons(page, [2]);
  result.controllerLabels = await activeLabels(page, 'gamepad');
  await capture(page, 'synthetic-pad-active-labels-desktop',
    'SYNTHETIC standard-gamepad polling in fresh playing journey; active guide/badge labels, not hardware qualification');
  await padButtons(page, []);
  await page.evaluate(() => window.__EW_ALPHA5_PAD.disconnect());
  await frames(page, 4);

  await page.keyboard.press('Escape');
  await click(page, '#modal [data-act="settings"]');
  await isolated(page);
  await page.keyboard.press('Escape');
  await uninert(page);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'world',
    'play→pause→settings close returns game canvas');

  await nativeMove(page, 450);
  await page.waitForTimeout(150);
  const acquisition = await page.evaluate(() => ({
    near: emberwake.game.findNearby()?.item?.id,
    type: emberwake.game.findNearby()?.type,
    chest: EW_LEVELS[0].chests.find(c => c.id === 'm-ch0'),
    gold: emberwake.game.progress.gold,
    earned: emberwake.game.progress.flags.chests.slice(),
  }));
  assert.equal(acquisition.near, 'm-ch0');
  assert.equal(acquisition.type, 'chest');
  assert.deepEqual(acquisition.earned, []);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => emberwake.modalKind === 'dialogue');
  assert((await page.locator('#modal-content').textContent()).includes(acquisition.chest.lore),
    'ordinary acquisition dialogue retains original lore');
  const earned = await page.evaluate(() => ({
    flags: emberwake.game.progress.flags.chests,
    gold: emberwake.game.progress.gold,
    saved: JSON.parse(localStorage.getItem('EW_STORY_V4')).current.base.flags.chests,
  }));
  assert.deepEqual(earned.flags, ['m-ch0']);
  assert.deepEqual(earned.saved, ['m-ch0']);
  assert.equal(earned.gold, acquisition.gold + acquisition.chest.gold);
  await dialogues(page);
  await page.keyboard.press('KeyI');
  assert.equal(await page.evaluate(() => emberwake.modalKind), 'codex');
  assert.deepEqual(await page.locator('[data-act="read-letter"]').evaluateAll(es => es.map(e => e.dataset.letter)),
    ['m-ch0'], 'unearned letters must not be exposed');
  const before = await stableJourney(page);
  await click(page, '[data-act="read-letter"][data-letter="m-ch0"]');
  assert.equal(await page.evaluate(() => emberwake.modalKind), 'correspondence');
  assert.equal(await page.locator('#remembered-letter-text').textContent(), acquisition.chest.lore);
  await isolated(page);
  await capture(page, 'native-earned-correspondence-desktop',
    'm-ch0 earned by fresh native movement/E; ordinary journal reader');
  await click(page, '[data-act="letters-journal"]');
  assert.equal(await stableJourney(page), before,
    'reader/back navigation changes neither journey/resources/revision nor durable bytes');
  await click(page, '[data-act="read-letter"][data-letter="m-ch0"]');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'world');
  result.earnedCorrespondence = {
    id: 'm-ch0', acquisition: 'Fresh native walk and KeyE; no game/position/fact injection',
    originalText: acquisition.chest.lore, goldBefore: acquisition.gold, goldAfter: earned.gold,
    readerImmutable: true,
  };

  await page.keyboard.press('Escape');
  const chooserBefore = await stableJourney(page);
  result.nativeChooserCancel = await nativeChooserCancel(page, '#modal [data-act="import"]');
  assert.equal(await stableJourney(page), chooserBefore,
    'native chooser cancellation preserves journey and durable bytes');
  assert.equal(await page.evaluate(() => emberwake.modalKind), 'pause',
    'native chooser cancellation keeps its owning pause dialog open');

  const importBefore = await stableJourney(page);
  const payload = await page.evaluate(() => emberwake.game.snapshotJourney());
  await page.locator('#import-file').setInputFiles({
    name: 'current-earned-journey.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await page.waitForFunction(() => emberwake.modalKind === 'restore');
  await isolated(page);
  await page.evaluate(() => {
    const a = emberwake, original = a.act;
    const state = () => JSON.stringify({
      journey: a.game.snapshotJourney(), revision: a.game.chapterRevision,
      hp: a.game.p.hp, mp: a.game.p.mp, flasks: a.game.p.flasks,
      store: localStorage.getItem('EW_STORY_V4'),
    });
    a.act = function (action, ...args) {
      if (action !== 'import-cancel') return original.call(this, action, ...args);
      const before = state(), value = original.call(this, action, ...args);
      window.__alpha5ImportCancelProof = { before, after: state() };
      return value;
    };
  });
  await click(page, '[data-act="import-cancel"]');
  const cancelled = await page.evaluate(() => window.__alpha5ImportCancelProof);
  assert.equal(cancelled.before, importBefore, 'staging and focus navigation do not change the current journey');
  assert.equal(cancelled.after, cancelled.before, 'real import-cancel action preserves journey and durable bytes');
  await uninert(page);
  result.importCancelledImmutable = true;
  if (await page.evaluate(() => !!emberwake.modalKind)) await page.keyboard.press('Escape');
  await page.keyboard.press('KeyD');
  result.keyboardLabels = await activeLabels(page, 'keyboard');
  await capture(page, 'native-traversal-desktop-1440x1000',
    'Input-earned cache journey, native movement and active keyboard labels');
}

async function touchSequence(page, result, name) {
  result.versions = await boot(page);
  await launch(page, true);
  result.atlas = await atlasReady(page);
  result.layout = await layout(page, true);
  await capture(page, 'native-fresh-' + name,
    'Fresh native touch launch, decoded atlas; no positioned game state');
  const session = await page.context().newCDPSession(page);
  const center = async selector => {
    const r = await page.locator(selector).boundingBox();
    assert(r);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, radiusX: 2, radiusY: 2, force: 1 };
  };
  const right = { ...await center('[data-touch="right"]'), id: 11 };
  const down = { ...await center('[data-touch="drop"]'), id: 12 };
  await page.evaluate(() => {
    window.__alpha5PointerTrace = [];
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture']) {
      document.addEventListener(type, e => {
        if (e.pointerType === 'touch') window.__alpha5PointerTrace.push({
          type, pointerId: e.pointerId, action: e.target.dataset?.touch, trusted: e.isTrusted,
        });
      }, true);
    }
  });
  const send = (type, touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
  try {
    const x = await page.evaluate(() => emberwake.game.p.x);
    await send('touchStart', [right]);
    await page.waitForFunction(x => emberwake.down('right') && emberwake.game.p.x > x + 8, x);
    await send('touchStart', [right, down]);
    await page.waitForFunction(() => emberwake.down('right') && emberwake.down('drop'));
    await page.waitForTimeout(180);
    const held = await page.evaluate(() => ({
      held: [...emberwake.held.entries()],
      axis: emberwake.sample().axis,
      drop: emberwake.sample().drop,
    }));
    assert(held.drop && held.axis > 0, 'simultaneously held movement and drop reach ordinary sample()');
    assert.equal(held.held.filter(([, action]) => action === 'drop').length, 1);
    result.touchLabels = await activeLabels(page, 'touch');
    assert.equal(result.touchLabels.drop, 'Hold DOWN');
    await capture(page, 'native-held-drop-' + name,
      'Trusted Chromium CDP touch pointers hold RIGHT + DOWN; not physical device or platform-descent proof');
    await send('touchCancel', []);
    await page.waitForFunction(() => !emberwake.down('right') && !emberwake.down('drop') && emberwake.held.size === 0);
    assert.equal(await page.locator('[data-touch].active').count(), 0,
      'cancel clears active touch styling');
    await send('touchStart', [down]);
    await page.waitForFunction(() => emberwake.down('drop'));
    await frames(page, 5);
    assert.equal(await page.evaluate(() => emberwake.sample().drop), true, 'fresh DOWN remains held');
    await send('touchEnd', []);
    await page.waitForFunction(() => !emberwake.down('drop'));
    await send('touchStart', [right, down]);
    await page.waitForFunction(() => emberwake.down('right') && emberwake.down('drop'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => emberwake.modalKind === 'pause');
    assert.equal(await page.evaluate(() => emberwake.held.size), 0, 'pause clears held multitouch');
    await send('touchCancel', []);
    await page.keyboard.press('Escape');
    const y = await page.evaluate(() => emberwake.game.p.y);
    const jump = { ...await center('[data-touch="jump"]'), id: 13 };
    await send('touchStart', [jump]);
    await page.waitForFunction(y => emberwake.game.p.y < y - 8, y);
    await send('touchEnd', []);
    result.pointerTrace = await page.evaluate(() => window.__alpha5PointerTrace);
    assert(result.pointerTrace.filter(e => e.type === 'pointercancel' && e.trusted).length >= 2,
      'actual browser dispatch must produce cancellation for both pointers');
    assert(result.pointerTrace.some(e => e.type === 'lostpointercapture'),
      'captured pointer cancellation releases capture');
    result.touch = {
      source: 'Chromium CDP Input.dispatchTouchEvent; trusted DOM touch pointer events',
      simultaneousHeld: held, cancelledRecovery: true, modalClear: true, freshJumpAfterCancel: true,
      platformDescent: 'unrun; no earned one-way shelf reached',
    };
    result.layoutAfter = await layout(page, true);
    await capture(page, 'native-recovery-' + name,
      'Fresh jump after cancelled multitouch; native active touch labels');
    await page.keyboard.press('KeyA');
    result.keyboardLabels = await activeLabels(page, 'keyboard');
  } finally {
    await send('touchCancel', []).catch(() => {});
    await session.detach();
  }
}

async function missingAtlas(page, result) {
  let requests = 0;
  await page.route('**/' + atlasPath, route => {
    requests++;
    return route.abort('failed');
  });
  result.versions = await boot(page);
  await launch(page);
  await page.waitForFunction(() => emberwake.renderer._terrainMaterial?.failed);
  await nativeMove(page, 340);
  const state = await page.evaluate(() => {
    const r = emberwake.renderer, s = r._terrainMaterial;
    return {
      quality: emberwake.settings.quality,
      ready: s.ready, failed: s.failed, selected: r.terrainMaterial() !== null,
      canvasWidth: r.canvas.width, canvasHeight: r.canvas.height,
      pixels: r.c.getImageData(Math.floor(r.canvas.width / 2), Math.floor(r.canvas.height / 2), 1, 1).data[3],
    };
  });
  assert.deepEqual({ ready: state.ready, failed: state.failed, selected: state.selected },
    { ready: false, failed: true, selected: false });
  assert.equal(state.pixels, 255, 'fallback canvas remains paintable, not a broken/tainted bitmap');
  await frames(page, 15);
  assert.equal(requests, 1, 'failed atlas has no retry loop');
  result.fallback = { ...state, requests, scope: 'deliberately aborted authored atlas; inspect capture manually' };
  await capture(page, 'degraded-atlas-fallback',
    'DEGRADED FALLBACK: authored atlas request deliberately aborted; human visual inspection required');
}

async function fixturePayload(page, options = {}) {
  return page.evaluate(options => {
    const { ending = 'mercy', complete = false, repaired = false, collected = false } = options;
    const g = new EW.Game(EW_LEVELS);
    g.newRun('adventure', 'story');
    for (const l of EW_LEVELS) {
      g.flag('seen', l.id);
      g.flag('defeated', l.boss.id);
      for (const e of l.enemies) g.flag('defeated', e.id);
      for (const r of l.sigils) {
        g.flag('runes', r.id);
        g.flag('sigils', r.id);
      }
    }
    g.loadLevel(2);
    g.finish(ending);
    if (!g.continueDeliveries()) throw Error('fixture continuation refused');
    const d = EW.ChapterData;
    g.chapter.active = true;
    g.chapter.discovered = [...d.rosters.discovered];
    g.chapter.defeated = d.rosters.defeated.filter(id =>
      d.defeated[id]?.sceneId === 'ch1:room:rootcellar');
    if (repaired) {
      g.chapter.mechanisms = [...d.rosters.mechanisms];
      g.chapter.items = d.rosters.items.filter(id => id !== 'ch1:item:open-letter');
      g.chapter.deliveries = [...d.rosters.deliveries];
    }
    if (collected && !g.chapter.items.includes('ch1:item:open-letter')) {
      g.chapter.items.push('ch1:item:open-letter');
    }
    if (complete) {
      g.chapter.defeated = [...new Set([...g.chapter.defeated, 'ch1:enemy:archivist-engine'])];
      g.chapter.complete = true;
    }
    const anchor = d.anchors['ch1:anchor:rootcellar-entry'];
    g.chapter.anchor = { sceneId: anchor.sceneId, anchorId: anchor.id };
    g.switchChapterScene(anchor.sceneId, anchor.id);
    const payload = g.snapshotJourney();
    const normalized = EW.ChapterSave.normalizePayload(payload, EW_LEVELS);
    if (!normalized) throw Error('synthetic fixture failed ChapterSave normalization');
    return normalized;
  }, options);
}

async function importPayload(page, payload, name) {
  if (await page.evaluate(() => !!emberwake.modalKind)) await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.locator('#import-file').setInputFiles({
    name: name + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)),
  });
  await page.waitForFunction(() => emberwake.modalKind === 'restore');
  await click(page, '[data-act="import-accept"]');
  await page.waitForFunction(() => emberwake.game.status === 'won' || emberwake.game.status === 'playing');
  if (await page.evaluate(() => emberwake.game.status === 'won')) {
    await click(page, '#modal [data-act="title"]');
    await page.waitForFunction(() => emberwake.game.status === 'menu' && !emberwake.modalKind);
  }
  if (await page.locator('#continue-chapter').isVisible().catch(() => false)) {
    await click(page, '#continue-chapter');
  }
  await page.waitForFunction(() => emberwake.game.status === 'playing' && !emberwake.modalKind);
  assert.equal(await page.evaluate(() => emberwake.game.scene?.id), 'ch1:room:rootcellar');
}

async function letterRead(page, repeat) {
  await nativeMove(page, 360, 20);
  await page.waitForFunction(() => emberwake.game.findNearby()?.item?.id === 'ch1:item:open-letter');
  await page.evaluate(() => {
    const g = emberwake.game, original = g.interact;
    const state = () => JSON.stringify({
      journey: g.snapshotJourney(), p: g.p, revision: g.chapterRevision, scene: g.scene?.id,
      store: localStorage.getItem('EW_STORY_V4'),
      sceneIdentity: g.scene, enemiesIdentity: g.enemies, shotsIdentity: g.shots,
    });
    g.interact = function (...args) {
      const before = state(), events = this.events?.length || 0;
      const value = original.apply(this, args);
      window.__alpha5LetterRead = {
        before, after: state(), value,
        emitted: (this.events || []).slice(events).map(e => ({ type: e.type, lines: e.lines })),
      };
      return value;
    };
  });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => emberwake.modalKind === 'dialogue' && window.__alpha5LetterRead);
  const proof = await page.evaluate(() => {
    const p = window.__alpha5LetterRead;
    return { ...p, lines: emberwake.dialog.lines.slice() };
  });
  if (repeat) {
    assert.equal(proof.after, proof.before,
      'repeat interaction changes neither journey/player/revision/scene/durable bytes nor object identities');
    assert.equal(proof.emitted.filter(e => e.type === 'dialogue').length, 1,
      'repeat emits exactly one dialogue');
  }
  const presented = await page.evaluate(() => {
    const d = emberwake.dialog, line = d.lines[0], colon = line.indexOf(': ');
    return colon > -1 && !d.speaker ? line.slice(colon + 2) : line;
  });
  assert.equal(await page.locator('#dialogue-text').textContent(), presented,
    'actual reader presents the emitted dialogue with normal speaker extraction');
  return proof;
}

async function codas(page, result) {
  result.versions = await boot(page);
  await launch(page);
  result.reads = [];

  await importPayload(page, await fixturePayload(page, {
    ending: 'mercy', complete: false, repaired: false, collected: false,
  }), 'fixture-first-read-incomplete-archive');
  const first = await letterRead(page, false);
  assert.doesNotMatch(first.lines.join(' '), /page we write afterward/);
  await capture(page, 'fixture-first-letter-incomplete-archive',
    'SYNTHETIC completed campaign but incomplete Archive; native first read, not earned progression');
  await dialogues(page);
  const repeat = await letterRead(page, true);
  assert.doesNotMatch(repeat.lines.join(' '), /page we write afterward/);
  result.reads.push({ ending: 'mercy', repaired: false, complete: false, first, repeat });
  await dialogues(page);

  for (const ending of ['mercy', 'rekindle']) {
    for (const repaired of [false, true]) {
      await importPayload(page, await fixturePayload(page, {
        ending, complete: true, repaired, collected: true,
      }), 'fixture-coda-' + ending + '-' + repaired);
      const proof = await letterRead(page, true), text = proof.lines.join(' ');
      assert.match(text, /page we write afterward/);
      assert.match(text, ending === 'mercy' ? /king has a tomorrow/ : /palace is fading/);
      assert.match(text, repaired ? /Charter stands in the public record/ : /Charter is not yet published/);
      assert.match(text, repaired ? /terraces have their measured share/ : /measurements can still be brought home/);
      assert.match(text, repaired ? /banked hearth warms a home/ : /hearth is still waiting for Summer Coal/);
      assert.doesNotMatch(text, /king died|Veyr died/);
      await capture(page, 'fixture-coda-' + ending + '-' + (repaired ? 'repaired' : 'unrepaired'),
        'SYNTHETIC validated ending/Archive/repair/cleared-room import; native walk/E reread, not earned progression');
      result.reads.push({
        ending, repaired,
        scope: 'synthetic imported eligibility; native normal findNearby/interact dispatch',
        proof,
      });
      await dialogues(page);
    }
  }
}

async function cameraFixture(page, result) {
  result.versions = await boot(page);
  await launch(page);
  await importPayload(page, await fixturePayload(page), 'fixture-short-room-camera');
  await page.setViewportSize({ width: 2560, height: 600 });
  await page.waitForTimeout(200);
  result.fixture = await page.evaluate(() => {
    const a = emberwake, g = a.game, r = a.renderer;
    a.paused = true;
    const before = JSON.stringify({
      journey: g.snapshotJourney(), p: g.p, camera: g.camera,
      revision: g.chapterRevision, shots: g.shots, enemies: g.enemies,
    });
    const width = r.w, prior = r._cameraFollow, priorPlayer = r._cameraPlayer;
    const expectedKey = g.scene?.id || g.level.id;
    r.w = g.level.width + 500;
    const values = [];
    for (let i = 0; i < 30; i++) {
      r.draw(1 / 60);
      values.push(r.cam);
    }
    const after = JSON.stringify({
      journey: g.snapshotJourney(), p: g.p, camera: g.camera,
      revision: g.chapterRevision, shots: g.shots, enemies: g.enemies,
    });
    const integration = r._cameraFollow &&
      { width: r._cameraFollow.width, key: r._cameraFollow.key };
    r.w = width;
    r._cameraFollow = prior;
    r._cameraPlayer = priorPlayer;
    r.draw(0);
    return {
      levelWidth: g.level.width, overrideWidth: g.level.width + 500,
      expectedKey, values, integration, simulationUnchanged: before === after,
    };
  });
  assert.equal(result.fixture.integration?.width, result.fixture.overrideWidth,
    'Renderer.draw must really use integrated EWCamera.follow');
  assert.equal(result.fixture.integration?.key, result.fixture.expectedKey,
    'Renderer.draw must key camera state to the active scene/level');
  assert(result.fixture.values.every(cam => cam === 0),
    'short-room camera never goes negative or drifts beyond zero');
  assert(result.fixture.simulationUnchanged,
    '30 camera/draw steps must not mutate simulation or journey');
  await capture(page, 'fixture-short-room-ultrawide',
    'SYNTHETIC cleared-room import; 2560x600 viewport, render-only width clamp test; not earned traversal');
  result.scope =
    'Render-only invariance + clamping; dynamic native movement screenshots are in fresh viewport cases. Full campaign/replay equivalence is a separate gate.';
}

async function runCase(result, fn, options = {}) {
  result.status = 'running';
  flush();
  let context, page;
  const errors = [];
  try {
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...options,
    });
    await context.addInitScript(() => {
      window.__alpha5UnhandledRejections = [];
      window.addEventListener('unhandledrejection', e =>
        window.__alpha5UnhandledRejections.push(String(e.reason?.stack || e.reason)));
    });
    if (result.name === 'desktop-native') await context.addInitScript(syntheticPadInit);
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(30000);
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await fn(page, result);
    result.unhandledRejections = await page.evaluate(() => window.__alpha5UnhandledRejections);
    assert.deepEqual(result.unhandledRejections, [], 'no unhandled promise rejections');
    assert.deepEqual(errors, [], 'no page exceptions');
    result.status = 'pass';
  } catch (error) {
    result.status = 'fail';
    result.error = error.stack || String(error);
    if (page) {
      result.observation = await observe(page).catch(() => null);
      result.unhandledRejections =
        await page.evaluate(() => window.__alpha5UnhandledRejections).catch(() => []);
      await capture(page, 'failure-' + result.name,
        'Failed original attempt; no retry/eligibility bypass').catch(() => {});
    }
  } finally {
    result.pageExceptions = errors;
    result.finishedAt = new Date().toISOString();
    await context?.close().catch(() => {});
    flush();
  }
}

try {
  assert(executablePath && fs.existsSync(executablePath),
    'Set CHROME_BIN to an existing system Chromium executable');
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  report.browserVersion = browser.version();
  report.executablePath = executablePath;
  await runCase(cases[0], desktop);
  await runCase(cases[1], (page, result) => touchSequence(page, result, 'portrait-390x844'),
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await runCase(cases[2], (page, result) => touchSequence(page, result, 'landscape-844x390'),
    { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  await runCase(cases[3], missingAtlas);
  await runCase(cases[4], codas);
  await runCase(cases[5], cameraFixture);
  report.pass = cases.every(c => c.status === 'pass');
} catch (error) {
  report.fatalError = error.stack || String(error);
} finally {
  await browser?.close();
  report.finishedAt = new Date().toISOString();
  flush();
  console.log(JSON.stringify({
    pass: report.pass,
    cases: cases.map(({ name, status, error }) => ({ name, status, error: error?.split('\n')[0] })),
    captures: report.captures.length,
    report: path.join(output, 'report.json'),
  }));
  if (!report.pass) process.exitCode = 1;
}