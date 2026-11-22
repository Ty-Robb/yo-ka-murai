// YO-KA-MURAI - game controller: screen flow, the fixed-step loop, vs-AI matches.
'use strict';
const Game = {};
(function () {
  const $ = UI.$;
  const G = Game;
  G.st = null; G.mode = 'menu'; G.paused = false; G.local = 0; G.bot = null; G.cfg = null; G.overT = 0;
  G.pick = { me: null, bot: null, diff: 'normal', step: 'me', kind: 'ai' };
  const canvas = $('game');
  Render.init(canvas); Input.attach(canvas);
  window.addEventListener('resize', () => Render.resize());
  window.addEventListener('orientationchange', () => setTimeout(() => Render.resize(), 200));
  $('mute').textContent = Sfx.muted ? 'MUTED' : 'SOUND';
  const muteLabel = () => { $('mute').textContent = Sfx.muted ? 'MUTED' : 'SOUND'; $('p-mute').textContent = 'SOUND: ' + (Sfx.muted ? 'OFF' : 'ON'); };
  const toggleMute = () => { Sfx.unlock(); Sfx.setMuted(!Sfx.muted); muteLabel(); };
  $('mute').addEventListener('click', toggleMute); $('p-mute').addEventListener('click', toggleMute); muteLabel();

  // ---------- menus ----------
  UI.click('play', () => { goFullscreen(); UI.show('mode'); Sfx.music(true, 0); });
  UI.click('m-back', () => UI.show('title'));
  UI.click('m-ai', () => openSelect('ai'));
  G.openSelect = openSelect;
  if (typeof Online === 'undefined') { $('m-create').disabled = true; $('m-join').disabled = true; }

  function goFullscreen() {
    const d = document.documentElement;
    if (window.matchMedia('(pointer:coarse)').matches && d.requestFullscreen && !document.fullscreenElement) d.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { screen.orientation.lock('landscape'); } catch (e) { } }).catch(() => { });
  }

  function openSelect(kind) {
    G.pick.kind = kind; G.pick.step = 'me'; G.pick.me = null; G.pick.bot = null;
    $('s-diff').style.display = 'none'; $('s-title').textContent = 'CHOOSE YOUR FIGHTER'; $('s-status').textContent = '';
    UI.buildCards(id => {
      if (G.pick.step === 'me') G.pick.me = id; else G.pick.bot = id;
      UI.markCard(id);
      if (G.pick.kind !== 'ai' && G.onLobbyPick) G.onLobbyPick(id);
    });
    UI.show('select');
  }
  UI.click('s-back', () => {
    if (G.pick.kind === 'ai' && G.pick.step === 'bot') { G.pick.step = 'me'; $('s-diff').style.display = 'none'; $('s-title').textContent = 'CHOOSE YOUR FIGHTER'; UI.markCard(G.pick.me); return; }
    if (G.pick.kind !== 'ai' && G.onLobbyBack) { G.onLobbyBack(); return; }
    UI.show('mode');
  });
  UI.click('s-random', () => { G.pick.bot = 'random'; UI.markCard(null); $('s-random').classList.add('sel'); });
  document.querySelectorAll('#s-diff [data-d]').forEach(b => b.addEventListener('click', () => {
    Sfx.play('click'); G.pick.diff = b.dataset.d; document.querySelectorAll('#s-diff [data-d]').forEach(x => x.classList.toggle('sel', x === b));
  }));
  UI.click('s-go', () => {
    if (G.pick.kind !== 'ai') { if (G.onLobbyReady) G.onLobbyReady(); return; }
    if (G.pick.step === 'me') {
      if (!G.pick.me) { UI.toast('Pick a fighter first'); return; }
      G.pick.step = 'bot'; G.pick.bot = 'random'; $('s-random').classList.add('sel'); UI.markCard(null);
      $('s-diff').style.display = 'flex'; $('s-title').textContent = 'CHOOSE YOUR OPPONENT'; return;
    }
    $('s-random').classList.remove('sel');
    let bot = G.pick.bot; if (!bot || bot === 'random') bot = U.pick(ROSTER);
    const arena = U.pick(ARENA_LIST);
    UI.roulette(arena, () => G.startLocal(G.pick.me, bot, G.pick.diff, arena));
  });
  document.querySelectorAll('.card').forEach(() => { });
  $('c-warrior').addEventListener('click', () => $('s-random').classList.remove('sel'));
  $('c-yokai').addEventListener('click', () => $('s-random').classList.remove('sel'));

  // pause
  $('pausebtn').addEventListener('click', () => G.pause(true));
  window.addEventListener('keydown', e => { if (e.code === 'Escape' && G.mode === 'match') G.pause(!G.paused); });
  UI.click('p-resume', () => G.pause(false));
  UI.click('p-quit', () => G.quit());
  G.pause = function (on) {
    if (G.mode !== 'match') return;
    if (G.net) { if (on) { UI.show('pause'); G.pausedMenu = true; } else { UI.show(null); G.pausedMenu = false; } return; } // online: the duel keeps running
    G.paused = on; UI.show(on ? 'pause' : null); Input.reset();
  };
  G.quit = function () {
    if (G.net && G.net.leave) G.net.leave();
    G.mode = 'menu'; G.st = null; G.paused = false; G.net = null; Input.state.enabled = false; $('pausebtn').style.display = 'none'; $('mute').style.display = '';
    Sfx.music(true, 0); UI.show('mode');
  };
  UI.click('r-menu', () => G.quit());
  UI.click('r-rematch', () => { if (G.net) { G.net.rematch(); return; } const c = G.cfg; const arena = U.pick(ARENA_LIST); UI.roulette(arena, () => G.startLocal(c.me, c.bot, c.diff, arena)); });

  // ---------- matches ----------
  G.begin = function (st, local) {
    G.st = st; G.local = local; Render.local = local; Render.resetFx(); Render.prepareArena(st.arenaId);
    G.mode = 'match'; G.paused = false; G.acc = 0; G.overT = 0; G.resultsShown = false;
    UI.show(null); $('pausebtn').style.display = 'block'; $('mute').style.display = 'none'; Input.reset(); Input.state.enabled = true; Sfx.music(true, 1);
  };
  G.startLocal = function (me, bot, diff, arena) {
    G.cfg = { me, bot, diff }; G.net = null;
    const st = Sim.create({ fighters: [{ id: me }, { id: bot }], arena });
    G.bot = AI.create(1, diff);
    G.begin(st, 0);
  };

  G.handleEvents = function (events) {
    for (const e of events) {
      if (e.type === 'sfx') Sfx.play(e.name, e.vol);
      else if (e.type === 'haptic') { if (e.who === G.local) Input.vibrate(e.ms); }
      else Render.onEvent(e, G.st);
    }
  };

  // ---------- loop ----------
  let last = performance.now();
  G.acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (G.mode === 'match' && G.st) {
      if (!G.net && !G.paused) {
        G.acc += dt;
        let n = 0;
        while (G.acc >= Sim.DT && n < 6) {
          const inputs = [Input.read(), AI.think(G.bot, G.st)];
          Sim.step(G.st, inputs);
          G.handleEvents(G.st.events); G.st.events.length = 0;
          G.acc -= Sim.DT; n++;
        }
        if (n === 6) G.acc = 0;
      } else if (G.net) G.net.tick(dt);
      Render.draw(G.st, { controls: true, names: G.names }, G.paused ? 0 : dt);
      if (G.st.phase === 'over' && !G.resultsShown) { G.overT += dt; if (G.overT > 1.6) { G.resultsShown = true; Input.state.enabled = false; $('pausebtn').style.display = 'none'; $('mute').style.display = ''; UI.results(G.st, G.local, G.net ? { wait: '' } : null); Sfx.music(true, 0); } }
    } else menuBg(dt);
  }
  requestAnimationFrame(frame);

  // ---------- menu background: night sky, red moon, drifting cherry blossoms ----------
  const petals = []; for (let i = 0; i < 70; i++) petals.push({ x: Math.random(), y: Math.random(), s: U.rnd(2, 5), v: U.rnd(0.03, 0.09), ph: Math.random() * 6 });
  const fighterRow = [];
  function menuBg(dt) {
    const c = canvas.getContext('2d'), { w, h } = Render.size(), d = Math.min(window.devicePixelRatio || 1, 3);
    c.setTransform(d, 0, 0, d, 0, 0); c.imageSmoothingEnabled = false;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#120a24'); g.addColorStop(0.7, '#2a1430'); g.addColorStop(1, '#3a1a22'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const mr = Math.min(w, h) * 0.28; c.fillStyle = '#9e2a22'; c.beginPath(); c.arc(w * 0.5, h * 0.42, mr + 6, 0, 7); c.fill(); c.fillStyle = '#d8402f'; c.beginPath(); c.arc(w * 0.5, h * 0.42, mr, 0, 7); c.fill();
    // distant pagoda silhouettes
    c.fillStyle = '#0c0712';
    for (let i = 0; i < 9; i++) { const bx = (i / 8) * w, bh = h * (0.12 + R(i) * 0.1); c.fillRect(bx - 30, h - bh, 60, bh); c.beginPath(); c.moveTo(bx - 44, h - bh); c.lineTo(bx, h - bh - 20); c.lineTo(bx + 44, h - bh); c.fill(); }
    c.fillRect(0, h * 0.9, w, h * 0.1);
    // a line-up of the roster on the ground
    const ids = Object.keys(FIGHTERS); const sc = Math.max(1, Math.floor(h / 260));
    ids.forEach((id, i) => {
      const f = Art.frame(id, 'idle' + (Math.floor(performance.now() / 500 + i) % 2)); const x = w * (0.5 + (i - (ids.length - 1) / 2) * Math.min(0.11, 0.9 / ids.length)), y = h * 0.92;
      c.save(); c.translate(x, y); if (FIGHTERS[id].faction === 'yokai') c.scale(-1, 1); c.globalAlpha = 0.9; c.drawImage(f, -f.ox * sc, -f.oy * sc, f.width * sc, f.height * sc); c.restore();
    });
    for (const p of petals) {
      p.y += p.v * dt; p.x += Math.sin(p.ph + performance.now() / 900) * 0.0006 + 0.012 * dt; if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); } if (p.x > 1.05) p.x = -0.05;
      c.fillStyle = '#f6b6c8'; c.fillRect(p.x * w, p.y * h, p.s, p.s * 0.7); c.fillStyle = '#f19ab2'; c.fillRect(p.x * w + p.s * 0.5, p.y * h, p.s * 0.5, p.s * 0.7);
    }
  }
  function R(i) { return Render.hash(i * 977 + 13); }
  window.__ykm = { Game, Sim, Render, AI, UI };
})();
