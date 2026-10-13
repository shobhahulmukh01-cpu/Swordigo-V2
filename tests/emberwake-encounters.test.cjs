'use strict';
const { test } = require('node:test');
const A = require('node:assert/strict');
const EW = require('../assets/scripts/engine.js');
const LEVELS = require('../assets/scripts/worlds.js');
require('../assets/scripts/core-v11.js');
const encounters = require('../assets/scripts/encounters-v12.js');
function fixture(index = 0, difficulty = 'adventure', mode = 'story', phase = 0) {
  const g = new EW.Game(LEVELS).newRun(difficulty, mode);
  for (let i = 0; i < index; i++) {
    g.flag('seen', LEVELS[i].id); g.flag('defeated', LEVELS[i].boss.id);
    for (const r of LEVELS[i].sigils) { g.flag('runes', r.id); g.flag('sigils', r.id); }
  }
  g.loadLevel(index);
  for (const r of g.current.sigils) { g.flag('runes', r.id); g.flag('sigils', r.id); }
  g.enemies = []; g.bossActive = true;
  g.boss.state = 'idle'; g.boss.t = 0;
  const a = g.boss.arena;
  g.boss.x = a[0] + (a[1] - a[0]) * .65;
  g.p.x = a[0] + (a[1] - a[0]) * .3 - 14;
  g.p.y = 536; g.p.vx = g.p.vy = 0; g.p.inv = 0;
  if (phase) g.boss.hp = Math.floor(g.boss.maxHp * .4);
  g.events = [];
  return g;
}
function ticks(g, seconds, dt = 1 / 120, full = false, input = {}) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) full ? g.step(dt, input) : g.updateBoss(dt);
}
function allState(g) {
  return JSON.stringify({ p: g.p, progress: g.progress, boss: g.boss, shots: g.shots, events: g.events, telegraphs: g.bossTelegraphs });
}
for (const mode of ['story', 'rush']) for (const difficulty of ['story', 'adventure', 'veteran'])
for (const phase of [0, 1]) for (const index of [0, 1, 2]) for (const dt of [1 / 60, 1 / 120]) {
  test(`warning -> attack -> punish recovery: ${mode}/${difficulty}/phase${phase}/${index}/${dt}`, () => {
    const g = fixture(index, difficulty, mode, phase), hp = g.boss.hp, a = g.boss.arena.slice();
    g.updateBoss(dt);
    const marks = g.bossTelegraphs;
    A.ok(marks.length >= 2);
    A.ok(marks.every(m => m.phase === 'warning' && m.remaining >= .95));
    A.equal(g.events[0].type, 'warning'); A.equal(g.shots.length, 0);
    for (const m of marks) { A.ok(m.x - m.radius >= a[0]); A.ok(m.x + m.radius <= a[1]); }
    const warning = marks[0].remaining;
    ticks(g, warning - 2 * dt, dt);
    A.equal(g.events.filter(e => e.type === 'guardianAttack').length, 0);
    A.equal(g.shots.length, 0);
    ticks(g, 3 * dt, dt);
    A.ok(g.events.some(e => e.type === 'guardianAttack'));
    A.ok(g.shots.length > 0); A.equal(g.boss.hp, hp);
    if (index > 0) {
      A.equal(g.events.filter(e => e.type === 'guardianAttack').length, 1);
      A.equal(g.bossTelegraphs.filter(m => m.phase === 'warning').length, 1);
      ticks(g, .65, dt);
      A.equal(g.events.filter(e => e.type === 'guardianAttack').length, 2);
    }
    let budget = 300;
    while (g.boss.state !== 'recover' && budget--) g.updateBoss(dt);
    A.ok(budget > 0); A.equal(g.boss.state, 'recover');
    A.equal(g.boss.t, encounters.timing.recovery);
    A.deepEqual(g.bossTelegraphs, []);
    A.equal(g.shots.filter(s => s.owner === 'enemy' && s.encounterBossId).length, 0);
    const count = g.events.filter(e => e.type === 'guardianAttack').length;
    ticks(g, 1, dt);
    A.equal(g.boss.state, 'recover');
    A.equal(g.events.filter(e => e.type === 'guardianAttack').length, count);
    g.damageEnemy(g.boss, 5); A.equal(g.boss.hp, hp - 5);
    A.deepEqual(g.boss.arena, a); A.equal(g.boss.id, LEVELS[index].boss.id);
    A.ok(EW.validateSave(g.snapshot(), LEVELS));
  });
}
test('installed module is idempotent, leaves release/schema/core methods alone', () => {
  const update = EW.Game.prototype.updateBoss, f = EW.Game.prototype.hurt;
  A.equal(encounters.install(EW), encounters); A.equal(EW.Game.prototype.updateBoss, update);
  A.equal(EW.Game.prototype.hurt, f); A.equal(EW.version, '1.1.0-rc.3');
  A.equal(fixture().snapshot().version, 3);
});
test('telegraph snapshots and API are deeply read-only and not serialized', () => {
  const g = fixture(); g.updateBoss(1 / 120); const marks = g.bossTelegraphs;
  A.ok(Object.isFrozen(marks)); A.ok(Object.isFrozen(marks[0])); A.ok(Object.isFrozen(encounters));
  A.throws(() => { marks[0].x = 1; }, TypeError);
  A.throws(() => { marks.push({}); }, TypeError);
  const before = JSON.stringify(g.snapshot()); g.bossTelegraphs; A.equal(JSON.stringify(g.snapshot()), before);
  A.ok(!before.includes('root-lanes')); A.ok(!before.includes('telegraphs'));
});
test('targets lock before attack, cannot chase the player during warning', () => {
  for (const index of [0, 2]) {
    const g = fixture(index); g.updateBoss(1 / 120);
    const xs = g.bossTelegraphs.map(m => m.x);
    g.p.x = g.boss.arena[1] - 60; ticks(g, .8);
    A.deepEqual(g.bossTelegraphs.map(m => m.x), xs);
  }
});
test('low-HP roots stay bounded and leave a walkable safe lane at arena edges', () => {
  for (const mode of ['story', 'rush']) for (const edge of [0, 1]) {
    const g = fixture(0, 'veteran', mode, 1), a = g.boss.arena;
    g.p.x = edge ? a[1] - 36 : a[0] + 12; g.updateBoss(1 / 120);
    const m = g.bossTelegraphs; A.ok(m.length >= 2 && m.length <= 3);
    A.ok(m.every(t => t.x - t.radius >= a[0] && t.x + t.radius <= a[1]));
    let safe = false;
    for (let x = a[0] + 20; x < a[1] - 48; x += 10)
      if (m.every(t => x + 28 <= t.x - t.radius || x >= t.x + t.radius)) safe = true;
    A.ok(safe);
  }
});
test('root and marked light inflict damage only after warning; ordinary jump clears them', () => {
  for (const index of [0, 2]) for (const jump of [false, true]) {
    const g = fixture(index); g.step(1 / 120, {}); const hp = g.p.hp;
    ticks(g, .8, 1 / 120, true);
    A.equal(g.p.hp, hp);
    if (jump) g.step(1 / 120, { jumpPressed: true, jumpHeld: true });
    ticks(g, .23, 1 / 120, true, { jumpHeld: jump });
    A.equal(g.p.hp < hp, !jump);
  }
});
test('forge wave has a warned origin/direction and can be jumped', () => {
  for (const jump of [false, true]) {
    const g = fixture(1); g.step(1 / 120, {});
    const m = g.bossTelegraphs[0]; A.equal(m.kind, 'groundwave'); A.equal(m.direction, 1);
    g.p.x = m.x + 32; const hp = g.p.hp;
    ticks(g, .8, 1 / 120, true);
    A.equal(g.p.hp, hp);
    if (jump) g.step(1 / 120, { jumpPressed: true, jumpHeld: true });
    ticks(g, .30, 1 / 120, true, { jumpHeld: jump });
    A.equal(g.p.hp < hp, !jump);
  }
});
test('Warden alternates marked roots with warned direction-locked charge, then recovers', () => {
  const g = fixture(); g.boss.attackIx = 1; g.updateBoss(1 / 120);
  A.equal(g.boss.move, 'charge'); A.equal(g.bossTelegraphs[0].kind, 'charge');
  const x = g.boss.x, dir = g.boss.dir;
  g.p.x = g.boss.arena[1] - 50; ticks(g, .8); A.equal(g.boss.x, x); A.equal(g.boss.dir, dir);
  ticks(g, .2); A.notEqual(g.boss.x, x);
  ticks(g, .7); A.equal(g.boss.state, 'recover'); A.equal(g.shots.length, 0);
});
test('successful frontal charge guard cancels attack and preserves core stagger window', () => {
  const g = fixture(); g.boss.attackIx = 1; g.updateBoss(1 / 120);
  ticks(g, .96); g.p.x = g.boss.x + 20; g.p.face = 1; g.p.parry = .19;
  // Frontal source, through core's actual hurt/guard contract.
  const hp = g.p.hp; g.hurt(22, g.p.x + 50); A.equal(g.p.hp, hp);
  A.equal(g.boss.state, 'recover'); g.updateBoss(1 / 120);
  A.deepEqual(g.bossTelegraphs, []); A.ok(g.boss.stun > 0);
});
test('stagger cancels pending forge volley but preserves reflected hero shots', () => {
  const g = fixture(1); g.updateBoss(1 / 120); ticks(g, .96);
  A.equal(g.shots.length, 1); const shot = g.shots[0]; shot.owner = 'hero'; shot.reflected = true;
  g.boss.state = 'recover'; g.boss.t = .8; g.boss.stun = .12;
  g.updateBoss(1 / 120); ticks(g, .7);
  A.equal(g.events.filter(e => e.type === 'guardianAttack').length, 1);
  A.ok(g.shots.includes(shot)); A.deepEqual(g.bossTelegraphs, []);
});
test('no effects after death, inactive arena, menu, won or boss victory', () => {
  for (const reason of ['dead', 'menu', 'won', 'inactive', 'victory']) {
    const g = fixture(2); g.updateBoss(1 / 120);
    if (reason === 'inactive') g.bossActive = false;
    else if (reason === 'victory') g.damageEnemy(g.boss, g.boss.hp);
    else g.status = reason;
    const before = allState(g); ticks(g, 4);
    A.equal(allState(g), before); A.deepEqual(g.bossTelegraphs, []);
  }
});
test('lethal first marked light prevents later scheduled volley in full simulation', () => {
  const g = fixture(2); g.p.hp = 1;
  ticks(g, 1.1, 1 / 120, true); A.equal(g.status, 'dead');
  A.equal(g.progress.stats.deaths, 1);
  const before = allState(g); ticks(g, 3, 1 / 120, true); A.equal(allState(g), before);
  A.equal(g.events.filter(e => e.type === 'guardianAttack').length, 1);
});
test('victory during warning emits original reward once, no pending attack', () => {
  const g = fixture(); g.updateBoss(1 / 120); const gold = g.progress.gold;
  g.damageEnemy(g.boss, g.boss.hp); const after = g.progress.gold;
  A.ok(after > gold); A.ok(g.has('defeated', LEVELS[0].boss.id));
  g.damageEnemy(g.boss, 999); ticks(g, 3);
  A.equal(g.progress.gold, after); A.equal(g.events.filter(e => e.type === 'bossVictory').length, 1);
  A.equal(g.events.filter(e => e.type === 'guardianAttack').length, 0);
  A.ok(EW.validateSave(g.snapshot(), LEVELS));
});
test('invalid dt is inert; core stun pauses encounter schedule', () => {
  const g = fixture(1); g.updateBoss(1 / 120); const before = allState(g);
  for (const dt of [0, -1, NaN, Infinity, 2]) g.updateBoss(dt); A.equal(allState(g), before);
  const remaining = g.bossTelegraphs[0].remaining;
  g.boss.stun = .5; ticks(g, .25); A.equal(g.bossTelegraphs[0].remaining, remaining);
});
test('reload/respawn uses fresh encounter state, not pending previous warning', () => {
  const g = fixture(); g.updateBoss(1 / 120); const old = g.boss;
  g.respawn(); A.notEqual(g.boss, old); A.deepEqual(g.bossTelegraphs, []); A.equal(g.shots.length, 0);
  A.ok(EW.validateSave(g.snapshot(), LEVELS));
});
test('deterministic full-step replay across all difficulties, modes and bosses', () => {
  for (const mode of ['story', 'rush']) for (const difficulty of ['story', 'adventure', 'veteran']) for (const index of [0, 1, 2]) {
    function run() {
      const g = fixture(index, difficulty, mode, 1);
      for (let i = 0; i < 900; i++) g.step(1 / 120, { jumpPressed: i % 120 === 80, jumpHeld: i % 120 >= 80 });
      return allState(g);
    }
    A.equal(run(), run());
  }
});

