// YO-KA-MURAI - the game simulation. Runs on one machine (the host, or locally vs AI).
// Everything visual it wants to happen (sounds, sparks, banners, shake) is pushed to state.events for the renderer.
'use strict';
const Sim = {};
(function () {
  const { W, H } = WORLD;
  const DT = 1 / 60;
  Sim.DT = DT;
  const SPEC_KINDS_HOLD = { charge: 1, hand: 1, tunnel: 1 };

  Sim.create = function (opts) {
    // opts: {fighters:[{id, ctrl}], arena}
    const st = {
      t: 0, round: 0, wins: [0, 0], phase: 'intro', phaseT: 0, timer: WORLD.ROUND_TIME,
      fighters: [], decoys: [], projs: [], objs: [], zones: [], decals: [], events: [], marks: [], pending: [], freeze: 0, slowmo: 0,
      clash: null, lastClash: -99, arenaId: opts.arena, arena: ARENAS[opts.arena], nextId: 1, winner: -1, roundWinner: -1,
    };
    const built = st.arena.build();
    for (const o of built.obstacles) st.objs.push(Object.assign({ id: st.nextId++, alive: true, solid: true, blocksProj: true, blocksLOS: false, cutOnly: false, maxHp: o.hp }, o));
    for (const z of built.zones) st.zones.push(Object.assign({ t: Infinity }, z));
    st.cliffs = built.cliffs || [];
    opts.fighters.forEach((fo, i) => st.fighters.push(makeFighter(st, fo.id, i)));
    startRound(st);
    return st;
  };

  function makeFighter(st, id, i) {
    const def = FIGHTERS[id], sz = SIZES[def.size];
    return {
      i, team: i, id, def, sz, tier: TIERS[def.tier], r: WORLD.BASE_R * sz.hit, speed: WORLD.BASE_SPEED * sz.speed, maxHp: sz.hp, hp: sz.hp,
      x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0, face: i === 0 ? 0 : Math.PI, moving: false,
      cd: { a: 0, b: 0, s: 0 }, act: null, stun: 0, hitstun: 0, slow: 0, slowMul: 1, root: 0, guard: 0, guardHit: false, armour: 0,
      spec: null, under: false, hidden: 0, hitFlash: 0, anim: 0, combo: 0, lastHitBy: -1,
      input: { mx: 0, my: 0, a: false, b: false, s: false }, prev: { a: false, b: false, s: false },
      stats: { dmg: 0, parries: 0, clashes: 0 }, ko: false,
    };
  }

  function spawnPos(f) {
    const left = f.i % 2 === 0;
    return { x: left ? 130 + f.r * 0.5 : W - 130 - f.r * 0.5, y: H / 2 };
  }

  function resetFighter(f) {
    const p = spawnPos(f); f.x = p.x; f.y = p.y; f.vx = f.vy = f.z = f.vz = 0; f.hp = f.maxHp; f.face = f.i % 2 === 0 ? 0 : Math.PI;
    f.cd = { a: 0, b: 0, s: 0 }; f.act = null; f.stun = f.hitstun = f.slow = f.root = f.guard = 0; f.slowMul = 1; f.spec = null; f.under = false; f.ko = false; f.combo = 0; f.hidden = 0;
  }

  function startRound(st) {
    st.round++; st.phase = 'intro'; st.phaseT = 0; st.timer = WORLD.ROUND_TIME; st.clash = null; st.roundWinner = -1;
    st.projs.length = 0; st.decoys.length = 0; st.marks.length = 0; st.pending.length = 0;
    st.zones = st.zones.filter(z => z.kind !== 'trail');
    for (const f of st.fighters) resetFighter(f);
    ev(st, { type: 'banner', text: 'ROUND ' + st.round, color: '#f3e6d0', big: true });
    ev(st, { type: 'sfx', name: 'gong' });
  }

  const ev = (st, e) => st.events.push(e);
  Sim.ev = ev;
  const sfx = (st, name, x, y, vol) => ev(st, { type: 'sfx', name, x, y, vol });
  const fx = (st, kind, x, y, extra) => ev(st, Object.assign({ type: 'fx', kind, x, y }, extra || {}));

  // ---------- public step ----------
  Sim.step = function (st, inputs) {
    st.fighters.forEach((f, i) => { if (inputs[i]) f.input = inputs[i]; });
    let dt = DT;
    if (st.freeze > 0) { st.freeze -= dt; for (const f of st.fighters) f.prev = { a: f.input.a, b: f.input.b, s: f.input.s }; return; }
    if (st.slowmo > 0) { st.slowmo -= dt; dt *= 0.35; }
    st.t += dt; st.phaseT += dt;

    if (st.phase === 'intro') {
      if (st.phaseT > 1.1 && !st.fightCalled) { st.fightCalled = true; ev(st, { type: 'banner', text: 'FIGHT!', color: '#e8483b', big: true }); sfx(st, 'drum'); }
      if (st.phaseT > 1.6) { st.phase = 'fight'; st.phaseT = 0; st.fightCalled = false; }
      for (const f of st.fighters) { physics(st, f, dt, false); f.prev = { a: f.input.a, b: f.input.b, s: f.input.s }; }
      return;
    }
    if (st.phase === 'fight') {
      st.timer -= dt;
      if (st.timer <= 0) { st.timer = 0; timeUp(st); }
    }
    const live = st.phase === 'fight';

    if (st.clash) updateClash(st, dt);
    for (const f of st.fighters) updateFighter(st, f, dt, live && !st.clash);
    updateDecoys(st, dt);
    updateProjs(st, dt);
    for (const z of st.zones) z.t -= dt;
    for (const m of st.marks) m.t -= dt; st.marks = st.marks.filter(m => m.t > 0);
    st.zones = st.zones.filter(z => z.t > 0);
    separate(st);
    if (st.pending.length && st.phase === 'fight') { for (const p of st.pending) p.t -= dt; const due = st.pending.filter(p => p.t <= 0); st.pending = st.pending.filter(p => p.t > 0); for (const p of due) p.fn(); }

    if (st.phase === 'fight') {
      const dead = st.fighters.filter(f => f.hp <= 0);
      if (dead.length) {
        for (const f of dead) { f.ko = true; f.act = null; f.spec = null; f.under = false; }
        const alive = st.fighters.filter(f => f.hp > 0);
        st.roundWinner = alive.length === 1 ? alive[0].i : -1;
        st.phase = 'ko'; st.phaseT = 0; st.slowmo = 1.0; st.clash = null;
        ev(st, { type: 'banner', text: 'KNOCKOUT!', color: '#ffd23f', big: true });
        ev(st, { type: 'crowd', amt: 1, cut: true }); sfx(st, 'ko'); sfx(st, 'cheer');
        ev(st, { type: 'shake', amt: 14 });
      }
    } else if (st.phase === 'ko' || st.phase === 'time') {
      if (st.phaseT > 2.4) endRound(st);
    } else if (st.phase === 'roundEnd') {
      if (st.phaseT > 1.2) startRound(st);
    }
  };

  function timeUp(st) {
    const [a, b] = st.fighters, pa = a.hp / a.maxHp, pb = b.hp / b.maxHp;
    st.roundWinner = Math.abs(pa - pb) < 0.001 ? (a.stats.dmg === b.stats.dmg ? -1 : (a.stats.dmg > b.stats.dmg ? 0 : 1)) : (pa > pb ? 0 : 1);
    st.phase = 'time'; st.phaseT = 0;
    ev(st, { type: 'banner', text: 'TIME!', color: '#f3e6d0', big: true }); sfx(st, 'gong');
  }

  function endRound(st) {
    if (st.roundWinner >= 0) st.wins[st.roundWinner]++;
    const champ = st.wins.findIndex(w => w >= WORLD.ROUNDS_TO_WIN);
    if (champ >= 0) { st.phase = 'over'; st.winner = champ; st.phaseT = 0; ev(st, { type: 'over', winner: champ }); return; }
    st.phase = 'roundEnd'; st.phaseT = 0;
    ev(st, { type: 'banner', text: st.roundWinner >= 0 ? st.fighters[st.roundWinner].def.name.toUpperCase() + ' TAKES THE ROUND' : 'DRAW ROUND', color: '#f3e6d0' });
  }

  // ---------- fighters ----------
  function canAct(f) { return !f.ko && f.stun <= 0 && f.hitstun <= 0 && f.z <= 0 && f.root <= 0; }

  function updateFighter(st, f, dt, live) {
    const inp = f.input, pressed = k => inp[k] && !f.prev[k];
    for (const k of ['a', 'b', 's']) if (f.cd[k] > 0) f.cd[k] -= dt;
    if (f.stun > 0) f.stun -= dt;
    if (f.hitstun > 0) f.hitstun -= dt;
    if (f.root > 0) f.root -= dt;
    if (f.slow > 0) { f.slow -= dt; if (f.slow <= 0) f.slowMul = 1; }
    if (f.hitFlash > 0) f.hitFlash -= dt;
    if (f.hidden > 0) f.hidden -= dt;
    if (f.guard > 0) {
      f.guard -= dt;
      if (f.guard <= 0 && !f.guardHit) { f.root = f.def.s.whiff; }
    }
    f.anim += dt;

    if (live && !f.ko) {
      if (f.spec) updateSpecial(st, f, dt);
      else if (canAct(f) && !f.act) {
        const sdef = f.def.s;
        if (f.cd.s <= 0 && (SPEC_KINDS_HOLD[sdef.kind] ? inp.s && !f.prev.s : pressed('s'))) startSpecial(st, f);
        else if (inp.a && f.cd.a <= 0) startAttack(st, f, 'a');
        else if (inp.b && f.cd.b <= 0) startAttack(st, f, 'b');
      }
      if (f.act) updateAction(st, f, dt);
    }
    physics(st, f, dt, live);
    f.prev = { a: inp.a, b: inp.b, s: inp.s };
  }

  function moveMul(st, f) {
    let m = f.slowMul;
    if (f.act) m *= f.act.def.moveMul !== undefined ? f.act.def.moveMul : 0.35;
    if (f.spec && f.spec.moveMul !== undefined) m *= f.spec.moveMul;
    const onBridge = st.zones.some(z => z.kind === 'bridge' && Math.abs(f.x - z.x) < z.w / 2 && Math.abs(f.y - z.y) < z.h / 2);
    for (const z of st.zones) {
      if (z.kind === 'bridge') continue;
      if (z.rx) { const ex = (f.x - z.x) / z.rx, ey = (f.y - z.y) / z.ry; if (ex * ex + ey * ey > 1 || onBridge) continue; }
      else if (Math.hypot(f.x - z.x, f.y - z.y) > z.r + f.r * 0.3) continue;
      if (z.kind === 'pond') m *= f.id === 'kappa' ? 1.15 : 0.6;
      if (z.kind === 'trail') m *= z.owner === f.i ? 1.5 : 0.7;
    }
    return m;
  }

  function physics(st, f, dt, live) {
    // steering
    const inp = f.input; let mx = inp.mx || 0, my = inp.my || 0; const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    const free = live && canAct(f) && !f.ko && !(f.spec && f.spec.noMove) && !(f.act && f.act.def.noMove);
    f.moving = false;
    if (ml > 0.18 && !f.ko && (f.stun <= 0) && (f.hitstun <= 0) && f.z <= 0) {
      const aimLocked = f.act && f.act.t < (f.act.def.windup || 0) + (f.act.def.active || 0);
      if (!aimLocked && !(f.spec && f.spec.lockFace)) f.face = Math.atan2(my, mx);
    }
    if (free && ml > 0.18) {
      const sp = f.speed * moveMul(st, f);
      f.x += mx * sp * dt; f.y += my * sp * dt; f.moving = true;
    }
    // knockback velocity
    f.x += f.vx * dt; f.y += f.vy * dt;
    const decay = Math.exp(-7 * dt); f.vx *= decay; f.vy *= decay;
    if (Math.abs(f.vx) < 2) f.vx = 0; if (Math.abs(f.vy) < 2) f.vy = 0;
    // airborne (knock-up)
    if (f.z > 0 || f.vz > 0) {
      f.vz -= 1400 * dt; f.z += f.vz * dt;
      if (f.z <= 0) { f.z = 0; f.vz = 0; fx(st, 'dust', f.x, f.y, { n: 6, r: f.r }); sfx(st, 'thud', f.x, f.y, 0.5); }
    }
    // obstacles
    if (!f.under) for (const o of st.objs) {
      if (!o.alive || !o.solid) continue;
      const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy), min = f.r + o.r;
      if (d < min && d > 0.001) {
        f.x = o.x + dx / d * min; f.y = o.y + dy / d * min;
        const sp = Math.hypot(f.vx, f.vy);
        if (sp > 320 && o.kind !== 'bamboo') { damageObj(st, o, 1, Math.atan2(f.vy, f.vx), null); }
      }
    }
    bounds(st, f);
  }

  function bounds(st, f) {
    const m = f.r * 0.6;
    const kbFast = Math.hypot(f.vx, f.vy) > 180;
    for (const c of st.cliffs) {
      // c: {side:'top'|'bottom', x0, x1}
      const out = c.side === 'top' ? f.y < 6 : f.y > H - 6;
      if (out && f.x > c.x0 && f.x < c.x1 && kbFast && !f.ko && st.phase === 'fight') { ringOut(st, f); return; }
    }
    f.x = U.clamp(f.x, m, W - m); f.y = U.clamp(f.y, m, H - m);
  }

  function ringOut(st, f) {
    const loss = Math.round(f.maxHp * 0.25);
    fx(st, 'ringout', f.x, f.y, {}); sfx(st, 'fall', f.x, f.y);
    f.hp = Math.max(0, f.hp - loss);
    const p = spawnPos(f); f.x = p.x; f.y = p.y; f.vx = f.vy = 0; f.z = 40; f.vz = 0; f.act = null; f.spec = null; f.under = false;
    ev(st, { type: 'banner', text: 'RING OUT!', color: '#8fd3ff' }); ev(st, { type: 'crowd', amt: 0.8 }); sfx(st, 'cheer');
    ev(st, { type: 'float', x: f.x, y: f.y, text: '-' + loss, color: '#8fd3ff' });
  }

  function separate(st) {
    const list = st.fighters.filter(f => !f.under && !f.ko);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r) * 0.85;
      if (d < min) {
        const nx = d > 0.01 ? dx / d : 1, ny = d > 0.01 ? dy / d : 0, push = min - d;
        const ma = a.r * a.r, mb = b.r * b.r, ta = mb / (ma + mb), tb = ma / (ma + mb);
        a.x -= nx * push * ta; a.y -= ny * push * ta; b.x += nx * push * tb; b.y += ny * push * tb;
        bounds(st, a); bounds(st, b);
      }
    }
  }

  // ---------- targeting ----------
  // everything an attack can hit that is not on team `team`
  function targetsOf(st, team) {
    const out = [];
    for (const f of st.fighters) if (f.team !== team && !f.ko && !f.under) out.push(f);
    for (const d of st.decoys) if (d.team !== team && d.alive) out.push(d);
    return out;
  }
  Sim.targetsOf = targetsOf;

  Sim.los = function (st, ax, ay, bx, by) {
    for (const o of st.objs) if (o.alive && o.blocksLOS && U.segDist(o.x, o.y, ax, ay, bx, by) < o.r * 0.8) return false;
    return true;
  };

  function aimAssist(st, f, range) {
    let best = null, bestD = Infinity;
    for (const t of targetsOf(st, f.team)) {
      if (t.hidden > 0 && !t.decoy) continue; // Kodama hiding among its decoys
      const d = Math.hypot(t.x - f.x, t.y - f.y), a = Math.atan2(t.y - f.y, t.x - f.x);
      if (Math.abs(U.angDiff(f.face, a)) > Math.PI / 6 || d > range) continue;
      if (!Sim.los(st, f.x, f.y, t.x, t.y)) continue;
      if (d < bestD) { bestD = d; best = a; }
    }
    return best === null ? f.face : best;
  }
  Sim.aimAssist = aimAssist;

  // ---------- attacks ----------
  function startAttack(st, f, slot) {
    const def = f.def[slot];
    const reach = def.kind === 'proj' ? def.speed * def.life : (def.range || 60) + 80;
    f.face = aimAssist(st, f, reach);
    f.act = { slot, def, t: 0, dir: f.face, hit: new Set(), objHit: new Set(), fired: false, start: st.t, ticks: 0 };
    f.cd[slot] = def.cd;
    ev(st, { type: 'attack', who: f.i, slot });
    if (def.windup >= 0.15) sfx(st, 'windup', f.x, f.y, 0.4);
  }

  function updateAction(st, f, dt) {
    const a = f.act, d = a.def; a.t += dt;
    const w = d.windup || 0, act = d.active || 0, total = w + act + (d.recover || 0);
    if (a.t >= w && !a.began) {
      a.began = true;
      sfx(st, d.sfx || (d.kind === 'proj' ? 'throw' : 'swing'), f.x, f.y, f.sz.idx >= 3 ? 1 : 0.7);
      if (d.kind !== 'proj' || d.fx) fx(st, d.fx || 'slash', f.x, f.y, { dir: a.dir, range: d.range, arc: d.arc, width: d.width, shape: d.shape, who: f.i, size: f.r, color: d.color });
    }
    if (a.t >= w && a.t < w + act + dt) {
      if (d.lunge) { f.x += Math.cos(a.dir) * d.lunge * dt; f.y += Math.sin(a.dir) * d.lunge * dt; }
      if (d.kind === 'melee') meleeHits(st, f, a);
      if (d.kind === 'proj' && !a.fired) { a.fired = true; fireProj(st, f, a.dir, d); }
    }
    if (a.t >= total) f.act = null;
  }

  function inShape(f, dir, d, tx, ty, tr) {
    const dx = tx - f.x, dy = ty - f.y, dist = Math.hypot(dx, dy);
    if (d.shape === 'ring') return dist - tr <= d.range;
    if (d.shape === 'arc') {
      if (dist - tr > d.range) return false;
      if (dist < f.r + tr) return true;
      const ang = Math.abs(U.angDiff(dir, Math.atan2(dy, dx))), slack = Math.atan2(tr, Math.max(dist, 1));
      return ang <= (d.arc * Math.PI / 360) + slack;
    }
    // line
    const along = dx * Math.cos(dir) + dy * Math.sin(dir), perp = Math.abs(-dx * Math.sin(dir) + dy * Math.cos(dir));
    return along >= -tr && along <= d.range + tr && perp <= d.width / 2 + tr;
  }
  Sim.inShape = inShape;

  function meleeHits(st, f, a) {
    const d = a.def;
    for (const t of targetsOf(st, f.team)) {
      if (a.hit.has(t)) continue;
      if (!inShape(f, a.dir, d, t.x, t.y, t.r)) continue;
      a.hit.add(t);
      // blade clash: both swung M1s at each other at nearly the same moment
      if (!t.decoy && (a.slot === 'a' || a.slot === 'b') && t.act && (t.act.slot === 'a' || t.act.slot === 'b') && t.act.def.kind === 'melee'
        && Math.abs(t.act.start - a.start) < 0.1 && st.t - st.lastClash > 7 && inShape(t, t.act.dir, t.act.def, f.x, f.y, f.r)) {
        startClash(st, f, t); return;
      }
      applyHit(st, f, t, { dmg: d.dmg, kb: d.kb, dir: d.shape === 'line' ? a.dir : Math.atan2(t.y - f.y, t.x - f.x), m1: a.slot !== 's', stun: d.stun, slow: d.slow, knockup: d.knockup, pull: d.pull, hitstun: d.hitstun, heavy: d.heavy, throwIt: d.throwIt, dirAtt: a.dir });
      if (d.onHit) d.onHit(st, f, t);
    }
    for (const o of st.objs) {
      if (!o.alive || a.objHit.has(o)) continue;
      if (o.cutOnly && !d.cuts) continue;
      if (!inShape(f, a.dir, d, o.x, o.y, o.r)) continue;
      a.objHit.add(o); damageObj(st, o, d.objDmg || 1, a.dir, f);
    }
  }

  // central hit resolution. o: {dmg, kb, dir, m1, stun, slow{mul,t}, knockup, pull, hitstun, heavy, special, unparryable, proj}
  function applyHit(st, att, t, o) {
    if (t.decoy) { popDecoy(st, t); return 'decoy'; }
    if (t.ko || t.under) return 'miss';
    if (t.guard > 0 && !o.unparryable) { parry(st, t, att, o); return 'parry'; }
    const armour = (o.m1 && t.sz.idx >= 4 && att && att.sz.idx <= t.sz.idx - 2) || (t.spec && t.spec.armour && o.m1);
    const dmg = Math.round((o.dmg || 0) * (att ? att.tier.dmg : 1) * 10) / 10;
    t.hp = Math.max(0, t.hp - dmg); t.hitFlash = 0.12; t.lastHitBy = att ? att.i : -1;
    if (att) { att.stats.dmg += dmg; att.combo++; t.combo = 0; if (att.combo === 6) { ev(st, { type: 'banner', text: 'WHAT A CUT!', color: '#ffd23f' }); ev(st, { type: 'crowd', amt: 0.6 }); sfx(st, 'cheer'); } }
    // knockback scales with the size difference
    const sizeF = att ? U.clamp(1 + 0.3 * (att.sz.idx - t.sz.idx), 0.35, 2.5) : 1;
    let kb = (o.kb || 0) * t.sz.kb * sizeF; if (armour) kb *= 0.2;
    t.vx += Math.cos(o.dir) * kb; t.vy += Math.sin(o.dir) * kb;
    if (o.pull && att) { // drag toward the attacker
      const dx = att.x - t.x, dy = att.y - t.y, dd = Math.hypot(dx, dy) || 1, want = Math.max(0, dd - att.r - t.r - 6);
      const p = Math.min(o.pull, want) * (armour ? 0.2 : 1) * U.clamp(t.sz.kb, 0.3, 1.3); t.vx = dx / dd * p * 7; t.vy = dy / dd * p * 7;
    }
    if (!armour) {
      const hs = o.hitstun !== undefined ? o.hitstun : (o.m1 ? 0.14 : 0.25);
      t.hitstun = Math.max(t.hitstun, hs);
      if (t.act && !(t.spec && t.spec.armour)) t.act = null;
      if (t.spec && t.spec.breakable) endSpecial(st, t, true);
    }
    if (o.stun) { t.stun = Math.max(t.stun, o.stun * (t.sz.idx >= 4 ? 0.5 : 1)); if (t.spec && !t.spec.armour) endSpecial(st, t, true); t.act = null; }
    if (o.slow) { t.slow = Math.max(t.slow, o.slow.t); t.slowMul = Math.min(t.slowMul, o.slow.mul); }
    if (o.throwIt && !armour) { const a = o.dirAtt !== undefined ? o.dirAtt : o.dir, p = 460 * Math.sqrt(t.sz.kb); t.vx = Math.cos(a) * p; t.vy = Math.sin(a) * p; t.vz = 420; t.z = Math.max(t.z, 1); t.act = null; if (t.spec && t.spec.breakable) endSpecial(st, t, true); }
    if (o.knockup && !armour) { t.vz = 300 + 260 * o.knockup; t.z = Math.max(t.z, 1); if (t.spec && t.spec.breakable) endSpecial(st, t, true); t.act = null; }
    const heavy = !o.light && (o.heavy || dmg >= 10 || !o.m1);
    st.freeze = Math.max(st.freeze, heavy ? 0.07 : 0.025);
    fx(st, heavy ? 'bighit' : 'hit', t.x, t.y - t.r * 0.6, { dir: o.dir, size: t.r, blood: false });
    sfx(st, heavy ? 'hitHeavy' : 'hit', t.x, t.y);
    ev(st, { type: 'float', x: t.x, y: t.y - t.r * 2, text: String(Math.round(dmg)), color: heavy ? '#ffd23f' : '#fff' });
    ev(st, { type: 'shake', amt: heavy ? 7 + Math.min(10, dmg / 2) : 2 });
    ev(st, { type: 'haptic', who: t.i, ms: heavy ? 60 : 20 });
    if (att) ev(st, { type: 'haptic', who: att.i, ms: heavy ? 40 : 12 });
    if (heavy && dmg >= 18) ev(st, { type: 'crowd', amt: 0.5 });
    return 'hit';
  }
  Sim.applyHit = applyHit;

  function parry(st, t, att, o) {
    t.guardHit = true;
    const key = att ? att.i + ':' + (att.act ? att.act.start : st.t.toFixed(2)) : 'x';
    if (t.lastParryKey === key) return; t.lastParryKey = key; t.stats.parries++;
    if (att) {
      att.stun = Math.max(att.stun, att.sz.idx >= 4 ? 0.4 : 0.8); att.act = null;
      if (att.spec) endSpecial(st, att, true);
      att.vx += Math.cos(o.dir) * -60; att.vy += Math.sin(o.dir) * -60;
    }
    st.freeze = Math.max(st.freeze, 0.08);
    fx(st, 'parry', t.x + Math.cos(t.face) * t.r, t.y - t.r * 0.6 + Math.sin(t.face) * t.r, {});
    sfx(st, 'clang', t.x, t.y); sfx(st, 'cheer');
    ev(st, { type: 'banner', text: 'PERFECT PARRY!', color: '#ffffff' });
    ev(st, { type: 'crowd', amt: 0.9, cut: true }); ev(st, { type: 'shake', amt: 6 });
    ev(st, { type: 'haptic', who: t.i, ms: 80 }); if (att) ev(st, { type: 'haptic', who: att.i, ms: 80 });
  }

  // ---------- blade clash ----------
  function startClash(st, a, b) {
    st.clash = { a: a.i, b: b.i, t: 1.5, m: [0, 0], x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    st.lastClash = st.t;
    for (const f of [a, b]) { f.act = null; f.vx = f.vy = 0; }
    st.freeze = 0.08;
    ev(st, { type: 'banner', text: 'BLADE CLASH!', color: '#ffb03b' }); ev(st, { type: 'crowd', amt: 0.8, cut: true });
    sfx(st, 'clang', st.clash.x, st.clash.y); sfx(st, 'cheer');
    ev(st, { type: 'clash', on: true });
  }
  function updateClash(st, dt) {
    const c = st.clash, fs = [st.fighters[c.a], st.fighters[c.b]];
    fs.forEach((f, k) => {
      if ((f.input.a && !f.prev.a) || (f.input.b && !f.prev.b)) { c.m[k]++; if (c.m[k] % 2 === 0) { fx(st, 'spark', c.x, c.y - 14, {}); sfx(st, 'tink', c.x, c.y, 0.5); } }
      f.act = null;
    });
    c.t -= dt;
    if (c.t <= 0) {
      const wi = c.m[0] === c.m[1] ? (Math.random() < 0.5 ? 0 : 1) : (c.m[0] > c.m[1] ? 0 : 1);
      const w = fs[wi], l = fs[1 - wi]; st.clash = null; w.stats.clashes++;
      ev(st, { type: 'clash', on: false });
      applyHit(st, w, l, { dmg: 9, kb: 520, dir: Math.atan2(l.y - w.y, l.x - w.x), m1: false, hitstun: 0.45, unparryable: true, heavy: true });
      ev(st, { type: 'banner', text: w.def.name.toUpperCase() + ' WINS THE CLASH!', color: '#ffb03b' });
    }
  }

  // ---------- projectiles ----------
  function fireProj(st, f, dir, d, extra) {
    const p = Object.assign({
      id: st.nextId++, owner: f.i, team: f.team, kind: d.proj || 'seed', x: f.x + Math.cos(dir) * f.r, y: f.y + Math.sin(dir) * f.r - f.r * 0.5,
      vx: Math.cos(dir) * d.speed, vy: Math.sin(dir) * d.speed, dir, r: d.radius || 5, life: d.life, dmg: d.dmg, kb: d.kb, slow: d.slow, stun: d.stun,
      pierce: !!d.pierce, hit: new Set(), m1: true,
    }, extra || {});
    st.projs.push(p);
    return p;
  }
  Sim.fireProj = fireProj;

  function updateProjs(st, dt) {
    for (const p of st.projs) {
      if (p.dead) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0 || p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) { p.dead = true; if (p.onEnd) p.onEnd(st, p); continue; }
      const owner = st.fighters[p.owner];
      for (const t of targetsOf(st, p.team)) {
        if (p.hit.has(t)) continue;
        if (Math.hypot(t.x - p.x, t.y - (p.y + t.r * 0.5)) > t.r + p.r) continue;
        p.hit.add(t);
        if (p.onHit) { p.onHit(st, p, t); if (!p.pierce) { p.dead = true; break; } continue; }
        const r = applyHit(st, owner, t, { dmg: p.dmg, kb: p.kb, dir: p.dir, m1: p.m1, slow: p.slow, stun: p.stun, heavy: p.heavy, hitstun: p.hitstun });
        if (r === 'parry' || !p.pierce) { p.dead = true; break; }
      }
      if (p.dead) continue;
      for (const o of st.objs) {
        if (!o.alive || !o.blocksProj || p.hit.has(o)) continue;
        if (Math.hypot(o.x - p.x, o.y - p.y) > o.r + p.r) continue;
        p.hit.add(o);
        if (p.onObj) { p.onObj(st, p, o); if (p.dead) break; continue; }
        if (!o.cutOnly || p.pierce) damageObj(st, o, p.pierce ? 3 : 1, p.dir, owner);
        if (!p.pierce) { p.dead = true; fx(st, 'dust', p.x, p.y, { n: 3, r: 4 }); break; }
      }
    }
    st.projs = st.projs.filter(p => !p.dead);
  }

  // ---------- breakable arena ----------
  function damageObj(st, o, n, dir, by) {
    if (!o.alive) return;
    o.hp -= n; o.shake = 0.2;
    sfx(st, o.kind === 'shoji' ? 'tear' : o.kind === 'bamboo' ? 'chop' : 'crack', o.x, o.y, 0.6);
    fx(st, 'chips', o.x, o.y, { kind: o.kind, n: 4 });
    if (o.hp > 0) return;
    o.alive = false;
    st.decals.push({ kind: o.kind + 'Broken', x: o.x, y: o.y, r: o.r, dir: dir || 0, seed: o.id });
    fx(st, 'chips', o.x, o.y, { kind: o.kind, n: 14 });
    if (o.kind === 'bamboo') { // falls over, small damage on whatever it lands on
      const fd = dir || 0, len = 70;
      sfx(st, 'timber', o.x, o.y);
      fx(st, 'bambooFall', o.x, o.y, { dir: fd, len });
      for (const f of st.fighters) {
        if (f.ko || f.under) continue;
        if (U.segDist(f.x, f.y, o.x, o.y, o.x + Math.cos(fd) * len, o.y + Math.sin(fd) * len) < f.r + 6) applyHit(st, null, f, { dmg: 4, kb: 80, dir: fd, m1: true, unparryable: true, hitstun: 0.1 });
      }
    }
  }
  Sim.damageObj = damageObj;

  // ---------- decoys (Kodama) ----------
  function popDecoy(st, d) {
    d.alive = false; fx(st, 'poof', d.x, d.y, {}); sfx(st, 'poof', d.x, d.y);
  }
  function updateDecoys(st, dt) {
    for (const d of st.decoys) {
      if (!d.alive) continue;
      d.t -= dt; d.anim += dt; d.turn -= dt;
      if (d.turn <= 0) { d.turn = U.rnd(0.4, 0.9); d.face = d.face + U.rnd(-1.2, 1.2); }
      d.x += Math.cos(d.face) * d.speed * dt; d.y += Math.sin(d.face) * d.speed * dt;
      if (d.x < 20 || d.x > W - 20) d.face = Math.PI - d.face;
      if (d.y < 20 || d.y > H - 20) d.face = -d.face;
      d.x = U.clamp(d.x, 15, W - 15); d.y = U.clamp(d.y, 15, H - 15);
      if (d.t <= 0) { d.alive = false; fx(st, 'poof', d.x, d.y, {}); }
    }
    st.decoys = st.decoys.filter(d => d.alive);
  }

  // ---------- specials ----------
  // Each special kind is a small state machine stored in f.spec. Handlers live in Sim.SPECIALS so new kinds plug in.
  Sim.SPECIALS = {};
  function startSpecial(st, f) {
    const d = f.def.s, h = Sim.SPECIALS[d.kind];
    if (!h) return;
    if (!SPEC_KINDS_HOLD[d.kind]) f.cd.s = d.cd;
    ev(st, { type: 'special', who: f.i });
    h.start(st, f, d);
  }
  function updateSpecial(st, f, dt) {
    const s = f.spec, h = Sim.SPECIALS[s.kind]; s.t += dt;
    if (h.update) h.update(st, f, f.def.s, dt);
  }
  function endSpecial(st, f, interrupted) {
    const s = f.spec; if (!s) return;
    const h = Sim.SPECIALS[s.kind]; f.spec = null;
    if (SPEC_KINDS_HOLD[s.kind]) f.cd.s = f.def.s.cd;
    if (h && h.end) h.end(st, f, f.def.s, interrupted, s);
  }
  Sim.endSpecial = endSpecial;
  Sim.helpers = { fx, sfx, ev, fireProj, applyHit, damageObj, targetsOf, inShape, aimAssist, bounds, popDecoy };

  // Itsube: Guard - a 0.3s parry window
  Sim.SPECIALS.guard = {
    start(st, f, d) {
      f.guard = d.window; f.guardHit = false; f.act = { slot: 's', def: { kind: 'guard', windup: 0, active: d.window, recover: 0, moveMul: 0, noMove: true, pose: 'guard' }, t: 0, dir: f.face, hit: new Set(), objHit: new Set(), start: st.t };
      sfx(st, 'guardUp', f.x, f.y, 0.6); fx(st, 'guardGlint', f.x, f.y, { who: f.i });
    },
  };
})();
Sim.SPECIALS.scatter = {
 start(st,f) {
 f.hidden=2.5;
 for(let k=0;k<4;k++) st.decoys.push({id:'kodama',owner:f.i,team:f.team,decoy:true,alive:true,x:f.x,y:f.y,r:f.r,face:k*Math.PI/2,speed:f.speed,t:2.5,anim:0,turn:0.5,moving:true,z:0,hitFlash:0});
 Sim.helpers.fx(st,'poof',f.x,f.y,{});
 }
};
