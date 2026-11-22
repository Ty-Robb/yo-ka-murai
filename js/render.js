// YO-KA-MURAI - drawing: arena, stands + crowd, fighters, effects, HUD, banners, touch controls.
'use strict';
const Render = {};
(function () {
  const { W, H } = WORLD;
  const STAND = 150; // stands depth around the arena (world units)
  let cv, cx, dpr = 1, sw = 0, sh = 0;
  const R = Render;
  R.cam = { s: 1, ox: 0, oy: 0, shake: 0, hudH: 50 };
  R.parts = []; R.fxs = []; R.floats = [];
  R.banner = null; R.ticker = []; R.crowdCut = 0; R.excite = 0; R.flash = 0;
  R.local = 0; // which fighter is "me"

  R.init = function (canvas) { cv = canvas; cx = cv.getContext('2d'); R.resize(); };
  R.safe = { l: 0, r: 0, t: 0, b: 0 };
  R.resize = function () {
    dpr = Math.min(window.devicePixelRatio || 1, 3); sw = window.innerWidth; sh = window.innerHeight;
    cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr); cv.style.width = sw + 'px'; cv.style.height = sh + 'px';
    if (!R.probe) { R.probe = document.createElement('div'); R.probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(R.probe); }
    const g = getComputedStyle(R.probe);
    R.safe = { t: parseFloat(g.paddingTop) || 0, r: parseFloat(g.paddingRight) || 0, b: parseFloat(g.paddingBottom) || 0, l: parseFloat(g.paddingLeft) || 0 };
    R.cam.hudH = Math.max(46, Math.min(74, sh * 0.13)) + R.safe.t;
    const m = 14, availH = sh - R.cam.hudH;
    R.cam.s = Math.min((sw - R.safe.l - R.safe.r) / (W + m * 2), availH / (H + m * 2));
    R.cam.ox = (sw - W * R.cam.s) / 2; R.cam.oy = R.cam.hudH + (availH - H * R.cam.s) / 2;
    Input.layoutButtons(sw, sh, R.safe);
  };
  R.size = () => ({ w: sw, h: sh });

  // ---------- arena backdrop (pre-rendered once per match) ----------
  let bg = null, bgArena = null, decal = null, decalCount = 0, crowd = [];
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
  R.hash = hash;

  R.prepareArena = function (arenaId) {
    const A = ARENAS[arenaId]; bgArena = arenaId; decalCount = 0;
    const [c, x] = Art.mk(W + STAND * 2, H + STAND * 2); bg = c;
    x.translate(STAND, STAND);
    // stands: wooden tiers all around
    x.fillStyle = '#140c10'; x.fillRect(-STAND, -STAND, W + STAND * 2, H + STAND * 2);
    for (let t = 0; t < 7; t++) {
      const d = 18 + t * 19;
      x.fillStyle = t % 2 ? A.stands : shade(A.stands, 1.18);
      x.fillRect(-d, -d, W + d * 2, 8); x.fillRect(-d, H + d - 8, W + d * 2, 8);
      x.fillRect(-d, -d, 8, H + d * 2); x.fillRect(W + d - 8, -d, 8, H + d * 2);
    }
    // banners / noren hanging at the arena edge
    for (let i = 0; i < 14; i++) { const bx = 30 + i * 56; x.fillStyle = i % 2 ? '#2f6fd6' : '#d63a2f'; x.fillRect(bx, -14, 20, 10); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(bx + 8, -12, 4, 6); }
    // floor
    A.drawFloor ? A.drawFloor(x) : defaultFloor(x, A);
    // painted duelling ground: boundary, centre circle, start lines
    x.strokeStyle = A.line; x.globalAlpha = 0.75; x.lineWidth = 3;
    x.strokeRect(10, 10, W - 20, H - 20); x.beginPath(); x.arc(W / 2, H / 2, 58, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(W / 2, 10); x.lineTo(W / 2, H - 10); x.lineWidth = 2; x.stroke();
    x.lineWidth = 3; for (const sx of [130, W - 130]) { x.beginPath(); x.moveTo(sx, H / 2 - 22); x.lineTo(sx, H / 2 + 22); x.stroke(); }
    x.globalAlpha = 1;
    // edge shadow
    const g = x.createLinearGradient(0, 0, 0, 24); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, 24);
    // crowd spectators
    crowd = [];
    let n = 0;
    for (let t = 0; t < 6; t++) {
      const d = 26 + t * 19;
      for (let px = -d + 6; px < W + d - 6; px += 9 + (t % 2)) { crowd.push(spect(px, -d + 1, n++)); crowd.push(spect(px, H + d - 9, n++)); }
      for (let py = -d + 16; py < H + d - 16; py += 10) { crowd.push(spect(-d + 1, py, n++)); crowd.push(spect(W + d - 7, py, n++)); }
    }
    const [dc] = Art.mk(W, H); decal = dc;
  };
  function spect(x, y, i) {
    const h = hash(i * 7 + 3), robes = ['#c0392b', '#2f6fd6', '#e0b040', '#3fa060', '#8e44ad', '#d35400', '#ecf0f1', '#34495e', '#e84393', '#16a085'];
    return { x, y, robe: robes[Math.floor(h * robes.length)], skin: hash(i * 13) < 0.5 ? '#f0c39a' : '#d9a070', hair: hash(i * 5) < 0.7 ? '#1a1418' : '#5a3a20', ph: hash(i * 11) * 6.28, fan: hash(i * 17) < 0.12, faction: hash(i * 19) < 0.5 };
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + ((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0'); }
  R.shade = shade;

  function defaultFloor(x, A) {
    // polished wood planks
    for (let y = 0; y < H; y += 16) {
      const off = (y / 16 % 3) * 70;
      for (let px = -off; px < W; px += 210) {
        const k = 0.92 + hash(y * 31 + px) * 0.14;
        x.fillStyle = shade(A.floor, k); x.fillRect(px, y, 210, 16);
        x.fillStyle = shade(A.floor, k * 1.08); x.fillRect(px, y, 210, 2);
        x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px, y + 15, 210, 1); x.fillRect(px, y, 1, 16);
        for (let g = 0; g < 4; g++) { x.fillStyle = 'rgba(60,30,10,.15)'; x.fillRect(px + hash(y + g * 9 + px) * 200, y + 4 + g * 3, 30 + hash(g + y) * 40, 1); }
      }
    }
    if (A.mats) for (const m of A.mats) { // tatami mats
      x.fillStyle = '#b9b77a'; x.fillRect(m[0], m[1], m[2], m[3]);
      for (let i = 0; i < m[3]; i += 2) { x.fillStyle = i % 4 ? '#c4c286' : '#aead6e'; x.fillRect(m[0], m[1] + i, m[2], 1); }
      x.fillStyle = '#2b3a2a'; x.fillRect(m[0], m[1], m[2], 3); x.fillRect(m[0], m[1] + m[3] - 3, m[2], 3);
    }
    // shine
    const g = x.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.6); g.addColorStop(0, 'rgba(255,240,200,.12)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  }

  function paintDecals(st) {
    const x = decal.getContext('2d');
    while (decalCount < st.decals.length) {
      const d = st.decals[decalCount++], h = hash(d.seed || decalCount);
      const fn = R.DECALS[d.kind]; if (fn) fn(x, d, h);
    }
  }
  R.DECALS = {
    pillarBroken(x, d) { x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(d.x, d.y + 2, d.r + 3, d.r * 0.7, 0, 0, 7); x.fill(); x.fillStyle = '#5a3418'; x.beginPath(); x.ellipse(d.x, d.y, d.r * 0.9, d.r * 0.6, 0, 0, 7); x.fill(); x.fillStyle = '#7a4a22'; x.fillRect(d.x - 4, d.y - 3, 8, 3); for (let i = 0; i < 6; i++) { x.fillStyle = '#6a3e1c'; x.fillRect(d.x + Math.cos(d.dir + i) * (d.r + 6 + i * 2), d.y + Math.sin(d.dir + i) * (d.r + 4), 5, 2); } },
    shojiBroken(x, d) { x.fillStyle = '#5a3a20'; x.fillRect(d.x - 10, d.y + 4, 20, 2); for (let i = 0; i < 5; i++) { x.fillStyle = i % 2 ? '#f1ead8' : '#d8d0bb'; x.fillRect(d.x - 10 + i * 5 + Math.cos(d.dir) * 6, d.y + 6 + (i % 3) * 3 + Math.sin(d.dir) * 6, 4, 3); } },
    crater(x, d) { x.fillStyle = 'rgba(30,18,10,.55)'; x.beginPath(); x.ellipse(d.x, d.y, d.r, d.r * 0.75, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(d.x, d.y + 1, d.r * 0.6, d.r * 0.42, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(30,18,10,.6)'; x.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = i * 1.05 + (d.seed || 0); x.beginPath(); x.moveTo(d.x + Math.cos(a) * d.r, d.y + Math.sin(a) * d.r * 0.75); x.lineTo(d.x + Math.cos(a) * d.r * 1.6, d.y + Math.sin(a) * d.r * 1.2); x.stroke(); } },
    scorch(x, d) { x.fillStyle = 'rgba(20,12,8,.3)'; x.beginPath(); x.ellipse(d.x, d.y, d.r, d.r * 0.7, 0, 0, 7); x.fill(); },
    crack(x, d) { x.strokeStyle = 'rgba(25,15,8,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(d.x, d.y); x.lineTo(d.x2, d.y2); x.stroke(); },
  };

  // ---------- frame ----------
  R.draw = function (st, view, dt) {
    const c = cx, cam = R.cam;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;
    c.fillStyle = '#0c0810'; c.fillRect(0, 0, sw, sh);
    if (!st) return;
    if (bgArena !== st.arenaId || !bg) R.prepareArena(st.arenaId);
    paintDecals(st);
    // shake
    cam.shake *= Math.exp(-10 * dt); const sx = (Math.random() - 0.5) * cam.shake, sy = (Math.random() - 0.5) * cam.shake;
    const s = cam.s;
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cam.ox + sx), dpr * (cam.oy + sy));
    c.drawImage(bg, -STAND, -STAND);
    drawCrowd(c, st);
    c.drawImage(decal, 0, 0);
    drawZones(c, st);
    drawTelegraphs(c, st);
    // y-sorted world objects
    const list = [];
    for (const o of st.objs) if (o.alive) list.push({ y: o.y, o });
    for (const f of st.fighters) list.push({ y: f.y, f });
    for (const d of st.decoys) list.push({ y: d.y, d });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) { if (e.o) drawObj(c, e.o, dt); else if (e.f) drawFighter(c, st, e.f, false); else drawDecoy(c, st, e.d); }
    drawProjs(c, st);
    drawFx(c, dt);
    if (R.WEATHER[st.arenaId]) R.WEATHER[st.arenaId](c, dt);
    for (const f of st.fighters) drawOverhead(c, st, f);
    drawFloats(c, dt);
    if (st.clash) drawClash(c, st);
    // screen-space overlays
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (R.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(0.6, R.flash) + ')'; c.fillRect(0, 0, sw, sh); R.flash -= dt * 3; }
    drawHud(c, st, view);
    drawTicker(c, dt);
    drawCrowdCut(c, dt);
    drawBanner(c, dt);
    if (view && view.controls) drawControls(c, st, view);
  };

  // ---------- crowd ----------
  function drawCrowd(c, st) {
    R.excite = Math.max(0, R.excite - 0.008);
    const t = performance.now() / 1000, ex = R.excite;
    for (const p of crowd) {
      const jump = ex > 0.2 ? Math.max(0, Math.sin(t * (8 + ex * 6) + p.ph)) * (2 + ex * 4) : Math.sin(t * 2 + p.ph) * 0.6;
      const y = p.y - jump;
      c.fillStyle = p.robe; c.fillRect(p.x, y + 4, 6, 5);
      c.fillStyle = p.skin; c.fillRect(p.x + 1, y, 4, 4);
      c.fillStyle = p.hair; c.fillRect(p.x + 1, y, 4, 1.5);
      if (ex > 0.35 && p.fan) { c.fillStyle = p.faction ? '#2f6fd6' : '#d63a2f'; c.fillRect(p.x + 5, y - 6 - jump, 2, 7); c.fillRect(p.x + 5, y - 8 - jump, 6, 4); }
      else if (ex > 0.3) { c.fillStyle = p.skin; c.fillRect(p.x - 1, y - 2, 1.5, 3); c.fillRect(p.x + 6, y - 2, 1.5, 3); }
    }
  }

  // ---------- zones ----------
  function drawZones(c, st) {
    const t = performance.now() / 1000;
    for (const z of st.zones) {
      if (z.kind === 'trail') {
        const a = Math.min(1, z.t / 0.6) * 0.55;
        c.fillStyle = 'rgba(70,160,220,' + a + ')'; c.beginPath(); c.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, 7); c.fill();
        c.fillStyle = 'rgba(200,240,255,' + a * 0.8 + ')'; c.fillRect(z.x - 4 + Math.sin(t * 3 + z.x) * 4, z.y - 2, 6, 1.5);
      } else if (R.ZONES[z.kind]) R.ZONES[z.kind](c, z, t);
    }
  }
  R.ZONES = {};

  // ---------- telegraphs: every attack shows its danger zone during the wind-up ----------
  function drawTelegraphs(c, st) {
    for (const f of st.fighters) {
      const a = f.act; if (!a || !a.def || f.ko) continue; const d = a.def;
      if (d.kind !== 'melee' && d.kind !== 'proj') continue;
      const w = d.windup || 0; const inWind = a.t < w, k = inWind ? a.t / Math.max(w, 0.01) : 1;
      if (!inWind && a.t > w + (d.active || 0)) continue;
      const mine = f.i === R.local, col = mine ? '255,255,255' : '255,70,50', al = inWind ? 0.15 + 0.25 * k : 0.12;
      c.save(); c.translate(f.x, f.y);
      c.fillStyle = 'rgba(' + col + ',' + al + ')'; c.strokeStyle = 'rgba(' + col + ',' + (al + 0.25) + ')'; c.lineWidth = 1.5;
      if (d.kind === 'proj') { c.rotate(a.dir); c.fillRect(f.r, -2, Math.min(220, d.speed * d.life) * (0.3 + 0.7 * k), 4); }
      else if (d.shape === 'arc') { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, d.range, a.dir - d.arc * Math.PI / 360, a.dir + d.arc * Math.PI / 360); c.closePath(); c.fill(); c.stroke(); }
      else if (d.shape === 'line') { c.rotate(a.dir); c.fillRect(0, -d.width / 2, d.range, d.width); c.strokeRect(0, -d.width / 2, d.range, d.width); }
      else if (d.shape === 'ring') { c.beginPath(); c.arc(0, 0, d.range, 0, 7); c.fill(); c.stroke(); }
      c.restore();
    }
    if (R.extraTelegraphs) R.extraTelegraphs(c, st);
  }

  // ---------- obstacles ----------
  R.OBJ = {
    pillar(c, o) {
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(o.x + 3, o.y + 3, o.r + 2, o.r * 0.7, 0, 0, 7); c.fill();
      const h = 44, w = o.r * 1.6, x0 = o.x - w / 2, y0 = o.y - h;
      c.fillStyle = '#6a3a1c'; c.fillRect(x0, y0, w, h + 2);
      c.fillStyle = '#8a5028'; c.fillRect(x0 + 3, y0, w * 0.3, h + 2);
      c.fillStyle = '#4a2610'; c.fillRect(x0 + w - 5, y0, 5, h + 2);
      c.fillStyle = '#a8662e'; c.fillRect(x0 + 4, y0, 2, h);
      c.fillStyle = '#2a1408'; c.fillRect(x0 - 2, o.y - 4, w + 4, 6); c.fillRect(x0 - 2, y0 - 4, w + 4, 6);
      c.fillStyle = '#c9a23a'; c.fillRect(x0 - 2, o.y - 4, w + 4, 1); c.fillRect(x0 - 2, y0 - 4, w + 4, 1);
      if (o.hp < o.maxHp) { c.strokeStyle = '#1a0c04'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + 4, y0 + 12); c.lineTo(x0 + 10, y0 + 22); c.lineTo(x0 + 6, y0 + 30); if (o.hp < o.maxHp / 2) { c.moveTo(x0 + w - 4, y0 + 8); c.lineTo(x0 + w - 10, y0 + 20); } c.stroke(); }
    },
    shoji(c, o) {
      const w = 20, h = 34, x0 = o.x - w / 2, y0 = o.y - h + 4;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0 + 2, o.y, w, 4);
      c.fillStyle = '#efe8d4'; c.fillRect(x0, y0, w, h);
      c.fillStyle = 'rgba(255,230,180,.25)'; c.fillRect(x0, y0, w, h / 2);
      c.fillStyle = '#4a2c16'; c.fillRect(x0, y0, w, 2); c.fillRect(x0, y0 + h - 2, w, 2); c.fillRect(x0, y0, 2, h); c.fillRect(x0 + w - 1, y0, 1, h);
      c.fillStyle = '#6a4424'; for (let i = 1; i < 3; i++) c.fillRect(x0 + i * w / 3, y0, 1, h); for (let j = 1; j < 4; j++) c.fillRect(x0, y0 + j * h / 4, w, 1);
    },
  };
  function drawObj(c, o, dt) {
    let ox = 0; if (o.shake > 0) { o.shake -= dt; ox = (Math.random() - 0.5) * 3; }
    c.save(); c.translate(ox, 0); (R.OBJ[o.kind] || R.OBJ.pillar)(c, o); c.restore();
  }

  // ---------- fighters ----------
  function poseOf(st, f) {
    if (f.ko) return 'hit';
    if (f.hitstun > 0 || f.stun > 0 || f.z > 0) return 'hit';
    if (f.act) { const d = f.act.def; if (d.pose === 'guard') return 'special'; return f.act.t < (d.windup || 0) ? 'wind' : (d.pose || 'strike'); }
    if (f.spec) return f.spec.pose || 'special';
    if (f.moving) return 'run' + (Math.floor(f.anim * 10) % 4);
    return 'idle' + (Math.floor(f.anim * 2) % 2);
  }
  R.poseOf = poseOf;

  function drawFighter(c, st, f) {
    if (R.CUSTOM[f.id]) { R.CUSTOM[f.id](c, st, f); return; }
    if (f.under) return;
    const hidden = R.local !== f.i && R.isHidden(st, f);
    const pose = poseOf(st, f), flip = Math.cos(f.face) < -0.05;
    const img = Art.frame(f.id, pose);
    // shadow
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(f.x, f.y + 2, f.r * 1.05 * (1 - Math.min(0.5, f.z / 200)), f.r * 0.45, 0, 0, 7); c.fill();
    if (f.i === R.local && !f.ko) { c.strokeStyle = 'rgba(120,200,255,.55)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(f.x, f.y + 2, f.r + 3, f.r * 0.5 + 2, 0, 0, 7); c.stroke(); }
    c.save(); c.translate(f.x, f.y + 3 - f.z);
    if (hidden) c.globalAlpha = 0.22;
    if (f.ko) { c.rotate(flip ? Math.PI / 2 : -Math.PI / 2); c.translate(0, -img.height * 0.35); }
    if (flip) c.scale(-1, 1);
    const sc = Art.PX;
    c.drawImage(img, -img.ox * sc, -img.oy * sc, img.width * sc, img.height * sc);
    if (f.hitFlash > 0) { c.globalAlpha = (hidden ? 0.22 : 1) * Math.min(1, f.hitFlash / 0.12); c.drawImage(Art.frame(f.id, pose, true), -img.ox * sc, -img.oy * sc, img.width * sc, img.height * sc); }
    c.restore();
    if (f.guard > 0) { c.strokeStyle = 'rgba(255,255,255,' + (0.5 + Math.random() * 0.4) + ')'; c.lineWidth = 2.5; c.beginPath(); c.arc(f.x, f.y - f.r, f.r * 1.9, f.face - 1.1, f.face + 1.1); c.stroke(); }
  }
  R.drawFighter = drawFighter;
  R.CUSTOM = {};
  R.isHidden = (st, f) => { const me = st.fighters[R.local]; return me && !Sim.los(st, me.x, me.y, f.x, f.y); };

  function drawDecoy(c, st, d) {
    const fake = Object.assign({}, st.fighters[d.owner], { x: d.x, y: d.y, face: d.face, moving: true, anim: d.anim, act: null, spec: null, hitFlash: 0, hitstun: 0, stun: 0, z: 0, ko: false, under: false, guard: 0 });
    const keep = R.local; R.local = -1; drawFighter(c, st, fake); R.local = keep;
  }

  function drawOverhead(c, st, f) {
    if (f.ko || f.under) return;
    if (R.local !== f.i && R.isHidden(st, f)) return;
    const top = f.y - (Art.SPECS[f.id] ? Art.SPECS[f.id].h * Art.PX * 0.92 : f.r * 3) - f.z - 6, w = Math.max(30, f.r * 2.4);
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(f.x - w / 2 - 1, top - 1, w + 2, 5);
    const p = f.hp / f.maxHp; c.fillStyle = p > 0.5 ? '#5ad06a' : p > 0.25 ? '#f0c040' : '#e8483b'; c.fillRect(f.x - w / 2, top, w * p, 3);
    c.fillStyle = f.team === 0 ? '#5a9cff' : '#ff6a5a'; c.fillRect(f.x - w / 2, top + 3, w, 1);
    // status icons
    const icons = [];
    if (f.stun > 0) icons.push('stun'); if (f.slow > 0) icons.push('slow'); if (f.z > 0) icons.push('up');
    const t = performance.now() / 200;
    icons.forEach((k, i) => {
      const ix = f.x - (icons.length - 1) * 6 + i * 12, iy = top - 9;
      if (k === 'stun') for (let j = 0; j < 3; j++) { const a = t + j * 2.1; c.fillStyle = '#ffe14a'; c.fillRect(ix + Math.cos(a) * 7 - 1.5, iy + Math.sin(a) * 2.5 - 1.5, 3, 3); }
      if (k === 'slow') { c.fillStyle = '#58b6ff'; c.beginPath(); c.moveTo(ix, iy - 5); c.lineTo(ix + 3, iy + 1); c.lineTo(ix - 3, iy + 1); c.fill(); c.beginPath(); c.arc(ix, iy + 1, 3, 0, Math.PI); c.fill(); }
      if (k === 'up') { c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(ix, iy - 5); c.lineTo(ix + 4, iy); c.lineTo(ix - 4, iy); c.fill(); c.fillRect(ix - 1.5, iy, 3, 4); }
    });
  }

  // ---------- projectiles ----------
  R.PROJ = {
    seed(c, p) { c.fillStyle = '#9ad36a'; c.fillRect(p.x - 2, p.y - 2, 4, 4); c.fillStyle = '#e8ffc8'; c.fillRect(p.x - 1, p.y - 2, 2, 1); },
  };
  function drawProjs(c, st) { for (const p of st.projs) (R.PROJ[p.kind] || R.PROJ.seed)(c, p, st); }

  // ---------- effects ----------
  R.onEvent = function (e, st) {
    switch (e.type) {
      case 'shake': R.cam.shake = Math.max(R.cam.shake, e.amt); break;
      case 'banner': if (e.big) R.banner = { text: e.text, color: e.color, t: 0 }; else R.ticker.push({ text: e.text, color: e.color, x: null }); break;
      case 'crowd': R.excite = Math.min(1, R.excite + e.amt); if (e.cut) R.crowdCut = e.amt >= 1 ? 1.6 : 1.1; break;
      case 'float': R.floats.push({ x: e.x, y: e.y, text: e.text, color: e.color, t: 0 }); break;
      case 'fx': spawnFx(e); break;
    }
  };
  function P(x, y, vx, vy, life, color, size, grav) { R.parts.push({ x, y, vx, vy, life, max: life, color, size, grav: grav || 0 }); }
  R.particle = P;
  function spawnFx(e) {
    const k = e.kind;
    if (R.FX[k]) { R.FX[k](e); return; }
    if (k === 'slash' || k === 'thrust' || k === 'sweep' || k === 'smash' || k === 'claw') R.fxs.push(Object.assign({ t: 0, life: 0.16 }, e));
    else if (k === 'hit') { for (let i = 0; i < 7; i++) { const a = e.dir + U.rnd(-1, 1); P(e.x, e.y, Math.cos(a) * U.rnd(60, 180), Math.sin(a) * U.rnd(60, 180), 0.25, i % 2 ? '#fff6c8' : '#ffd23f', 2); } R.fxs.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.15, r: 14, col: '255,255,255' }); }
    else if (k === 'bighit') { for (let i = 0; i < 16; i++) { const a = e.dir + U.rnd(-1.4, 1.4); P(e.x, e.y, Math.cos(a) * U.rnd(100, 300), Math.sin(a) * U.rnd(100, 300), 0.4, i % 3 ? '#ffd23f' : '#ffffff', 3); } R.fxs.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.25, r: 34, col: '255,220,120' }); for (let i = 0; i < 6; i++) P(e.x, e.y + 10, U.rnd(-80, 80), U.rnd(-40, 10), 0.6, '#a89070', 3, 120); }
    else if (k === 'parry') { R.flash = 0.5; for (let i = 0; i < 20; i++) { const a = Math.random() * 6.28; P(e.x, e.y, Math.cos(a) * U.rnd(150, 380), Math.sin(a) * U.rnd(150, 380), 0.35, '#ffffff', 2.5); } R.fxs.push({ kind: 'star', x: e.x, y: e.y, t: 0, life: 0.35 }); R.fxs.push({ kind: 'ring', x: e.x, y: e.y, t: 0, life: 0.3, r: 46, col: '255,255,255' }); }
    else if (k === 'spark') { for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28; P(e.x, e.y, Math.cos(a) * 200, Math.sin(a) * 200 - 60, 0.25, '#ffcf5a', 2, 400); } }
    else if (k === 'dust') { for (let i = 0; i < (e.n || 6); i++) P(e.x + U.rnd(-e.r, e.r), e.y, U.rnd(-40, 40), U.rnd(-30, -5), 0.5, '#c9b89a', 3); }
    else if (k === 'chips') { const col = R.CHIP[e.kind] || ['#7a4a22', '#a0683a']; for (let i = 0; i < (e.n || 4); i++) P(e.x, e.y - 10, U.rnd(-120, 120), U.rnd(-160, -20), 0.6, col[i % col.length], 2.5, 500); }
    else if (k === 'poof') { for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28; P(e.x, e.y - 6, Math.cos(a) * 70, Math.sin(a) * 70, 0.45, i % 2 ? '#e8f0e0' : '#b8d0b0', 4); } }
    else if (k === 'ringout') { for (let i = 0; i < 14; i++) P(e.x, e.y, U.rnd(-60, 60), U.rnd(-120, 0), 0.7, '#ffffff', 3, 200); }
    else if (k === 'guardGlint') { R.fxs.push({ kind: 'ring', x: e.x, y: e.y - 14, t: 0, life: 0.18, r: 22, col: '200,230,255' }); }
  }
  R.FX = {};
  R.CHIP = { shoji: ['#f1ead8', '#d8d0bb', '#4a2c16'], pillar: ['#7a4a22', '#a0683a', '#4a2610'] };

  function drawFx(c, dt) {
    for (const p of R.parts) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; }
    R.parts = R.parts.filter(p => p.life > 0);
    if (R.parts.length > 500) R.parts.splice(0, R.parts.length - 500);
    for (const p of R.parts) { c.globalAlpha = Math.min(1, p.life / p.max * 1.5); c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    c.globalAlpha = 1;
    for (const f of R.fxs) {
      f.t += dt; const k = f.t / f.life; if (k >= 1) continue;
      if (R.FXDRAW[f.kind]) { R.FXDRAW[f.kind](c, f, k); continue; }
      if (f.kind === 'ring') { c.strokeStyle = 'rgba(' + f.col + ',' + (1 - k) + ')'; c.lineWidth = 3 * (1 - k) + 1; c.beginPath(); c.arc(f.x, f.y, f.r * (0.3 + k), 0, 7); c.stroke(); }
      else if (f.kind === 'star') { c.fillStyle = 'rgba(255,255,255,' + (1 - k) + ')'; const s = 30 * (1 - k * 0.5); c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.25 : s; c.lineTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r); } c.fill(); }
      else if (f.kind === 'slash' || f.kind === 'sweep' || f.kind === 'claw') {
        const arc = (f.arc || 120) * Math.PI / 360, r = (f.range || 40) * 0.9, oy = -f.size * 0.9;
        const col = f.color || (f.kind === 'claw' ? '255,120,120' : '230,245,255');
        for (let j = 0; j < (f.kind === 'claw' ? 3 : 1); j++) {
          const rr = r - j * 6;
          c.strokeStyle = 'rgba(' + col + ',' + (1 - k) + ')'; c.lineWidth = (f.kind === 'sweep' ? 9 : 5) * (1 - k) + 1;
          c.beginPath(); const a0 = f.dir - arc, a1 = f.dir - arc + 2 * arc * Math.min(1, k * 3); c.arc(f.x, f.y + oy, rr, a0, a1); c.stroke();
          c.strokeStyle = 'rgba(255,255,255,' + (1 - k) * 0.9 + ')'; c.lineWidth = 1.5; c.beginPath(); c.arc(f.x, f.y + oy, rr - 3, a0, a1); c.stroke();
        }
      } else if (f.kind === 'thrust' || f.kind === 'smash') {
        const oy = -f.size * 0.9; c.save(); c.translate(f.x, f.y + oy); c.rotate(f.dir);
        c.fillStyle = 'rgba(' + (f.color || '230,245,255') + ',' + (1 - k) + ')'; const len = f.range || 50, wd = f.kind === 'smash' ? (f.width || 30) : 4 * (1 - k) + 1;
        c.fillRect(f.size * 0.5, -wd / 2, len * Math.min(1, k * 4), wd); c.fillStyle = 'rgba(255,255,255,' + (1 - k) + ')'; c.fillRect(f.size * 0.5, -0.75, len * Math.min(1, k * 4), 1.5);
        c.restore();
      }
    }
    R.fxs = R.fxs.filter(f => f.t < f.life);
  }
  R.FXDRAW = {};

  function drawFloats(c, dt) {
    c.textAlign = 'center'; c.font = 'bold 11px monospace';
    for (const f of R.floats) { f.t += dt; const k = f.t / 0.8; c.globalAlpha = Math.max(0, 1 - k); c.fillStyle = '#000'; c.fillText(f.text, f.x + 1, f.y - k * 22 + 1); c.fillStyle = f.color; c.fillText(f.text, f.x, f.y - k * 22); }
    c.globalAlpha = 1; R.floats = R.floats.filter(f => f.t < 0.8);
  }

  function drawClash(c, st) {
    const cl = st.clash, t = performance.now() / 1000;
    c.strokeStyle = 'rgba(255,200,80,.8)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = t * 9 + i; c.beginPath(); c.moveTo(cl.x, cl.y - 16); c.lineTo(cl.x + Math.cos(a) * 26, cl.y - 16 + Math.sin(a) * 26); c.stroke(); }
    c.textAlign = 'center'; c.font = 'bold 14px monospace'; c.fillStyle = '#000'; c.fillText('MASH!', cl.x + 1, cl.y - 49); c.fillStyle = '#ffcf5a'; c.fillText('MASH!', cl.x, cl.y - 50);
    const tot = cl.m[0] + cl.m[1] || 1, w = 70; c.fillStyle = '#000'; c.fillRect(cl.x - w / 2 - 1, cl.y - 44, w + 2, 6);
    c.fillStyle = '#5a9cff'; c.fillRect(cl.x - w / 2, cl.y - 43, w * cl.m[0] / tot, 4); c.fillStyle = '#ff6a5a'; c.fillRect(cl.x - w / 2 + w * cl.m[0] / tot, cl.y - 43, w * cl.m[1] / tot, 4);
  }

  // ---------- HUD ----------
  const lagHp = [0, 0];
  const portraits = {};
  function portrait(id) { if (!portraits[id]) portraits[id] = Art.portrait(id, 40, 'idle0'); return portraits[id]; }
  function drawHud(c, st, view) {
    const hh = R.cam.hudH - R.safe.t, top = R.safe.t, pad = 8 + Math.max(R.safe.l, R.safe.r);
    c.fillStyle = 'rgba(10,6,14,.88)'; c.fillRect(0, 0, sw, R.cam.hudH);
    c.fillStyle = '#c9a23a'; c.fillRect(0, R.cam.hudH - 2, sw, 2);
    const ps = hh - 10, barW = Math.max(80, Math.min(sw / 2 - 64 - pad - ps - 8, 380)), barH = Math.max(10, hh * 0.28);
    st.fighters.slice(0, 2).forEach((f, i) => {
      const right = i === 1, side = right ? -1 : 1, px = right ? sw - pad - ps : pad;
      c.fillStyle = f.team === 0 ? '#1d3e7a' : '#7a1d1d'; c.fillRect(px - 2, top + 3, ps + 4, ps + 4);
      c.fillStyle = '#1a1220'; c.fillRect(px, top + 5, ps, ps);
      c.save(); if (right) { c.translate(px + ps, 0); c.scale(-1, 1); c.drawImage(portrait(f.id), 0, top + 5, ps, ps); } else c.drawImage(portrait(f.id), px, top + 5, ps, ps); c.restore();
      const bx = right ? px - 8 - barW : px + ps + 8, by = top + 6;
      c.fillStyle = '#000'; c.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
      c.fillStyle = '#3a1418'; c.fillRect(bx, by, barW, barH);
      const p = Math.max(0, f.hp / f.maxHp); lagHp[i] = lagHp[i] < p ? p : Math.max(p, lagHp[i] - 0.004);
      const lx = right ? bx + barW * (1 - lagHp[i]) : bx; c.fillStyle = '#ffffff'; c.fillRect(lx, by, barW * lagHp[i], barH);
      const fx2 = right ? bx + barW * (1 - p) : bx; const g = c.createLinearGradient(0, by, 0, by + barH); g.addColorStop(0, p > 0.3 ? '#ffd23f' : '#ff6a3a'); g.addColorStop(1, p > 0.3 ? '#e0901a' : '#c02a1a'); c.fillStyle = g; c.fillRect(fx2, by, barW * p, barH);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(fx2, by, barW * p, 2);
      c.font = 'bold ' + Math.round(Math.max(10, hh * 0.22)) + 'px monospace'; c.textAlign = right ? 'right' : 'left'; c.fillStyle = '#f3e6d0';
      const label = f.def.name.toUpperCase() + (view && view.names ? '  ' + view.names[i] : '');
      c.fillText(label, right ? bx + barW : bx, by + barH + Math.max(12, hh * 0.27));
      // round pips
      for (let k = 0; k < WORLD.ROUNDS_TO_WIN; k++) {
        const cxp = right ? bx + 6 + k * 14 : bx + barW - 6 - k * 14, cyp = by + barH + Math.max(9, hh * 0.2);
        c.fillStyle = '#000'; c.beginPath(); c.arc(cxp, cyp, 5, 0, 7); c.fill();
        c.fillStyle = st.wins[i] > k ? '#ffd23f' : '#3a3040'; c.beginPath(); c.arc(cxp, cyp, 4, 0, 7); c.fill();
      }
    });
    // timer
    c.textAlign = 'center'; c.font = 'bold ' + Math.round(hh * 0.5) + 'px monospace';
    c.fillStyle = '#000'; c.fillText(String(Math.ceil(st.timer)), sw / 2 + 2, top + hh * 0.58 + 2);
    c.fillStyle = st.timer < 10 ? '#ff6a5a' : '#f3e6d0'; c.fillText(String(Math.ceil(st.timer)), sw / 2, top + hh * 0.58);
    c.font = 'bold ' + Math.round(Math.max(9, hh * 0.17)) + 'px monospace'; c.fillStyle = '#c9a23a'; c.fillText('ROUND ' + st.round, sw / 2, top + hh * 0.9);
  }

  // scrolling stadium banner under the HUD
  function drawTicker(c, dt) {
    if (!R.ticker.length) return;
    const y = R.cam.hudH + 2, h = 20;
    c.fillStyle = 'rgba(20,8,10,.85)'; c.fillRect(0, y, sw, h); c.fillStyle = '#c9a23a'; c.fillRect(0, y + h, sw, 1);
    c.font = 'bold 14px monospace'; c.textAlign = 'left';
    let lastEnd = -Infinity;
    for (const t of R.ticker) {
      if (t.x === null) t.x = Math.max(sw, lastEnd + 40);
      t.x -= dt * 260; const w = c.measureText(t.text).width;
      c.fillStyle = t.color; c.fillText('★ ' + t.text + ' ★', t.x, y + 15);
      lastEnd = t.x + w + 30;
    }
    R.ticker = R.ticker.filter(t => t.x + c.measureText(t.text).width + 40 > 0);
  }

  // big centred banners (ROUND 1, FIGHT!, KNOCKOUT!)
  function drawBanner(c, dt) {
    const b = R.banner; if (!b) return; b.t += dt; if (b.t > 1.3) { R.banner = null; return; }
    const k = b.t < 0.15 ? b.t / 0.15 : 1, a = b.t > 1 ? 1 - (b.t - 1) / 0.3 : 1;
    const size = Math.round(Math.min(sw, sh * 1.6) * 0.09 * (2 - k));
    c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.font = 'bold ' + size + 'px monospace';
    const y = R.cam.hudH + (sh - R.cam.hudH) * 0.42;
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, y - size * 0.95, sw, size * 1.3);
    c.fillStyle = '#000'; c.fillText(b.text, sw / 2 + 4, y + 4); c.fillStyle = b.color; c.fillText(b.text, sw / 2, y);
    c.restore();
  }

  // crowd cutaway: the camera briefly cuts to cheering fans
  function drawCrowdCut(c, dt) {
    if (R.crowdCut <= 0) return; R.crowdCut -= dt;
    const k = Math.min(1, R.crowdCut / 0.2, (1.6 - R.crowdCut) / 0.2 + 0.2);
    const w = Math.min(sw * 0.34, 260), h = w * 0.5, x = sw - w - 12 - R.safe.r + (1 - k) * (w + 20), y = R.cam.hudH + 26;
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = '#2a1820'; c.fillRect(x, y, w, h);
    const t = performance.now() / 1000;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) {
      const s = h / 16, px = x + (i + (row % 2) * 0.5) * w / 6.5 - s * 2, jump = Math.max(0, Math.sin(t * 12 + i * 1.7 + row)) * s * 2.2;
      const py = y + h - (3 - row) * s * 5.2 + s * 2 - jump, hs = hash(i * 9 + row * 31);
      c.fillStyle = ['#c0392b', '#2f6fd6', '#e0b040', '#3fa060', '#8e44ad'][Math.floor(hs * 5)]; c.fillRect(px, py + s * 3, s * 4, s * 4);
      c.fillStyle = hs < 0.5 ? '#f0c39a' : '#d9a070'; c.fillRect(px + s * 0.5, py, s * 3, s * 3);
      c.fillStyle = '#1a1418'; c.fillRect(px + s * 0.5, py, s * 3, s);
      c.fillStyle = '#000'; c.fillRect(px + s * 1, py + s * 1.6, s * 0.5, s * 0.5); c.fillRect(px + s * 2.3, py + s * 1.6, s * 0.5, s * 0.5);
      c.fillRect(px + s * 1.3, py + s * 2.3, s * 1.4, s * 0.6);
      c.fillStyle = hs < 0.5 ? '#f0c39a' : '#d9a070'; c.fillRect(px - s * 0.6, py - s * 1.5 - jump * 0.3, s * 0.8, s * 3); c.fillRect(px + s * 3.8, py - s * 1.5 - jump * 0.3, s * 0.8, s * 3);
    }
    c.restore();
    c.strokeStyle = '#c9a23a'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
    c.fillStyle = '#e8483b'; c.fillRect(x + 6, y + 6, 8, 8); c.font = 'bold 10px monospace'; c.textAlign = 'left'; c.fillStyle = '#fff'; c.fillText('CROWD CAM', x + 18, y + 14);
  }

  // ---------- touch controls ----------
  function drawControls(c, st, view) {
    const me = st.fighters[R.local]; if (!me) return;
    const S = Input.state;
    if (S.stick) {
      c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.arc(S.stick.ox, S.stick.oy, 60, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.stroke();
      const dx = S.stick.x - S.stick.ox, dy = S.stick.y - S.stick.oy, d = Math.hypot(dx, dy), m = Math.min(d, 60);
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(S.stick.ox + (d ? dx / d * m : 0), S.stick.oy + (d ? dy / d * m : 0), 26, 0, 7); c.fill();
    } else if (S.touchSeen) {
      c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.arc(110 + R.safe.l, sh - 100 - R.safe.b, 56, 0, 7); c.fill();
      c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.3)'; c.fillText('MOVE', 110 + R.safe.l, sh - 96 - R.safe.b);
    }
    if (!S.touchSeen && !view.showButtons) return;
    for (const k of ['a', 'b', 's']) {
      const b = Input.layout[k], def = me.def[k], cd = Math.max(0, me.cd[k]), held = S.btn[k] !== null;
      const ready = cd <= 0 && !me.ko;
      c.globalAlpha = 0.85;
      c.fillStyle = held ? 'rgba(255,255,255,.4)' : k === 's' ? 'rgba(200,40,40,.42)' : 'rgba(20,20,30,.5)';
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill();
      c.lineWidth = 3; c.strokeStyle = k === 's' ? (ready ? '#ffd23f' : '#666') : 'rgba(255,255,255,.55)'; c.stroke();
      if (cd > 0 && k === 's') {
        const frac = cd / def.cd; c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.moveTo(b.x, b.y); c.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); c.closePath(); c.fill();
      }
      const ic = Art.icon(def.icon, ready ? '#f3e6d0' : '#777'); const is = b.r * (k === 's' ? 0.95 : 0.85);
      c.globalAlpha = ready ? 1 : 0.5; c.drawImage(ic, b.x - is / 2, b.y - is / 2 - 4, is, is);
      c.globalAlpha = 1; c.font = 'bold ' + (k === 's' ? 10 : 9) + 'px monospace'; c.textAlign = 'center'; c.fillStyle = '#fff';
      c.fillText(def.name.toUpperCase(), b.x, b.y + b.r * 0.62);
      if (cd > 0 && k === 's') { c.font = 'bold 15px monospace'; c.fillText(cd.toFixed(1), b.x, b.y + 5); }
    }
    c.globalAlpha = 1;
  }

  R.WEATHER = {};
  R.resetFx = function () { R.parts = []; R.fxs = []; R.floats = []; R.banner = null; R.ticker = []; R.crowdCut = 0; R.excite = 0; lagHp[0] = lagHp[1] = 1; bgArena = null; };
})();