test('hero-shot victory invalidates stale same-frame guardian shots before they hurt', () => {
  const g = fixture(2); g.updateBoss(1 / 120); const hp = g.p.hp;
  const hostile = { owner: 'enemy', x: g.p.x + 14, y: g.p.y + 27, vx: 0, vy: 0, r: 24, life: 1, dmg: 99, wave: true, encounterBossId: g.boss.id };
  g.shots.push({ owner: 'hero', x: g.boss.x + 48, y: g.boss.y + 60, vx: 0, vy: 0, r: 8, life: 1, dmg: g.boss.hp }, hostile);
  g.step(1 / 120, {});
  A.equal(g.boss.hp, 0); A.equal(g.p.hp, g.maxHP); A.ok(g.p.hp >= hp); A.equal(hostile.life, 0);
  A.equal(g.events.filter(e => e.type === 'hurt').length, 0); A.deepEqual(g.bossTelegraphs, []);
});
test('charge lethal contact is terminal, with no recovery or later attacks', () => {
  const g = fixture(); g.boss.attackIx = 1; g.updateBoss(1 / 120); ticks(g, .94);
  g.p.hp = 1; g.p.x = g.boss.x + 20; g.p.inv = 0;
  g.step(1 / 120, {}); g.step(1 / 120, {});
  A.equal(g.status, 'dead'); const before = allState(g); ticks(g, 2, 1 / 120, true);
  A.equal(allState(g), before); A.equal(g.events.filter(e => e.type === 'guardianRecovery').length, 0);
});
