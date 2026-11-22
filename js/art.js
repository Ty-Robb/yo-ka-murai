// YO-KA-MURAI - pixel art, all drawn in code. Sprites face right; the renderer flips them.
// Poses: idle0 idle1 run0..run3 wind strike strike2 special hit. (KO = idle drawn lying down.)
// One art pixel = one world unit, so all fighters share the same pixel size. Sprites are detailed: 3-tone shading, folds, outline.
'use strict';
const Art = {};
(function () {
  Art.PX = 1; // world units per art pixel
  const cache = new Map();
  Art.POSES = ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'wind', 'strike', 'strike2', 'special', 'hit'];

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  Art.mk = mk;

  // a tiny pixel painter on a grid
  function painter(x) {
    const P = {
      x,
      px(a, b, c) { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), 1, 1); },
      rect(a, b, w, h, c) { if (w <= 0 || h <= 0) return; x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); },
      line(x0, y0, x1, y1, c, t) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); t = t || 1;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for (let i = 0; i < 400; i++) {
          P.rect(x0 - Math.floor((t - 1) / 2), y0 - Math.floor((t - 1) / 2), t, t, c);
          if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
        }
      },
      // line from (x,y) at angle a (radians, 0 = right, positive = down) of length l
      ray(x0, y0, a, l, c, t) { P.line(x0, y0, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l, c, t); return [x0 + Math.cos(a) * l, y0 + Math.sin(a) * l]; },
      circ(cx, cy, r, c) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) P.rect(cx + i, cy + j, 1, 1, c); },
      ell(cx, cy, rx, ry, c) { for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i * i) / (rx * rx + 0.01) + (j * j) / (ry * ry + 0.01) <= 1.05) P.rect(cx + i, cy + j, 1, 1, c); },
    };
    return P;
  }
  Art.painter = painter;

  // outline: draw a 1px dark border around every opaque pixel (classic pixel-art readability)
  function outline(c, col) {
    const w = c.width, h = c.height, x = c.getContext('2d'), d = x.getImageData(0, 0, w, h), s = d.data, o = new Uint8ClampedArray(s);
    const [r, g, b] = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4; if (s[k + 3] > 0) continue;
      let near = false;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < w && jj < h && s[(jj * w + ii) * 4 + 3] > 0) { near = true; break; } }
      if (near) { o[k] = r; o[k + 1] = g; o[k + 2] = b; o[k + 3] = 255; }
    }
    d.data.set(o); x.putImageData(d, 0, 0);
  }

  // ---------- drawing kit ----------
  // filled polygon (scanline, pixel centres)
  function poly(P, pts, c) {
    let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    P.x.fillStyle = c;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) { const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]); if (xb > xa) P.x.fillRect(xa, y, xb - xa, 1); }
    }
  }
  Art.poly = poly;
  // tapered limb from (x0,y0) w0 wide to (x1,y1) w1 wide
  function limb(P, x0, y0, x1, y1, w0, w1, c) {
    const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
    poly(P, [[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]], c);
  }
  Art.limb = limb;
  // limb with light on its upper edge and shadow on its lower edge
  function limb3(P, x0, y0, x1, y1, w0, w1, pal) {
    limb(P, x0, y0, x1, y1, w0, w1, pal[1]);
    const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a), up = ny > 0 ? -1 : 1;
    limb(P, x0 - nx * up * (w0 / 2 - 0.6), y0 - ny * up * (w0 / 2 - 0.6), x1 - nx * up * (w1 / 2 - 0.6), y1 - ny * up * (w1 / 2 - 0.6), 1.2, 1.2, pal[2]);
    limb(P, x0 + nx * up * (w0 / 2 - 0.8), y0 + ny * up * (w0 / 2 - 0.8), x1 + nx * up * (w1 / 2 - 0.8), y1 + ny * up * (w1 / 2 - 0.8), 1.6, 1.6, pal[0]);
  }
  Art.limb3 = limb3;
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const along = (p, a, d) => [p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d];
  Art.along = along;

  // Pose numbers shared by humanoid fighters
  function poseInfo(pose) {
    const p = { bob: 0, legF: 0, legB: 0, lean: 0, arm: 'idle', run: false, crouch: 0 };
    if (pose === 'idle1') p.bob = 1;
    if (pose.startsWith('run')) { const k = +pose[3]; p.run = true; p.legF = [5, 1, -4, 1][k]; p.legB = -p.legF; p.bob = k % 2 ? 0 : 1; p.lean = 2; }
    if (pose === 'wind') { p.arm = 'wind'; p.lean = -2; p.legF = 2; p.legB = -3; p.crouch = 1; }
    if (pose === 'strike') { p.arm = 'strike'; p.lean = 4; p.legF = 6; p.legB = -4; p.crouch = 2; }
    if (pose === 'strike2') { p.arm = 'strike2'; p.lean = 3; p.legF = 4; p.legB = -3; p.crouch = 1; }
    if (pose === 'special') { p.arm = 'special'; p.legF = 3; p.legB = -3; p.crouch = 1; }
    if (pose === 'hit') { p.arm = 'hit'; p.lean = -3; p.bob = 1; p.legF = 2; p.legB = -1; }
    return p;
  }
  Art.poseInfo = poseInfo;

  // ---------- shared human parts ----------
  // wide pleated hakama trouser leg + tabi socks and straw sandals. pal = [shadow, base, light]
  function hakamaLeg(P, hipX, hipY, footX, footY, pal, front) {
    poly(P, [[hipX - 4, hipY], [hipX + 4, hipY], [footX + 6, footY - 3], [footX - 5, footY - 3]], pal[1]);
    poly(P, [[hipX - 4, hipY], [hipX - 2, hipY], [footX - 3, footY - 3], [footX - 5, footY - 3]], pal[front ? 2 : 0]);
    P.line(hipX + 1, hipY + 2, footX + 1, footY - 4, pal[0]); P.line(hipX + 3, hipY + 3, footX + 4, footY - 4, pal[0]);
    P.rect(footX - 5, footY - 4, 12, 1, pal[0]); // hem
    // tabi + waraji
    P.rect(footX - 2, footY - 3, 5, 2, '#e9e4d8'); P.rect(footX + 3, footY - 2, 2, 1, '#e9e4d8'); P.px(footX - 2, footY - 2, '#b9b2a2');
    P.rect(footX - 3, footY - 1, 9, 1, '#b48c4c'); P.px(footX, footY - 2, '#7a5a2a');
  }
  Art.hakamaLeg = hakamaLeg;

  function katana(P, hx, hy, a, opt) {
    opt = opt || {};
    const back = a + Math.PI, nx = -Math.sin(a), ny = Math.cos(a);
    // tsuka (hilt) with diamond wrap
    for (let i = 0; i <= 7; i++) { const p = along([hx, hy], back, i - 2); P.rect(Math.round(p[0]), Math.round(p[1]), 1, 1, i % 2 ? '#efe7d4' : '#1c1424'); P.px(Math.round(p[0] + nx), Math.round(p[1] + ny), i % 2 ? '#1c1424' : '#6a2030'); }
    const pm = along([hx, hy], back, 6); P.px(Math.round(pm[0]), Math.round(pm[1]), '#c9a23a');
    // tsuba
    const ts = along([hx, hy], a, 2); P.line(ts[0] - nx * 2, ts[1] - ny * 2, ts[0] + nx * 2, ts[1] + ny * 2, '#d8ac3c', 1); P.px(Math.round(ts[0] + nx * 2), Math.round(ts[1] + ny * 2), '#8a6418');
    // blade: steel back, bright edge, hamon line, tapered tip
    const L = opt.len || 24, b0 = along([hx, hy], a, 3);
    const tip = along(b0, a, L);
    P.line(b0[0], b0[1], tip[0], tip[1], '#c8d6e6');
    P.line(b0[0] + nx, b0[1] + ny, tip[0] + nx * 0.4 - Math.cos(a) * 2, tip[1] + ny * 0.4 - Math.sin(a) * 2, '#f6faff');
    P.line(b0[0] - nx * 0.6, b0[1] - ny * 0.6, tip[0] - nx * 0.6 - Math.cos(a) * 4, tip[1] - ny * 0.6 - Math.sin(a) * 4, '#7f93aa');
    P.px(Math.round(tip[0]), Math.round(tip[1]), '#ffffff');
  }
  Art.katana = katana;

  // ---------- fighter art specs: draw(P, pose) ----------
  Art.SPECS = {};

  // ITSUBE - wandering samurai: black kimono, flat plate-shaped straw jingasa, wheat stalk, katana
  Art.SPECS.itsube = {
    w: 64, h: 60, ox: 21,
    draw(P, pose) {
      const q = poseInfo(pose), fy = 58, cx = 21, L = q.lean, top = 2 + q.bob + q.crouch;
      const KIM = ['#0d0d15', '#1b1b29', '#34344e'], KIMr = '#4c4c70', HAK = ['#1d1f2c', '#2d3044', '#444a66'];
      const SK = ['#b97a55', '#eebf96', '#fcdcba'], HAT = ['#8c6628', '#c89c4c', '#e8c97e'];
      const hip = top + 33;
      // ---- saya (scabbard) at the hip, angled back ----
      P.line(cx - 4 + L * 0.5, hip - 2, cx - 17 + L * 0.3, hip + 7, '#14101c', 2); P.line(cx - 4 + L * 0.5, hip - 3, cx - 16 + L * 0.3, hip + 5, '#3a3450');
      P.rect(cx - 18 + L * 0.3, hip + 7, 2, 2, '#c9a23a');
      // ---- legs ----
      hakamaLeg(P, cx - 3 + L * 0.4, hip, cx - 3 + q.legB, fy, [HAK[0], '#24263a', HAK[1]], false);
      hakamaLeg(P, cx + 3 + L * 0.4, hip, cx + 3 + q.legF, fy, HAK, true);
      // ---- back sleeve (hangs behind body) ----
      const shB = [cx - 3 + L, top + 19], shF = [cx + 4 + L, top + 19];
      poly(P, [[shB[0] - 2, shB[1]], [shB[0] + 3, shB[1]], [shB[0] + 2, shB[1] + 12], [shB[0] - 4, shB[1] + 13]], KIM[0]);
      // ---- torso: black kimono ----
      poly(P, [[cx - 6 + L, top + 18], [cx + 7 + L, top + 18], [cx + 8 + L * 0.6, hip + 1], [cx - 7 + L * 0.6, hip + 1]], KIM[1]);
      poly(P, [[cx - 6 + L, top + 18], [cx - 3 + L, top + 18], [cx - 4 + L * 0.6, hip + 1], [cx - 7 + L * 0.6, hip + 1]], KIM[0]);
      P.line(cx + 6 + L, top + 19, cx + 7 + L * 0.6, hip - 1, KIM[2]); P.line(cx + 5 + L, top + 21, cx + 5 + L * 0.7, top + 27, KIMr);
      P.line(cx - 1 + L, top + 22, cx - 2 + L * 0.7, hip - 4, KIM[0]); // fold
      // white under-collar V and black lapels
      P.line(cx + 1 + L, top + 18, cx + 3 + L, top + 25, '#e8e2d2'); P.line(cx + 5 + L, top + 18, cx + 3 + L, top + 25, '#e8e2d2');
      P.line(cx + 2 + L, top + 18, cx + 3 + L, top + 22, '#b8b0a0'); P.line(cx + 4 + L, top + 18, cx + 3 + L, top + 23, '#a8a090');
      P.line(cx + L, top + 18, cx + 3 + L, top + 27, KIM[2]); P.line(cx + 6 + L, top + 18, cx + 3 + L, top + 27, KIMr);
      // obi (sash) with knot
      const oy = hip - 4;
      poly(P, [[cx - 7 + L * 0.7, oy], [cx + 8 + L * 0.7, oy], [cx + 8 + L * 0.6, oy + 4], [cx - 7 + L * 0.6, oy + 4]], '#7a2430');
      P.line(cx - 6 + L * 0.7, oy, cx + 7 + L * 0.7, oy, '#a83a46'); P.line(cx - 6 + L * 0.6, oy + 3, cx + 7 + L * 0.6, oy + 3, '#4c1520');
      P.rect(cx + 5 + L * 0.7, oy + 1, 2, 2, '#c24a56'); P.px(cx + 6 + L * 0.7, oy + 4, '#7a2430'); P.px(cx + 7 + L * 0.7, oy + 5, '#7a2430');
      // ---- head ----
      const hx = cx + 1 + L, hy = top + 7; // top-left of face box
      const tilt = q.arm === 'hit' ? -1 : 0;
      P.rect(hx + 2, hy + 10, 4, 3, SK[0]); // neck
      poly(P, [[hx, hy + 2], [hx + 9, hy + 1], [hx + 10, hy + 8], [hx + 7, hy + 11], [hx + 2, hy + 11], [hx, hy + 8]], SK[1]);
      P.rect(hx + 1, hy + 4, 2, 6, SK[0]); P.px(hx + 9, hy + 6, SK[2]); P.px(hx + 8, hy + 3, SK[2]);
      P.rect(hx + 10, hy + 6, 1, 2, SK[1]); P.px(hx + 10, hy + 7, SK[0]); // nose
      // eye (calm, half-lidded) + brow
      if (q.arm === 'hit') { P.line(hx + 6, hy + 6, hx + 8, hy + 5, '#2a1414'); }
      else { P.rect(hx + 6, hy + 5, 3, 2, '#f4f0e8'); P.rect(hx + 7, hy + 5, 2, 2, '#1e1218'); P.line(hx + 6, hy + 4, hx + 9, hy + 4, '#2a1414'); P.px(hx + 8, hy + 5, '#5a6a8a'); }
      P.line(hx + 5, hy + 3 + tilt, hx + 9, hy + 2 + tilt, '#1a1010');
      P.line(hx + 7, hy + 9, hx + 9, hy + 9, '#9a5a44'); // mouth
      // ear + hair (shaggy black, sticking out behind under the hat)
      P.rect(hx + 2, hy + 5, 2, 3, SK[0]); P.px(hx + 3, hy + 6, '#9a5a44');
      poly(P, [[hx - 3, hy], [hx + 3, hy], [hx + 2, hy + 4], [hx + 1, hy + 10], [hx - 1, hy + 13], [hx - 3, hy + 10], [hx - 5, hy + 12], [hx - 5, hy + 6]], '#15111c');
      P.line(hx - 2, hy + 2, hx - 3, hy + 9, '#3a3450'); P.line(hx, hy + 3, hx - 1, hy + 10, '#2a2438'); P.px(hx - 5, hy + 12, '#2a2438');
      P.rect(hx + 3, hy + 2, 6, 1, '#15111c'); P.px(hx + 9, hy + 3, '#15111c'); // fringe under hat
      // wheat stalk from the corner of the mouth
      if (q.arm !== 'hit') {
        P.line(hx + 9, hy + 9, hx + 17, hy + 7, '#d6b452'); P.line(hx + 10, hy + 10, hx + 16, hy + 8, '#9c7a26');
        P.px(hx + 17, hy + 6, '#f2d98a'); P.px(hx + 18, hy + 7, '#e2c060'); P.px(hx + 18, hy + 5, '#f2d98a'); P.px(hx + 19, hy + 6, '#c9a240'); P.px(hx + 16, hy + 6, '#c9a240');
      }
      // ---- jingasa: wide, flat, plate-shaped straw hat ----
      const ax = hx + 4, ay = top - 1;
      poly(P, [[ax - 16, ay + 8], [ax - 5, ay + 4], [ax, ay + 3], [ax + 5, ay + 4], [ax + 16, ay + 8], [ax + 15, ay + 10], [ax - 15, ay + 10]], HAT[1]);
      poly(P, [[ax - 16, ay + 8], [ax - 5, ay + 4], [ax, ay + 3], [ax - 2, ay + 9], [ax - 15, ay + 10]], HAT[2]);
      for (let k = -13; k <= 13; k += 3) P.line(ax + k * 0.25, ay + 4, ax + k, ay + 9, k < 0 ? '#d4b064' : '#a8802e'); // weave
      P.line(ax - 9, ay + 6, ax + 9, ay + 6, '#b38a3a'); // woven ring
      P.line(ax - 15, ay + 10, ax + 15, ay + 10, HAT[0]); P.line(ax - 12, ay + 11, ax + 12, ay + 11, '#5a3e16'); // underside rim
      P.rect(ax - 1, ay + 2, 3, 2, '#8c6628'); P.px(ax, ay + 2, '#e8c97e'); // knob
      P.rect(hx + 1, hy + 2, 9, 1, SK[0]); // hat shadow on face
      P.line(hx + 3, hy + 3, hx + 5, hy + 11, '#4a3018'); // chin cord
      // ---- arms + katana ----
      let hand, a;
      switch (q.arm) {
        case 'wind': hand = [cx - 1 + L, top + 24]; a = -0.15; break;
        case 'strike': hand = [cx + 15 + L, top + 22]; a = 0; break;
        case 'strike2': hand = [cx + 12 + L, top + 27]; a = 0.85; break;
        case 'special': hand = [cx + 9 + L, top + 29]; a = -1.42; break;
        case 'hit': hand = [cx + 2 + L, top + 30]; a = 2.3; break;
        default: hand = q.run ? [cx + 6 + L, top + 30] : [cx + 9 + L, top + 29]; a = q.run ? 2.75 : 0.32;
      }
      const hand2 = along(hand, a + Math.PI, 3.5);
      // back arm (darker) reaching the hilt
      const elB = [(shB[0] + hand2[0]) / 2 - 1, Math.max(shB[1], hand2[1]) + 3];
      limb3(P, shB[0] + 2, shB[1] + 1, elB[0], elB[1], 5, 5, [KIM[0], KIM[0], KIM[1]]);
      limb3(P, elB[0], elB[1], hand2[0], hand2[1], 4, 3, [KIM[0], KIM[0], KIM[1]]);
      P.rect(Math.round(hand2[0]) - 1, Math.round(hand2[1]) - 1, 3, 3, SK[0]);
      if (q.arm !== 'special' && q.arm !== 'wind') katana(P, hand[0], hand[1], a);
      // front arm in a wide kimono sleeve
      const elF = [(shF[0] + hand[0]) / 2 + 1, Math.max(shF[1], hand[1]) + 2];
      limb3(P, shF[0], shF[1], elF[0], elF[1], 7, 6, KIM);
      poly(P, [[elF[0] - 3, elF[1]], [elF[0] + 3, elF[1] + 1], [elF[0] + 1, elF[1] + 7], [elF[0] - 4, elF[1] + 6]], KIM[1]); // sleeve drape
      P.line(elF[0] - 4, elF[1] + 6, elF[0] + 1, elF[1] + 7, KIM[0]); P.line(elF[0] - 3, elF[1] + 1, elF[0] - 4, elF[1] + 5, KIMr);
      limb3(P, elF[0], elF[1], hand[0], hand[1], 5, 4, KIM);
      P.rect(Math.round(hand[0]) - 1, Math.round(hand[1]) - 2, 3, 3, SK[1]); P.px(Math.round(hand[0]) + 1, Math.round(hand[1]) - 2, SK[2]);
      if (q.arm === 'special' || q.arm === 'wind') katana(P, hand[0], hand[1], a);
    },
  };

  // ---------- sprite cache ----------
  Art.frame = function (id, pose, white) {
    const key = id + ':' + pose + (white ? ':w' : '');
    let c = cache.get(key); if (c) return c;
    const spec = Art.SPECS[id];
    if (white) {
      const base = Art.frame(id, pose, false); const [wc, wx] = mk(base.width, base.height);
      wx.drawImage(base, 0, 0); wx.globalCompositeOperation = 'source-in'; wx.fillStyle = '#ffffff'; wx.fillRect(0, 0, wc.width, wc.height);
      cache.set(key, wc); return wc;
    }
    const pad = 1; const [cv, x] = mk(spec.w + pad * 2, spec.h + pad * 2);
    x.translate(pad, pad); spec.draw(painter(x), pose); x.setTransform(1, 0, 0, 1, 0, 0);
    outline(cv, spec.outline || '#0a0710');
    cv.ox = spec.ox + pad; cv.oy = spec.h - 1 + pad; // feet anchor
    cache.set(key, cv); return cv;
  };

  // portrait for cards and HUD: idle0 frame scaled into a box
  Art.portrait = function (id, size, pose) {
    const f = Art.frame(id, pose || 'idle0'); const [c, x] = mk(size, size);
    const s = Math.max(1, Math.floor(Math.min(size / f.width, size / f.height) * 0.95));
    x.drawImage(f, Math.round((size - f.width * s) / 2), Math.round(size - f.height * s), f.width * s, f.height * s); return c;
  };

  // ability icons (16x16 pixel art)
  Art.icon = function (name, col) {
    const key = 'icon:' + name + col; let c = cache.get(key); if (c) return c;
    const [cv, x] = mk(16, 16); const P = painter(x); const L = col || '#f3e6d0';
    switch (name) {
      case 'thrust': P.line(2, 13, 13, 2, L); P.line(3, 13, 13, 3, L); P.rect(3, 10, 3, 3, '#c9a23a'); break;
      case 'slash': for (let i = 0; i < 10; i++) { const a = -2.4 + i * 0.25; P.px(8 + Math.cos(a) * 6, 9 + Math.sin(a) * 6, L); P.px(8 + Math.cos(a) * 5, 9 + Math.sin(a) * 5, L); } break;
      case 'guard': P.line(8, 1, 8, 12, L); P.line(7, 1, 7, 12, '#9fb2c2'); P.rect(4, 11, 8, 2, '#c9a23a'); P.rect(7, 13, 2, 3, '#7a4a2a'); break;
      default: P.circ(8, 8, 5, L);
    }
    outline(cv, '#0a0710'); cache.set(key, cv); return cv;
  };
})();
