// YO-KA-MURAI - controls. Left thumb: floating joystick. Right thumb: M1-A, M1-B, SPECIAL. Desktop: WASD + J K L.
'use strict';
const Input = {};
(function () {
  const keys = new Set();
  const st = { stick: null, btn: { a: null, b: null, s: null }, enabled: false, touchSeen: false };
  Input.state = st;
  Input.layout = { a: null, b: null, s: null }; // filled by layout(): {x, y, r} in CSS px

  Input.layoutButtons = function (w, h, safe) {
    const R = Math.max(38, Math.min(56, h * 0.12)), r = R * 0.68;
    const sx = w - safe.r - R - 22, sy = h - safe.b - R - 18;
    Input.layout.s = { x: sx, y: sy, r: R };
    Input.layout.a = { x: sx - R - r - 14, y: sy + 6, r };
    Input.layout.b = { x: sx - R * 0.55 - r * 0.2, y: sy - R - r - 8, r };
  };

  function btnAt(x, y) {
    for (const k of ['s', 'a', 'b']) { const b = Input.layout[k]; if (b && Math.hypot(x - b.x, y - b.y) < b.r * 1.25) return k; }
    return null;
  }

  Input.attach = function (el) {
    el.addEventListener('pointerdown', e => {
      if (!st.enabled) return;
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      if (e.pointerType === 'touch') st.touchSeen = true;
      const k = btnAt(e.clientX, e.clientY);
      if (k) { st.btn[k] = e.pointerId; e.preventDefault(); Input.onPress && Input.onPress(k); return; }
      if (e.clientX < window.innerWidth * 0.5 && !st.stick) { st.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY }; e.preventDefault(); }
    }, { passive: false });
    el.addEventListener('pointermove', e => {
      if (st.stick && st.stick.id === e.pointerId) { st.stick.x = e.clientX; st.stick.y = e.clientY; const R = 60, dx = st.stick.x - st.stick.ox, dy = st.stick.y - st.stick.oy, d = Math.hypot(dx, dy); if (d > R * 1.4) { st.stick.ox = st.stick.x - dx / d * R * 1.4; st.stick.oy = st.stick.y - dy / d * R * 1.4; } }
    });
    const up = e => {
      if (st.stick && st.stick.id === e.pointerId) st.stick = null;
      for (const k of ['a', 'b', 's']) if (st.btn[k] === e.pointerId) st.btn[k] = null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    window.addEventListener('keydown', e => { if (e.repeat) return; keys.add(e.code); });
    window.addEventListener('keyup', e => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); st.stick = null; st.btn = { a: null, b: null, s: null }; });
  };

  Input.read = function () {
    let mx = 0, my = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
    if (mx || my) { const l = Math.hypot(mx, my); mx /= l; my /= l; }
    if (st.stick) {
      const R = 60, dx = st.stick.x - st.stick.ox, dy = st.stick.y - st.stick.oy, d = Math.hypot(dx, dy);
      if (d > 6) { const m = Math.min(1, d / R); mx = dx / d * m; my = dy / d * m; }
    }
    return {
      mx: Math.round(mx * 100) / 100, my: Math.round(my * 100) / 100,
      a: st.btn.a !== null || keys.has('KeyJ') || keys.has('KeyZ'),
      b: st.btn.b !== null || keys.has('KeyK') || keys.has('KeyX'),
      s: st.btn.s !== null || keys.has('KeyL') || keys.has('KeyC') || keys.has('Space'),
    };
  };
  Input.reset = function () { st.stick = null; st.btn = { a: null, b: null, s: null }; keys.clear(); };
  Input.vibrate = function (ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } };
})();
