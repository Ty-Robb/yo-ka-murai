// YO-KA-MURAI - menu screens: title, mode select, character select, arena roulette, pause, results.
'use strict';
const UI = {};
(function () {
  const $ = id => document.getElementById(id);
  UI.$ = $;
  UI.show = function (id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    UI.cur = id;
  };
  UI.toast = function (text, ms) { const t = $('toast'); t.textContent = text; t.style.display = 'block'; clearTimeout(UI._tt); UI._tt = setTimeout(() => t.style.display = 'none', ms || 2200); };
  const click = (id, fn) => $(id).addEventListener('click', e => { Sfx.unlock(); Sfx.play('click'); fn(e); });
  UI.click = click;

  // ---------- character cards ----------
  UI.buildCards = function (onPick, opts) {
    opts = opts || {};
    for (const fac of ['warrior', 'yokai']) {
      const box = $('c-' + fac); box.innerHTML = '';
      const ids = Object.keys(FIGHTERS).filter(id => FIGHTERS[id].faction === fac);
      ids.sort((a, b) => SIZES[FIGHTERS[a].size].idx - SIZES[FIGHTERS[b].size].idx);
      for (const id of ids) {
        const f = FIGHTERS[id], card = document.createElement('div');
        card.className = 'card' + (ROSTER.includes(id) ? '' : ' locked'); card.dataset.id = id;
        const pt = Art.portrait(id, 64); pt.className = 'pt';
        card.appendChild(pt);
        const info = document.createElement('div'); info.className = 'info';
        info.innerHTML = `<div class="nm">${f.name}</div><div class="meta">${f.weapon} &middot; ${SIZES[f.size].label}</div><div class="blurb">${f.blurb}</div>`;
        const ab = document.createElement('div'); ab.className = 'abil';
        for (const k of ['a', 'b', 's']) { const ic = Art.icon(f[k].icon); const cc = document.createElement('canvas'); cc.width = 16; cc.height = 16; cc.getContext('2d').drawImage(ic, 0, 0); cc.title = f[k].name; ab.appendChild(cc); const sp = document.createElement('span'); sp.textContent = f[k].name; sp.style.cssText = 'font-size:.85em;opacity:.8;margin-right:3px;align-self:center'; ab.appendChild(sp); }
        info.appendChild(ab); card.appendChild(info);
        const tb = document.createElement('div'); tb.className = 'tier'; tb.textContent = f.tier; tb.style.background = TIERS[f.tier].color; card.appendChild(tb);
        card.addEventListener('click', () => { Sfx.unlock(); Sfx.play('select'); onPick(id); });
        box.appendChild(card);
      }
    }
  };
  UI.markCard = function (id) { document.querySelectorAll('.card').forEach(c => c.classList.toggle('on', c.dataset.id === id)); };

  // ---------- arena roulette ----------
  UI.roulette = function (finalId, done) {
    UI.show('roulette');
    const names = ARENA_LIST.map(a => ARENAS[a].name.toUpperCase());
    const reel = $('reel'), sub = $('reelsub'); sub.textContent = '';
    let i = Math.floor(Math.random() * names.length), delay = 50, total = 0;
    const target = ARENA_LIST.indexOf(finalId);
    const tick = () => {
      i = (i + 1) % names.length; reel.textContent = names[i]; Sfx.play('roulette'); total += delay;
      if (total > 1500 && i === target && delay > 180) { reel.style.color = '#ffd23f'; sub.textContent = ARENAS[finalId].sub; Sfx.play('gong'); setTimeout(done, 1100); return; }
      if (total > 900) delay *= 1.18;
      reel.style.color = '#fff'; setTimeout(tick, delay);
    };
    tick();
  };

  // ---------- results ----------
  UI.results = function (st, me, opts) {
    const w = st.fighters[st.winner], won = st.winner === me;
    $('r-title').textContent = won ? 'VICTORY' : 'DEFEAT'; $('r-title').style.color = won ? '#ffd23f' : '#ff6a5a';
    $('r-name').textContent = w.def.name.toUpperCase() + ' WINS THE DUEL';
    const c = $('winpose'), x = c.getContext('2d'); x.clearRect(0, 0, 140, 140); x.imageSmoothingEnabled = false;
    const pose = w.def.s.kind === 'guard' ? 'special' : 'strike';
    x.drawImage(Art.portrait(w.id, 140, pose), 0, 0);
    const rows = [['', st.fighters[0].def.name, st.fighters[1].def.name]];
    rows.push(['Damage dealt', ...st.fighters.map(f => Math.round(f.stats.dmg))]);
    rows.push(['Parries', ...st.fighters.map(f => f.stats.parries)]);
    rows.push(['Blade clashes won', ...st.fighters.map(f => f.stats.clashes)]);
    rows.push(['Rounds', ...st.wins]);
    $('r-stats').innerHTML = rows.map(r => r.map(v => `<div>${v}</div>`).join('')).join('');
    $('r-wait').textContent = (opts && opts.wait) || '';
    UI.show('results');
    Sfx.play(won ? 'win' : 'lose');
  };
})();
