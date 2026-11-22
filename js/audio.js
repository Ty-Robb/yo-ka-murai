// YO-KA-MURAI - all sound is synthesised with WebAudio (no audio files).
'use strict';
const Sfx = {};
(function () {
  let ac = null, master = null, noiseBuf = null, musicGain = null, musicOn = false;
  Sfx.muted = localStorage.getItem('ykm-mute') === '1';
  Sfx.unlock = function () {
    if (!ac) {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      ac = new A(); master = ac.createGain(); master.gain.value = Sfx.muted ? 0 : 0.55; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  };
  Sfx.setMuted = function (m) { Sfx.muted = m; localStorage.setItem('ykm-mute', m ? '1' : '0'); if (master) master.gain.value = m ? 0 : 0.55; };

  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function tone(type, f0, f1, dur, vol, delay, dest) {
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.005, vol, dur); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, ftype, f0, f1, delay, q) {
    const t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = ftype || 'bandpass'; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 1;
    env(g, t, 0.004, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const S = {
    swing: v => noise(0.12, 0.25 * v, 'bandpass', 2400, 900, 0, 1.4),
    throw: v => noise(0.1, 0.18 * v, 'highpass', 3000, 1500),
    windup: v => tone('triangle', 180, 320, 0.15, 0.12 * v),
    hit: v => { noise(0.07, 0.4 * v, 'lowpass', 2200, 400); tone('square', 220, 90, 0.06, 0.1 * v); },
    hitHeavy: v => { noise(0.2, 0.6 * v, 'lowpass', 1600, 120); tone('sine', 120, 40, 0.25, 0.5 * v); },
    clang: v => { [1, 2.76, 5.4, 8.9].forEach((m, i) => tone('sine', 620 * m, 600 * m, 0.6 - i * 0.1, 0.18 * v / (i + 1))); noise(0.05, 0.3 * v, 'highpass', 5000); },
    tink: v => tone('sine', 1800 + Math.random() * 600, 1700, 0.12, 0.12 * v),
    guardUp: v => { noise(0.06, 0.2 * v, 'highpass', 6000); tone('sine', 1400, 1300, 0.15, 0.08 * v); },
    thud: v => tone('sine', 90, 40, 0.18, 0.35 * v),
    crack: v => { noise(0.12, 0.35 * v, 'bandpass', 900, 300, 0, 2); },
    tear: v => noise(0.18, 0.3 * v, 'bandpass', 3500, 1800, 0, 3),
    chop: v => { noise(0.06, 0.4 * v, 'bandpass', 1800, 900, 0, 4); tone('triangle', 400, 200, 0.06, 0.15 * v); },
    timber: v => { noise(0.5, 0.25 * v, 'bandpass', 600, 200, 0, 2); tone('triangle', 300, 80, 0.5, 0.1 * v); },
    gong: v => { [1, 1.5, 2.1, 2.9].forEach((m, i) => tone('sine', 110 * m, 104 * m, 1.6 - i * 0.3, 0.22 * v / (i + 1))); },
    drum: v => { tone('sine', 140, 50, 0.35, 0.6 * v); noise(0.08, 0.3 * v, 'lowpass', 800); tone('sine', 140, 50, 0.3, 0.45 * v, 0.16); },
    ko: v => { tone('sawtooth', 300, 60, 0.8, 0.2 * v); noise(0.5, 0.4 * v, 'lowpass', 1200, 100); },
    cheer: v => { noise(1.2, 0.12 * v, 'bandpass', 1100, 1500, 0, 0.6); noise(1.0, 0.08 * v, 'bandpass', 2400, 2000, 0.1, 0.8); },
    fall: v => tone('triangle', 600, 80, 0.7, 0.2 * v),
    poof: v => noise(0.2, 0.25 * v, 'bandpass', 1200, 3000, 0, 1),
    click: v => tone('square', 880, 660, 0.04, 0.08 * v),
    select: v => { tone('square', 660, 0, 0.06, 0.08 * v); tone('square', 990, 0, 0.08, 0.08 * v, 0.06); },
    roulette: v => tone('square', 1200, 0, 0.03, 0.05 * v),
    win: v => { [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, 0, 0.3, 0.15 * v, i * 0.12)); },
    lose: v => { [392, 330, 262].forEach((f, i) => tone('triangle', f, 0, 0.35, 0.15 * v, i * 0.18)); },
    chain: v => { for (let i = 0; i < 7; i++) noise(0.03, 0.25 * v, 'bandpass', 3500 + Math.random() * 2000, 0, i * 0.035, 6); },
    bowTwang: v => { tone('triangle', 330, 300, 0.25, 0.2 * v); noise(0.08, 0.2 * v, 'highpass', 4000); },
    draw: v => tone('triangle', 200, 420, 1.1, 0.06 * v),
    splash: v => noise(0.35, 0.35 * v, 'bandpass', 900, 2500, 0, 0.8),
    roar: v => { tone('sawtooth', 110, 60, 0.9, 0.35 * v); tone('sawtooth', 116, 58, 0.9, 0.25 * v); noise(0.9, 0.3 * v, 'lowpass', 600, 200); },
    rumble: v => noise(0.6, 0.35 * v, 'lowpass', 220, 120),
    erupt: v => { noise(0.7, 0.7 * v, 'lowpass', 1800, 80); tone('sine', 80, 30, 0.7, 0.6 * v); },
    rattle: v => { for (let i = 0; i < 5; i++) tone('square', 900 + Math.random() * 500, 0, 0.025, 0.06 * v, i * 0.05); },
    bonk: v => tone('square', 700, 300, 0.08, 0.12 * v),
    whirl: v => noise(0.3, 0.3 * v, 'bandpass', 1500, 3000, 0, 1.2),
    hiss: v => noise(0.5, 0.25 * v, 'highpass', 5000, 3000),
  };
  Sfx.play = function (name, vol) {
    if (!ac || Sfx.muted || !S[name]) return;
    try { S[name](vol === undefined ? 1 : vol); } catch (e) { }
  };

  // ---------- music: a slow pentatonic koto-style loop with taiko ----------
  const SCALE = [0, 1, 5, 7, 8]; // in-scale (miyako-bushi)
  let musicTimer = null, step = 0;
  Sfx.music = function (on, intensity) {
    if (!ac) return;
    if (!musicGain) { musicGain = ac.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master); }
    musicGain.gain.setTargetAtTime(on ? 0.5 : 0, ac.currentTime, 0.4);
    Sfx.intensity = intensity || 0;
    if (on && !musicTimer) {
      musicTimer = setInterval(() => {
        if (Sfx.muted) return;
        const s = step++, bar = Math.floor(s / 8) % 4, beat = s % 8;
        const root = [57, 57, 53, 55][bar];
        if (Math.random() < (Sfx.intensity ? 0.75 : 0.5) || beat === 0) {
          const n = root + SCALE[(beat * 3 + bar + Math.floor(Math.random() * 2)) % 5] + (Math.random() < 0.3 ? 12 : 0);
          const f = 440 * Math.pow(2, (n - 69) / 12);
          tone('triangle', f, f * 0.995, 0.6, 0.09, 0, musicGain); tone('sine', f * 2, 0, 0.25, 0.03, 0, musicGain);
        }
        if (Sfx.intensity && (beat === 0 || beat === 3 || beat === 6)) tone('sine', 90, 45, 0.25, beat === 0 ? 0.35 : 0.2, 0, musicGain);
        if (beat === 0 && bar % 2 === 0) tone('sine', 55 * Math.pow(2, (root - 57) / 12), 0, 1.6, 0.08, 0, musicGain);
      }, 230);
    }
    if (!on && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  };
})();
