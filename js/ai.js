// YO-KA-MURAI - bots. Each fighter plays its own style (from FIGHTERS[id].ai); difficulty sets reactions and smarts.
'use strict';
const AI = {};
(function () {
  const DIFF = {
    easy:   { react: 0.42, aggro: 0.45, parry: 0, aim: 0.6, mash: 5, punish: false, charge: 0.45, juke: 0.2 },
    normal: { react: 0.24, aggro: 0.75, parry: 0.35, aim: 0.85, mash: 8, punish: false, charge: 0.85, juke: 0.5 },
    hard:   { react: 0.12, aggro: 0.95, parry: 0.7, aim: 1, mash: 11, punish: true, charge: 1.15, juke: 0.85 },
  };
  AI.DIFF = DIFF;

  AI.create = function (i, diff) {
    return { i, d: DIFF[diff] || DIFF.normal, hist: [], strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 0, target: null, retarget: 0,
      seenAct: null, parryRoll: false, holdS: false, mashT: 0, mashOn: false, lastSeen: null, think: 0, plan: null, decide: 0 };
  };

  // remember where things were so the bot reacts to the past (= reaction time)
  function perceive(b, st, me) {
    const t = st.t;
    const foes = Sim.targetsOf(st, me.team).map(f => ({ ref: f, x: f.x, y: f.y, decoy: !!f.decoy }));
    b.hist.push({ t, foes });
    while (b.hist.length > 2 && b.hist[1].t <= t - b.d.react) b.hist.shift();
    return b.hist[0];
  }

  AI.think = function (b, st) {
    const me = st.fighters[b.i];
    const out = { mx: 0, my: 0, a: false, b: false, s: false };
    if (!me || me.ko) return out;
    // blade clash: mash!
    if (st.clash) {
      b.mashT -= Sim.DT; if (b.mashT <= 0) { b.mashOn = !b.mashOn; b.mashT = 0.5 / b.d.mash * U.rnd(0.8, 1.2); }
      out.a = b.mashOn; return out;
    }
    if (st.phase !== 'fight') return out;
    const snap = perceive(b, st, me);
    // pick a target (bots cannot tell Kodama from its decoys)
    b.retarget -= Sim.DT;
    const live = Sim.targetsOf(st, me.team);
    if (!b.target || !live.includes(b.target) || b.retarget <= 0) {
      const real = live.filter(t => !t.decoy), fakes = live.filter(t => t.decoy);
      b.target = fakes.length && Math.random() > (b.d.punish ? 0.45 : 0.2) ? U.pick(fakes) : (real[0] || fakes[0] || null);
      b.retarget = U.rnd(0.8, 1.6);
    }
    const T = b.target; if (!T) return out;
    const old = snap.foes.find(f => f.ref === T) || { x: T.x, y: T.y };
    let tx = old.x, ty = old.y;
    const seen = Sim.los(st, me.x, me.y, T.x, T.y);
    if (!seen && b.lastSeen) { tx = b.lastSeen.x; ty = b.lastSeen.y; } else b.lastSeen = { x: tx, y: ty };
    const dx = tx - me.x, dy = ty - me.y, dist = Math.hypot(dx, dy), dir = Math.atan2(dy, dx), gap = dist - me.r - (T.r || 10);
    const def = me.def, style = def.ai || {};
    const enemyReal = T.decoy ? st.fighters[T.owner] : T;

    // ---- desired spacing ----
    let want = style.range || 70;
    // rhythm: alternate between pressing in and spacing out (more pressing when aggressive)
    b.modeT = (b.modeT || 0) - Sim.DT;
    if (b.modeT <= 0) { b.press = Math.random() < 0.35 + b.d.aggro * 0.5 + (style.style === 'rush' ? 0.3 : 0); b.modeT = b.press ? U.rnd(1.2, 2.6) : U.rnd(0.6, 1.4); }
    if (b.press) { let reach = 0; for (const k of ['a', 'b']) { const ad = def[k]; reach = Math.max(reach, ad.kind === 'proj' ? 0 : ad.range || 0); } if (reach) want = Math.min(want, reach * 0.8 + me.r); }
    const enemyOnCd = enemyReal && enemyReal.cd && (enemyReal.cd.s > 1.2 || enemyReal.stun > 0 || enemyReal.root > 0);
    if (b.d.punish && enemyOnCd) want *= 0.55;
    if (me.hp < me.maxHp * 0.3 && style.style === 'kite') want *= 1.2;
    b.strafeT -= Sim.DT; if (b.strafeT <= 0) { b.strafeT = U.rnd(0.6, 1.8); if (Math.random() < b.d.juke) b.strafe *= -1; }
    let mvx = 0, mvy = 0;
    const err = gap + (T.r || 10) + me.r - want;
    if (err > 12) { mvx += Math.cos(dir); mvy += Math.sin(dir); }
    else if (err < -14 && style.style !== 'rush') { mvx -= Math.cos(dir); mvy -= Math.sin(dir); }
    const strafeK = style.style === 'rush' ? 0.25 : 0.65;
    mvx += -Math.sin(dir) * b.strafe * strafeK; mvy += Math.cos(dir) * b.strafe * strafeK;
    // keep off walls and away from obstacles
    const m = 50;
    if (me.x < m) mvx += 1; if (me.x > WORLD.W - m) mvx -= 1; if (me.y < m) mvy += 1; if (me.y > WORLD.H - m) mvy -= 1;
    for (const o of st.objs) { if (!o.alive || !o.solid) continue; const ox = me.x - o.x, oy = me.y - o.y, od = Math.hypot(ox, oy); if (od < o.r + me.r + 18 && od > 0) { mvx += ox / od * 0.9; mvy += oy / od * 0.9; } }
    for (const c of st.cliffs || []) { if (me.x > c.x0 && me.x < c.x1) { if (c.side === 'top' && me.y < 70) mvy += 1.2; if (c.side === 'bottom' && me.y > WORLD.H - 70) mvy -= 1.2; } }
    const ml = Math.hypot(mvx, mvy);
    if (ml > 0.01) { out.mx = mvx / ml; out.my = mvy / ml; }

    // ---- attacks: face the target, then swing ----
    const faceOk = Math.abs(U.angDiff(me.face, dir)) < 0.5;
    if (gap < 140 && !faceOk && ml < 0.5) { out.mx = Math.cos(dir) * 0.3; out.my = Math.sin(dir) * 0.3; }
    b.decide -= Sim.DT;
    if (b.decide <= 0) {
      b.decide = U.rnd(0.05, 0.12) + (1 - b.d.aggro) * 0.25;
      b.plan = null;
      if (seen && Math.random() < b.d.aggro) {
        for (const k of ['a', 'b']) {
          const ad = def[k];
          const reach = ad.kind === 'proj' ? ad.speed * ad.life * 0.85 : (ad.shape === 'ring' ? ad.range : ad.range) + (ad.lunge ? ad.lunge * (ad.active || 0) : 0);
          if (gap + (T.r || 10) <= reach + (T.r || 10) * 0.5 && me.cd[k] <= 0) { if (!b.plan || Math.random() < 0.5) b.plan = k; }
        }
      }
    }
    if (b.plan && faceOk) { out[b.plan] = true; }
    // face target when attacking from range
    if (b.plan && gap < 300) { const k = ml > 0.2 ? 0.35 : 1; out.mx = out.mx * (1 - k) + Math.cos(dir) * k; out.my = out.my * (1 - k) + Math.sin(dir) * k; }

    // ---- special ----
    const sh = AI.SPECIAL[def.s.kind];
    if (sh) sh(b, st, me, T, { dist, gap, dir, seen, enemyReal, out, faceOk });
    return out;
  };

  // per-special bot logic. ctx: {dist, gap, dir, seen, enemyReal, out, faceOk}
  AI.SPECIAL = {
    guard(b, st, me, T, c) {
      if (me.cd.s > 0 || b.d.parry <= 0) return;
      const e = c.enemyReal; if (!e) return;
      // see the attack starting (after reaction delay) and raise the guard
      const a = e.act, threat = a && a.def && (a.def.kind === 'melee' || a.def.kind === 'proj') && st.t - a.start >= Math.min(b.d.react * 0.5, (a.def.windup || 0) * 0.6);
      if (threat && b.seenAct !== a.start) { b.seenAct = a.start; b.parryRoll = Math.random() < b.d.parry; }
      const inReach = threat && c.gap < (a.def.kind === 'proj' ? 400 : (a.def.range || 60) + 25);
      if (inReach && b.parryRoll) { c.out.s = true; c.out.a = c.out.b = false; b.parryRoll = false; }
      // incoming projectiles
      for (const p of st.projs) {
        if (p.team === me.team) continue; const d = Math.hypot(p.x - me.x, p.y - me.y);
        if (d < 70 && Math.random() < b.d.parry * 0.25) { c.out.s = true; break; }
      }
      // special attacks of big yokai
      if (e.spec && e.spec.threat && Math.hypot(e.spec.tx - me.x, e.spec.ty - me.y) < (e.spec.threat || 0) && e.spec.t > 0.2 && Math.random() < b.d.parry * 0.2) c.out.s = true;
    },
  };
})();
AI.SPECIAL.scatter=function(b,st,me,T,c){if(me.cd.s<=0 && c.dist<180 && (me.hitFlash>0 || c.enemyReal.act)) c.out.s=true;};
