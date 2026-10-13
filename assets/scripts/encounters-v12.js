/* EMBERWAKE — deterministic guardian encounter slice; no persistent schema changes. */
(function (root) {
  'use strict';
  const VERSION = '1.2.0-encounters.1';
  const TIMING = Object.freeze({ warning: .95, storyWarning: 1.15, recovery: 1.35, idle: .85, charge: .65 });
  function install(EW) {
    if (!EW || !EW.Game) throw new Error('Load Emberwake engine and core before encounters-v12.');
    if (EW.Encounters && EW.Encounters.version === VERSION) return EW.Encounters;
    const G = EW.Game.prototype, previous = G.updateBoss, previousDamage = G.damageEnemy, states = new WeakMap();
    const supported = e => e && ['warden', 'forge', 'regent'].includes(e.type);
    const live = g => g.status === 'playing' && g.p && g.progress && g.bossActive && g.boss && g.boss.hp > 0;
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    function read(g) {
      if (!live(g)) return Object.freeze([]);
      const s = states.get(g.boss);
      if (!s || !['windup', 'attack', 'charge'].includes(g.boss.state)) return Object.freeze([]);
      return Object.freeze(s.marks.map(m => Object.freeze({
        bossId: g.boss.id, kind: m.kind, x: m.x, y: m.y, radius: m.radius,
        direction: m.direction || 0, endX: clamp(m.x + (m.kind === 'groundwave' ? m.direction * 154 : m.kind === 'charge' ? m.direction * 247 : 0), g.boss.arena[0] + m.radius, g.boss.arena[1] - m.radius),
        warningDuration: m.fireAt, activeDuration: m.endAt - m.fireAt, phase: s.age < m.fireAt ? 'warning' : s.age < m.endAt ? 'active' : 'spent',
        remaining: Math.max(0, m.fireAt - s.age), activeRemaining: Math.max(0, m.endAt - Math.max(s.age, m.fireAt))
      })).filter(m => m.phase !== 'spent'));
    }
    function cancel(g, s) {
      s.marks = []; s.cancelled = true;
      // Reflected shots are the player's; a stagger must not delete earned reflection damage.
      for (const p of g.shots) if (p.owner === 'enemy' && p.encounterBossId === g.boss.id) p.life = 0;
      g.shots = g.shots.filter(p => !(p.owner === 'enemy' && p.encounterBossId === g.boss.id));
    }
    function recover(g, s) {
      cancel(g, s); g.boss.state = 'recover'; g.boss.t = TIMING.recovery;
      g.emit('guardianRecovery', { bossId: g.boss.id, duration: TIMING.recovery });
    }
    function begin(g) {
      const e = g.boss, a = e.arena, w = a[1] - a[0];
      const warning = g.progress.difficulty === 'story' ? TIMING.storyWarning : TIMING.warning;
      const target = clamp(g.p.x + g.p.w / 2, a[0] + 48, a[1] - 48);
      e.attackIx = (e.attackIx || 0) + 1;
      const s = { age: 0, marks: [], cancelled: false, duration: 0 };
      const add = (kind, x, radius, delay, life, direction = 0) => s.marks.push({
        kind, x, y: 570, radius, direction, fireAt: warning + delay, endAt: warning + delay + life, fired: false
      });
      if (e.type === 'warden' && e.attackIx % 2 === 0) {
        e.move = 'charge'; e.dir = target < e.x + e.w / 2 ? -1 : 1;
        add('charge', e.x + e.w / 2, e.w / 2, 0, TIMING.charge, e.dir);
      } else if (e.type === 'warden') {
        e.move = 'root-lanes';
        const offsets = e.phase ? [-110, 0, 110] : [0, 110];
        for (const offset of offsets) {
          const x = clamp(target + offset, a[0] + 48, a[1] - 48);
          if (!s.marks.some(m => Math.abs(m.x - x) < 52)) add('root', x, 24, 0, .35);
        }
      } else if (e.type === 'forge') {
        e.move = 'forge-waves';
        // Two independently marked launches; never a surprise second volley.
        add('groundwave', a[0] + w * .25, 13, 0, .55, 1);
        add('groundwave', a[0] + w * .75, 13, .65, .55, -1);
      } else {
        e.move = 'marked-light';
        add('light', target, 28, 0, .25);
        add('light', clamp(target + (target < (a[0] + a[1]) / 2 ? 150 : -150), a[0] + 48, a[1] - 48), 28, .65, .25);
      }
      s.duration = Math.max(...s.marks.map(m => m.endAt)) + 1 / 60;
      e.state = 'windup'; e.t = warning; e.target = target; states.set(e, s);
      g.emit('warning', { move: e.move, bossId: e.id, duration: warning, telegraphs: read(g) });
    }
    function fire(g, s, m) {
      const e = g.boss; m.fired = true;
      g.emit('guardianAttack', { bossId: e.id, kind: m.kind, x: m.x, y: m.y });
      if (m.kind === 'charge') { e.state = 'charge'; e.vx = e.dir * 380; return; }
      g.shots.push({ owner: 'enemy', x: m.x, y: m.y,
        vx: m.kind === 'groundwave' ? m.direction * 280 : 0, vy: 0,
        r: m.radius, life: m.endAt - m.fireAt, dmg: m.kind === 'root' ? 16 : 18,
        wave: true, encounterBossId: e.id, encounterKind: m.kind });
      g.emit('slam', { x: m.x, y: 590 });
    }
    G.updateBoss = function (dt) {
      if (!Number.isFinite(dt) || dt <= 0 || dt > 1 || !live(this)) return;
      if (!supported(this.boss)) { previous.call(this, dt); return; }
      dt = Math.min(dt, 1 / 60);
      const e = this.boss, a = e.arena;
      e.flash = Math.max(0, e.flash - dt); e.phase = e.hp < e.maxHp * .45 ? 1 : 0;
      e.x = clamp(e.x, a[0] + 8, a[1] - e.w - 8);
      let s = states.get(e);
      // core-v11's successful guard changes state to recover and may set stun.
      if (s && e.state === 'recover' && !s.cancelled) cancel(this, s);
      if (e.stun > 0) { e.stun = Math.max(0, e.stun - dt); return; }
      if (e.state === 'recover') {
        e.t -= dt;
        if (e.t <= 0) { e.state = 'idle'; e.t = TIMING.idle; states.delete(e); }
        return;
      }
      if (e.state === 'idle' || !s) {
        e.face = this.p.x + this.p.w / 2 < e.x + e.w / 2 ? -1 : 1;
        e.t -= dt;
        if (e.t <= 0) begin(this);
        return;
      }
      s.age += dt; e.t = Math.max(0, s.marks[0].fireAt - s.age);
      if (s.age >= s.marks[0].fireAt && e.state === 'windup') e.state = 'attack';
      for (const m of s.marks) if (!m.fired && s.age + 1e-10 >= m.fireAt) fire(this, s, m);
      if (e.state === 'charge') {
        e.x = clamp(e.x + e.vx * dt, a[0] + 8, a[1] - e.w - 8);
        if (EW.Physics.overlaps(this.p, e)) this.hurt(22, e.x + e.w / 2);
        if (!live(this)) return;
        if (e.state === 'recover') { cancel(this, s); return; }
      }
      if (s.age + 1e-10 >= s.duration) recover(this, s);
    };
    G.damageEnemy = function (enemy, damage, kind) {
      const boss = this.boss, wasLiving = enemy === boss && boss && boss.hp > 0;
      const pending = wasLiving ? this.shots.slice() : [];
      const result = previousDamage.call(this, enemy, damage, kind);
      if (wasLiving && boss.hp <= 0) {
        // The engine may still be iterating an old shots array when a hero shot wins.
        // Invalidate those hostile objects as well as removing them from the live array.
        for (const p of pending) if (p.owner === 'enemy' && p.encounterBossId === boss.id) p.life = 0;
        const s = states.get(boss); if (s) { s.marks = []; s.cancelled = true; }
      }
      return result;
    };
    Object.defineProperty(G, 'bossTelegraphs', { configurable: true, get() { return read(this); } });
    const api = Object.freeze({ version: VERSION, timing: TIMING, telegraphs: read, install });
    EW.Encounters = api;
    return api;
  }
  const api = root.EW ? install(root.EW) : Object.freeze({ version: VERSION, timing: TIMING, install });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
