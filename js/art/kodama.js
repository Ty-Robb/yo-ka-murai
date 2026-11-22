// KODAMA - tiny pale forest spirit with a rattling round head, hollow eyes and a sprout. Faces right.
(function () {
  'use strict';
  const A = Art;
  // filled ellipse rotated by angle a (radians, positive = clockwise on screen)
  function rell(P, cx, cy, rx, ry, a, c) {
    const R = Math.ceil(Math.max(rx, ry)) + 1, ca = Math.cos(a), sa = Math.sin(a), X = Math.round(cx), Y = Math.round(cy), fx = cx - X, fy = cy - Y;
    P.x.fillStyle = c;
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const dx = i - fx, dy = j - fy, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if ((u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1.02) P.x.fillRect(X + i, Y + j, 1, 1);
    }
  }
  const rot = (c, a, u, v) => [Math.round(c[0] + u * Math.cos(a) - v * Math.sin(a)), Math.round(c[1] + u * Math.sin(a) + v * Math.cos(a))];

  const SK = ['#8fae9a', '#d3e6d2', '#f4fff0'], SKd = '#6f8f7c', GLOW = '#a8f0b8', HOLE = '#121a16', HOLEr = '#33453a';
  const LEAF = ['#3c7a30', '#6cbc4c', '#b4ec84'];

  Art.SPECS.kodama = {
    w: 32, h: 28, ox: 12,
    draw(P, pose) {
      const q = A.poseInfo(pose), fy = 27, cx = 12;
      let L = q.lean * 0.6, top = 1 + q.bob + q.crouch;
      // rattling head tilt
      let tilt = { idle0: 0.2, idle1: 0.05, run0: 0.25, run1: -0.05, run2: 0.2, run3: -0.1, wind: -0.2, strike: 0.75, strike2: 0.15, special: -0.6, hit: -0.5 }[pose] || 0;
      let hc = [cx + 1 + L, top + 7], tc = [cx + L * 0.5, top + 17], ta = L * 0.08;
      let fB = [cx - 2 + q.legB * 0.6, fy], fF = [cx + 2 + q.legF * 0.6, fy];
      let hB, hF;
      const sh = () => [[tc[0] - 1 + ta * 3, tc[1] - 3], [tc[0] + 1.5 + ta * 3, tc[1] - 3]];
      switch (q.arm) {
        case 'wind': hc = [cx - 1, top + 7]; tc = [cx - 1, top + 17]; ta = -0.2; hB = [cx - 6, top + 15]; hF = [cx - 5, top + 13]; break;
        case 'strike': hc = [cx + 10, top + 12]; tc = [cx + 3, top + 17]; ta = 0.95; fB = [cx - 6, fy]; fF = [cx + 4, fy]; hB = [cx - 4, top + 17]; hF = [cx - 2, top + 19]; break;
        case 'strike2': hc = [cx + 2, top + 7]; tc = [cx + 1, top + 17]; ta = 0.15; hB = [cx - 4, top + 20]; hF = [cx + 11, top + 12]; break;
        case 'special': hc = [cx - 1, top + 6]; tc = [cx, top + 17]; ta = -0.15; hB = [cx - 8, top + 9]; hF = [cx + 8, top + 9]; fB = [cx - 4, fy]; fF = [cx + 4, fy]; break;
        case 'hit': hc = [cx - 2, top + 7]; tc = [cx - 1, top + 17]; ta = -0.3; hB = [cx - 7, top + 12]; hF = [cx + 4, top + 10]; break;
        default: {
          const sw = q.run ? q.legF * 0.5 : 0;
          hB = [cx - 3 - sw + L * 0.5, top + 21 + q.bob * 0]; hF = [cx + 4 + sw + L * 0.5, top + 21];
        }
      }
      const [sB, sF] = sh();
      const hip = [tc[0] + ta * -2, tc[1] + 3];
      const arm = (s, h, back) => {
        const el = [(s[0] + h[0]) / 2 - (back ? 0.5 : 0), (s[1] + h[1]) / 2 + 1];
        const pal = back ? [SKd, SK[0], SK[1]] : SK;
        A.limb3(P, s[0], s[1], el[0], el[1], 2.2, 2, pal); A.limb3(P, el[0], el[1], h[0], h[1], 2, 1.6, pal);
        P.rect(Math.round(h[0]) - 1, Math.round(h[1]) - 1, 2, 2, pal[1]); P.px(Math.round(h[0]), Math.round(h[1]) - 1, pal[2]);
      };
      const leg = (f, back) => {
        const pal = back ? [SKd, SK[0], SK[1]] : SK, hx = hip[0] + (back ? -1 : 1.2);
        const kn = [(hx + f[0]) / 2 + 0.5, (hip[1] + f[1]) / 2];
        A.limb3(P, hx, hip[1], kn[0], kn[1], 3, 2.4, pal); A.limb3(P, kn[0], kn[1], f[0], f[1] - 1, 2.4, 2, pal);
        P.rect(Math.round(f[0]) - 1, f[1] - 1, 3, 1, pal[1]); P.px(Math.round(f[0]) + 2, f[1], pal[0]); P.rect(Math.round(f[0]) - 1, f[1], 3, 1, pal[0]);
      };
      // ---- echo rings (special): sound arcs + spirit motes ----
      if (q.arm === 'special') {
        for (const [r, col] of [[10, '#cdf7d6'], [13, '#9fdcae']]) for (let k = -5; k <= 5; k++) {
          const a = k * 0.12; P.px(hc[0] + Math.cos(a) * r, hc[1] - 1 + Math.sin(a) * r, col); P.px(hc[0] - Math.cos(a) * r, hc[1] - 1 + Math.sin(a) * r, col);
        }
        for (const [x, y] of [[2, 2], [27, 4], [4, 20], [26, 19], [29, 11]]) P.px(x, y, GLOW);
      }
      // ---- back limbs ----
      arm(sB, hB, true); leg(fB, true);
      // ---- torso: small pear body ----
      rell(P, tc[0], tc[1], 3.2, 4.6, ta, SK[0]);
      rell(P, tc[0] + 0.7, tc[1] - 0.4, 2.4, 3.9, ta, SK[1]);
      rell(P, tc[0] + 1.2, tc[1] - 1.5, 1, 1.8, ta, SK[2]);
      P.px(tc[0] - 2 + ta * 2, tc[1] + 2, GLOW); // faint green glow on the shadow edge
      leg(fF, false);
      // ---- head ----
      rell(P, hc[0], hc[1], 6.6, 5.6, tilt, SK[0]);
      rell(P, hc[0] + 0.8, hc[1] - 0.7, 5.6, 4.7, tilt, SK[1]);
      { const g = rot(hc, tilt, 2.2, -2.4); rell(P, g[0], g[1], 2.4, 1.4, tilt, SK[2]); const g2 = rot(hc, tilt, 3, -3); P.px(g2[0], g2[1], '#ffffff'); }
      { const g = rot(hc, tilt, -5, 2); P.px(g[0], g[1], GLOW); const g2 = rot(hc, tilt, -4, 3.5); P.px(g2[0], g2[1], GLOW); }
      // knotty bumps on the skull
      for (const [u, v] of [[-3, -3], [-1, -4], [-4, 0], [0, 3.5], [-2, 2]]) { const b = rot(hc, tilt, u, v); P.px(b[0], b[1], SKd); }
      // hollow eyes + mouth (holes): near eye bigger, far eye toward the right edge
      const hole = (u, v, w, h) => {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = rot(hc, tilt, u + i, v + j); P.px(p[0], p[1], j === 0 && i === 0 ? HOLEr : HOLE); }
        const r = rot(hc, tilt, u, v + h); P.px(r[0], r[1], SK[2]); // pale lip under the hole
      };
      if (q.arm === 'hit') { hole(0, -1, 2, 2); hole(3.5, -1, 2, 2); hole(1.5, 1.8, 3, 3); }
      else if (q.arm === 'special') { hole(0, -1, 2, 3); hole(3.5, -1, 2, 3); hole(1.6, 2, 2, 3); }
      else { hole(0, -1, 2, 3); hole(3.5, -1, 2, 2); hole(2, 2.5, 2, 1); }
      // sprout: stem + two leaves
      const s0 = rot(hc, tilt, 0.5, -5.6), s1 = rot(hc, tilt - 0.25, 0.5, -8.6);
      P.line(s0[0], s0[1], s1[0], s1[1], '#4c8a3a');
      const lr = rot(hc, tilt, 3.5, -9.6), ll = rot(hc, tilt, -2.5, -9);
      A.limb(P, s1[0], s1[1], lr[0], lr[1], 2.2, 1, LEAF[1]); P.px(lr[0], lr[1], LEAF[2]); P.px(Math.round((s1[0] + lr[0]) / 2), Math.round((s1[1] + lr[1]) / 2) - 1, LEAF[2]);
      A.limb(P, s1[0], s1[1], ll[0], ll[1], 1.8, 1, LEAF[0]); P.px(s1[0], s1[1], LEAF[1]);
      // ---- front arm ----
      arm(sF, hF, false);
      // seed flick: seed + speed streak
      if (q.arm === 'strike2') {
        P.line(hF[0] + 2, hF[1] - 1, hF[0] + 6, hF[1] - 2, '#cdf7d6'); P.rect(hF[0] + 7, hF[1] - 3, 2, 2, '#8a5a2a'); P.px(hF[0] + 8, hF[1] - 3, '#d0a060'); P.px(hF[0] + 9, hF[1] - 4, LEAF[1]);
      }
      if (q.arm === 'strike') for (let k = 0; k < 3; k++) P.px(hc[0] + 8, hc[1] - 3 + k * 3, '#e8fff0'); // impact ticks
    },
  };
})();
