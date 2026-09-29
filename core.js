/* Original human-agility game mechanics. No rendering or browser dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AgilityCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ARC = Math.PI * 6;
  const LENGTH = 42 + ARC + 36 + ARC + 36 + ARC + 42;
  const SECOND = 42 + ARC, THIRD = SECOND + 36 + ARC, FOURTH = THIRD + 36 + ARC;
  const COURSE = [
    { id: 0, type: 'hurdle', name: 'Opening hurdle', s: 12, length: 0, action: 'JUMP' },
    { id: 1, type: 'hoop', name: 'Ring jump', s: 25, length: 0, action: 'JUMP' },
    { id: 2, type: 'tunnel', name: 'Low tunnel', s: 33, length: 5, action: 'DUCK' },
    { id: 3, type: 'slalom', name: 'Weave poles', s: SECOND + 4, length: 12, action: 'WEAVE' },
    { id: 4, type: 'hurdle', name: 'Back-straight hurdle', s: SECOND + 26, length: 0, action: 'JUMP' },
    { id: 5, type: 'ramp', name: 'A-frame climb', s: THIRD + 4, length: 10, action: 'BALANCE' },
    { id: 6, type: 'tunnel', name: 'Sprint tunnel', s: THIRD + 24, length: 5, action: 'DUCK' },
    { id: 7, type: 'seesaw', name: 'Balance bridge', s: FOURTH + 3, length: 10, action: 'BALANCE' },
    { id: 8, type: 'slalom', name: 'Final weave', s: FOURTH + 17, length: 12, action: 'WEAVE' },
    { id: 9, type: 'hurdle', name: 'Finish-line hurdle', s: FOURTH + 35, length: 0, action: 'JUMP' }
  ].map(o => Object.freeze(o));
  Object.freeze(COURSE);

  function sample(distance, lateral = 0) {
    let s = clamp(distance, 0, LENGTH), x, z, dx, dz;
    if (s <= 42) { x = -18; z = -24 + s; dx = 0; dz = 1; }
    else if ((s -= 42) <= ARC) {
      const a = Math.PI - s / 6; x = -12 + 6 * Math.cos(a); z = 18 + 6 * Math.sin(a); dx = Math.sin(a); dz = -Math.cos(a);
    } else if ((s -= ARC) <= 36) { x = -6; z = 18 - s; dx = 0; dz = -1; }
    else if ((s -= 36) <= ARC) {
      const a = Math.PI + s / 6; x = 6 * Math.cos(a); z = -18 + 6 * Math.sin(a); dx = -Math.sin(a); dz = Math.cos(a);
    } else if ((s -= ARC) <= 36) { x = 6; z = -18 + s; dx = 0; dz = 1; }
    else if ((s -= 36) <= ARC) {
      const a = Math.PI - s / 6; x = 12 + 6 * Math.cos(a); z = 18 + 6 * Math.sin(a); dx = Math.sin(a); dz = -Math.cos(a);
    } else { s -= ARC; x = 18; z = 18 - s; dx = 0; dz = -1; }
    return { x: x + dz * lateral, z: z - dx * lateral, dx, dz, angle: Math.atan2(dx, dz) };
  }
  function activeObstacle(r) { return COURSE.find(o => r.s >= o.s - 0.45 && r.s <= o.s + o.length + 0.45) || null; }
  function nextObstacle(r) { return COURSE.find(o => o.s + o.length + 0.45 >= r.s) || null; }
  function rampHeight(s) {
    for (const o of COURSE) {
      if ((o.type === 'ramp' || o.type === 'seesaw') && s >= o.s && s <= o.s + o.length) {
        const t = (s - o.s) / o.length;
        return o.type === 'ramp' ? (1 - Math.abs(t * 2 - 1)) * 2.15 : Math.sin(t * Math.PI) * 1.1;
      }
    }
    return 0;
  }
  function poleTarget(index) { return index % 2 === 0 ? -0.84 : 0.84; }
  function poleCount(o) { return Math.round(o.length / 2); }
  function poleS(o, i) { return o.s + 1 + i * 2; }
  function makeRacer(id, name, color, speedScale) {
    return { id, name, color, speedScale, s: 0, lateral: 0, jump: 0, vy: 0, energy: 1,
      speed: 0, running: 0, duck: false, boosting: false, stumble: 0, faults: 0,
      penalties: 0, elapsed: 0, finishTime: null, finished: false, cleared: 0,
      faulted: new Set(), checked: new Set(), event: null, eventTTL: 0 };
  }
  function fault(r, o, reason) {
    if (r.faulted.has(o.id)) return;
    r.faulted.add(o.id); r.faults++; r.penalties += 3; r.stumble = 0.65;
    r.energy = Math.max(0, r.energy - 0.08); r.event = reason + ' · +3s'; r.eventTTL = 2;
  }
  function aiInput(r, perfect = false) {
    const o = nextObstacle(r), input = { steer: 0, jump: false, duck: false, sprint: false };
    if (!o) { input.sprint = r.energy > 0.15; return input; }
    const d = o.s - r.s;
    if (o.type === 'hurdle' || o.type === 'hoop') {
      input.jump = d > 0 && d < Math.max(1.65, r.speed * 0.30) && r.jump === 0;
      // Rivals differ in consistency, not just appearance. The player's training autopilot is perfect.
      if (!perfect && r.id === 3 && o.id === 4) input.jump = false;
    }
    input.duck = o.type === 'tunnel' && d < 1.7 && r.s <= o.s + o.length + 0.55;
    if (o.type === 'slalom' && d < 3) {
      let i = 0;
      while (i < poleCount(o) && poleS(o, i) < r.s - 0.01) i++;
      const target = i < poleCount(o) ? poleTarget(i) : 0;
      const error = target - r.lateral;
      input.steer = Math.abs(error) < 0.035 ? 0 : clamp(error * 4.5, -1, 1);
      input.holdLine = Math.abs(error) < 0.035;
    }
    const technical = ['tunnel', 'slalom', 'ramp', 'seesaw'].includes(o.type) && d < 3;
    input.sprint = !technical && r.energy > (perfect ? 0.16 : 0.30 + r.id * 0.05);
    return input;
  }
  function stepRacer(r, input, dt, clock) {
    if (r.finished) { r.speed = 0; return; }
    r.eventTTL = Math.max(0, r.eventTTL - dt);
    r.stumble = Math.max(0, r.stumble - dt);
    const active = activeObstacle(r);
    const tunnelRecovery = active && active.type === 'tunnel' && r.faulted.has(active.id);
    r.duck = Boolean(input.duck || tunnelRecovery);
    const steer = clamp(Number(input.steer) || 0, -1, 1);
    if (Math.abs(steer) > 0.01) r.lateral = clamp(r.lateral + steer * 4.4 * dt, -1.52, 1.52);
    else if (!input.holdLine) r.lateral *= Math.exp(-7 * dt);
    if (input.jump && !r.duck && r.jump <= 0 && r.stumble <= 0) { r.vy = 7.3; r.jump = 0.001; }
    if (r.jump > 0 || r.vy > 0) { r.vy -= 19 * dt; r.jump = Math.max(0, r.jump + r.vy * dt); if (r.jump === 0) r.vy = 0; }
    r.boosting = Boolean(input.sprint && !r.duck && r.energy > 0.015 && r.stumble === 0);
    r.energy = clamp(r.energy + (r.boosting ? -0.23 : 0.115) * dt, 0, 1);
    let speed = (r.boosting ? 8.0 : 5.35) * r.speedScale;
    if (r.duck) speed *= 0.58;
    if (active && active.type === 'slalom') speed = Math.min(speed, 4.1 * r.speedScale);
    if (active && ['ramp', 'seesaw'].includes(active.type)) speed *= 0.82;
    if (r.stumble > 0) speed *= 0.24;
    r.speed = speed;
    const previous = r.s; r.s = Math.min(LENGTH, r.s + speed * dt); r.running += speed * dt;
    r.elapsed = clock;
    for (const o of COURSE) {
      if (o.type === 'hurdle' || o.type === 'hoop') {
        if (previous < o.s && r.s >= o.s) {
          if (r.jump < 0.68 || (o.type === 'hoop' && r.jump > 1.65) || Math.abs(r.lateral) > 1.12) fault(r, o, 'Missed jump');
        }
      } else if (o.type === 'tunnel') {
        if (r.s >= o.s && previous <= o.s + o.length && (!r.duck || r.jump > 0.25 || Math.abs(r.lateral) > 0.88)) fault(r, o, 'Tunnel contact');
      } else if (o.type === 'slalom') {
        for (let i = 0; i < poleCount(o); i++) {
          const at = poleS(o, i), key = o.id + ':' + i;
          if (previous < at && r.s >= at && !r.checked.has(key)) {
            r.checked.add(key);
            if (r.lateral * Math.sign(poleTarget(i)) < 0.38) fault(r, o, 'Missed weave');
          }
        }
      } else if (r.s >= o.s + 0.8 && previous <= o.s + o.length - 0.8 && (Math.abs(r.lateral) > 0.72 || r.jump > 0.2)) fault(r, o, 'Lost balance');
    }
    r.cleared = COURSE.filter(o => r.s > o.s + o.length + 0.4).length;
    if (r.s >= LENGTH) {
      const overshootTime = Math.max(0, previous + speed * dt - LENGTH) / speed;
      r.elapsed = clock - overshootTime; r.finishTime = r.elapsed + r.penalties; r.finished = true; r.cleared = COURSE.length;
      r.jump = 0; r.vy = 0; r.duck = false; r.boosting = false; r.speed = 0;
    }
  }
  class Race {
    constructor() { this.reset(); }
    reset() {
      this.state = 'menu'; this.previousState = null; this.countdown = 3; this.time = 0;
      this.racers = [makeRacer(0, 'YOU', '#f87843', 1), makeRacer(1, 'LEO', '#45d6cc', 0.97), makeRacer(2, 'MAX', '#8c9cff', 0.92), makeRacer(3, 'ARI', '#ed87bd', 0.88)];
    }
    start() { this.reset(); this.state = 'countdown'; }
    pause() { if (this.state === 'racing' || this.state === 'countdown') { this.previousState = this.state; this.state = 'paused'; } }
    resume() { if (this.state === 'paused') { this.state = this.previousState; this.previousState = null; } }
    advance(dt, input = {}) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 0.1);
      if (this.state === 'countdown') { this.countdown -= dt; if (this.countdown <= 0) this.state = 'racing'; return; }
      if (this.state !== 'racing') return;
      this.time += dt;
      for (const r of this.racers) stepRacer(r, r.id === 0 ? input : aiInput(r), dt, this.time);
      if (this.racers.every(r => r.finished)) this.state = 'finished';
    }
    standings() {
      return [...this.racers].sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        return b.s - a.s;
      });
    }
    snapshot() {
      return { state: this.state, time: this.time, countdown: this.countdown, length: LENGTH,
        racers: this.racers.map(r => ({ id: r.id, name: r.name, s: r.s, lateral: r.lateral, jump: r.jump, energy: r.energy, speed: r.speed, duck: r.duck, faults: r.faults, penalties: r.penalties, cleared: r.cleared, finished: r.finished, finishTime: r.finishTime })) };
    }
  }
  return Object.freeze({ Race, COURSE, LENGTH, sample, rampHeight, nextObstacle, activeObstacle, poleTarget, poleCount, poleS, aiInput, clamp });
});
