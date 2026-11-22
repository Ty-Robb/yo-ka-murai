// YO-KA-MURAI - fallback relay (from ISOSCELATED) so players on ANY network (other houses, phones on 4G/5G, strict routers) can play.
// When a direct WebRTC connection can't be made, messages travel through free public MQTT brokers over
// secure WebSockets. Everything after the hello is end-to-end encrypted (ECDH P-256 + AES-GCM) with a key
// that only the host and that one player share, so nobody listening on the broker can read roles or chat.
'use strict';
const Relay = {};
(function () {
  // Mosquitto first: tested lossless at 200 msgs/s. EMQX is a backup only (it throttles to ~10 msgs/s).
  Relay.BROKERS = ['wss://test.mosquitto.org:8081/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
  const ROOT = 'yokamurai/v1/';
  const enc = new TextEncoder(), dec = new TextDecoder();
  Relay.available = () => typeof WebSocket !== 'undefined' && !!(window.crypto && crypto.subtle);

  // ---------- tiny MQTT 3.1.1 client (QoS 0) ----------
  function str(s) { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; }
  function packet(type, body) {
    const len = []; let n = body.length; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
    const out = new Uint8Array(1 + len.length + body.length); out[0] = type; out.set(len, 1); out.set(body, 1 + len.length); return out;
  }
  function Mqtt(url) {
    const self = this; this.url = url; this.subs = new Set(); this.onmsg = null; this.ok = false; this.closed = false; this.pid = 1;
    this.ready = new Promise((res, rej) => {
      let ws; try { ws = new WebSocket(url, 'mqtt'); } catch (e) { rej(e); return; }
      self.ws = ws; ws.binaryType = 'arraybuffer'; let buf = new Uint8Array(0);
      const to = setTimeout(() => { rej(new Error('timeout')); try { ws.close(); } catch (e) { } }, 7000);
      ws.onopen = () => {
        const id = 'ykm' + Math.random().toString(36).slice(2, 12);
        ws.send(packet(0x10, new Uint8Array([...str('MQTT'), 4, 2, 0, 45, ...str(id)])));
      };
      ws.onmessage = ev => {
        const d = new Uint8Array(ev.data), nb = new Uint8Array(buf.length + d.length); nb.set(buf); nb.set(d, buf.length); buf = nb;
        for (; ;) {
          if (buf.length < 2) break;
          let mul = 1, len = 0, i = 1, b; do { if (i >= buf.length) return; b = buf[i++]; len += (b & 127) * mul; mul *= 128; } while (b & 128);
          if (buf.length < i + len) break;
          const h0 = buf[0], type = h0 >> 4, body = buf.subarray(i, i + len); buf = buf.slice(i + len);
          if (type === 2) { clearTimeout(to); if (body[1] === 0) { self.ok = true; res(self); self.ping = setInterval(() => { try { ws.send(new Uint8Array([0xC0, 0])); } catch (e) { } }, 30000); } else rej(new Error('refused')); }
          else if (type === 3) {
            const tl = (body[0] << 8) | body[1], topic = dec.decode(body.subarray(2, 2 + tl));
            const p = 2 + tl + (((h0 >> 1) & 3) ? 2 : 0); // skip packet id if QoS > 0
            if (self.onmsg) { try { self.onmsg(topic, dec.decode(body.subarray(p))); } catch (e) { console.error(e); } }
          }
        }
      };
      ws.onerror = () => { };
      ws.onclose = () => { clearTimeout(to); self.ok = false; clearInterval(self.ping); if (!self.closed && self.onclose) self.onclose(); rej(new Error('closed')); };
    });
  }
  Mqtt.prototype.sub = function (topic) { this.subs.add(topic); const id = this.pid++ & 0xffff || 1; this.ws.send(packet(0x82, new Uint8Array([id >> 8, id & 255, ...str(topic), 0]))); };
  Mqtt.prototype.pub = function (topic, text) { if (!this.ok) return false; const t = str(topic), p = enc.encode(text); const body = new Uint8Array(t.length + p.length); body.set(t); body.set(p, t.length); try { this.ws.send(packet(0x30, body)); return true; } catch (e) { return false; } };
  Mqtt.prototype.close = function () { this.closed = true; clearInterval(this.ping); try { this.ws.send(new Uint8Array([0xE0, 0])); } catch (e) { } try { this.ws.close(); } catch (e) { } };
  Relay.Mqtt = Mqtt;

  // ---------- crypto helpers ----------
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function keyPair() { const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']); kp.pubB64 = b64(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))); return kp; }
  async function shared(kp, otherB64) {
    const pub = await crypto.subtle.importKey('raw', unb64(otherB64), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, kp.privateKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(key, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)))); return b64(iv) + '.' + b64(ct); }
  async function open(key, s) { const [a, b] = s.split('.'); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(a) }, key, unb64(b)); return JSON.parse(dec.decode(pt)); }

  // a connection object that looks like a PeerJS DataConnection (send / on('data'|'close') / open / close)
  function makeConn() {
    const L = { data: [], close: [] };
    const c = { open: true, relay: true, lastSeen: performance.now(), on(ev, fn) { (L[ev] = L[ev] || []).push(fn); return c; }, _emit(ev, x) { (L[ev] || []).forEach(f => { try { f(x); } catch (e) { console.error(e); } }); } };
    return c;
  }

  // ---------- HOST side ----------
  // Relay.host(code, onConn(conn, code)) -> {codes:Set, addCode(code), close(), ready:Promise}
  Relay.host = function (code, onConn) {
    if (!Relay.available()) return null;
    const H = { codes: new Set(), clients: new Map(), mq: [], closed: false };
    const kpP = keyPair();
    const handle = async (m, topic, text) => {
      const parts = topic.split('/'); const tcode = parts[2]; if (!H.codes.has(tcode) || parts[3] !== 'h') return;
      let env; try { env = JSON.parse(text); } catch (e) { return; } if (!env || typeof env.c !== 'string' || env.c.length > 40) return;
      const key = tcode + '|' + env.c; let cl = H.clients.get(key);
      if (env.k && !cl) { // hello: new encrypted session
        const kp = await kpP; const aes = await shared(kp, env.k).catch(() => null); if (!aes) return;
        const conn = makeConn(); const out = ROOT + tcode + '/c/' + env.c; let chain = Promise.resolve();
        conn.send = msg => { if (!conn.open) return; chain = chain.then(() => seal(aes, msg)).then(s => m.pub(out, JSON.stringify({ e: s }))).catch(() => { }); };
        conn.close = () => { if (!conn.open) return; m.pub(out, JSON.stringify({ bye: 1 })); conn.open = false; H.clients.delete(key); conn._emit('close'); };
        cl = { conn, aes, chain: Promise.resolve() }; H.clients.set(key, cl);
        m.pub(out, JSON.stringify({ k: kp.pubB64 }));
        onConn(conn, tcode);
        return;
      }
      if (!cl) return;
      if (env.bye) { cl.conn.open = false; H.clients.delete(key); cl.conn._emit('close'); return; }
      if (env.e) { cl.chain = cl.chain.then(() => open(cl.aes, env.e)).then(msg => { cl.conn.lastSeen = performance.now(); if (msg && msg.t !== 'ping') cl.conn._emit('data', msg); }).catch(() => { }); }
    };
    // connect to every broker; a player joins through whichever one works for them
    H.ready = Promise.all(Relay.BROKERS.map(u => {
      const m = new Mqtt(u); m.onmsg = (t, x) => handle(m, t, x);
      return m.ready.then(() => { if (H.closed) { m.close(); return; } H.mq.push(m); for (const c of H.codes) m.sub(ROOT + c + '/h'); }).catch(() => { });
    })).then(() => H.mq.length > 0);
    H.addCode = c => { H.codes.add(c); for (const m of H.mq) if (m.ok) m.sub(ROOT + c + '/h'); };
    H.close = () => { H.closed = true; for (const cl of H.clients.values()) try { cl.conn.close(); } catch (e) { } H.mq.forEach(m => m.close()); };
    // drop silent players (no message for 12s)
    H.watch = setInterval(() => { const now = performance.now(); for (const [k, cl] of H.clients) if (now - cl.conn.lastSeen > 12000) { cl.conn.open = false; H.clients.delete(k); cl.conn._emit('close'); } if (H.closed) clearInterval(H.watch); }, 2000);
    H.addCode(code);
    return H;
  };

  // ---------- CLIENT side ----------
  // Relay.join(code, cb{onOpen(conn), onMsg, onClose, onError}) -> {close()}
  Relay.join = function (code, cb) {
    let done = false, closed = false, m = null, hb = null, watch = null, conn = null;
    const cid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    const inT = ROOT + code + '/c/' + cid, outT = ROOT + code + '/h';
    const fail = msg => { if (done) return; done = true; cleanup(); cb.onError(msg); };
    const cleanup = () => { clearInterval(hb); clearInterval(watch); if (m) m.close(); };
    (async () => {
      if (!Relay.available()) return fail('Could not connect. Check the code and your internet, then try again.');
      const kp = await keyPair(); let aes = null, chain = Promise.resolve(), lastHost = performance.now();
      for (const u of Relay.BROKERS) {
        if (closed) return;
        const mm = new Mqtt(u); try { await mm.ready; } catch (e) { continue; }
        m = mm; mm.sub(inT);
        const got = await new Promise(res => {
          const to = setTimeout(() => res(false), 5000);
          mm.onmsg = (t, text) => {
            if (t !== inT) return; let env; try { env = JSON.parse(text); } catch (e) { return; }
            if (env.k && !aes) { clearTimeout(to); shared(kp, env.k).then(k => { aes = k; res(true); }, () => res(false)); return; }
            if (env.bye) { if (conn) { conn.open = false; if (!closed) cb.onClose(); } cleanup(); return; }
            if (env.e && aes) { lastHost = performance.now(); chain = chain.then(() => open(aes, env.e)).then(msg => cb.onMsg(msg)).catch(() => { }); }
          };
          setTimeout(() => mm.pub(outT, JSON.stringify({ c: cid, k: kp.pubB64 })), 150);
        });
        if (got) break; mm.close(); m = null;
        break; // the host listens on every broker, so if a working broker got no answer the code is wrong
      }
      if (closed) return;
      if (!aes) return fail('No lobby with that code.');
      done = true;
      let sendChain = Promise.resolve();
      conn = { open: true, relay: true, send(msg) { if (!conn.open) return; sendChain = sendChain.then(() => seal(aes, msg)).then(s => m.pub(outT, JSON.stringify({ c: cid, e: s }))).catch(() => { }); }, close() { conn.open = false; } };
      hb = setInterval(() => conn.send({ t: 'ping' }), 3000);
      watch = setInterval(() => { if (performance.now() - lastHost > 12000 && conn.open) { conn.open = false; cleanup(); if (!closed) cb.onClose(); } }, 2000);
      m.onclose = () => { if (conn.open) { conn.open = false; cleanup(); if (!closed) cb.onClose(); } };
      cb.onOpen(conn);
    })().catch(e => fail('Could not connect. Check the code and your internet, then try again.'));
    return { close() { closed = true; done = true; if (m && m.ok) m.pub(outT, JSON.stringify({ c: cid, bye: 1 })); setTimeout(cleanup, 100); if (conn) conn.open = false; } };
  };
})();
