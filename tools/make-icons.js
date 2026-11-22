// Builds the home-screen icons (pixel art drawn in code, scaled up crisp): node tools/make-icons.js
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const N = 32, px = new Array(N * N).fill(null);
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = c; };
const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
// night sky + red moon
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) px[y * N + x] = y < 22 ? (y < 11 ? '#1a1030' : '#24143a') : '#2e1a22';
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot(x - 16, y - 13); if (d < 10.5) set(x, y, d < 9.5 ? '#d8402f' : '#9e2a22'); }
// ground
rect(0, 26, 32, 6, '#1a0e12'); rect(0, 26, 32, 1, '#3d2430');
// samurai silhouette: flat jingasa hat, body, katana
const K = '#0c0810';
rect(9, 9, 14, 2, K); rect(11, 8, 10, 1, K); rect(14, 7, 4, 1, K);       // hat
rect(13, 11, 6, 4, K);                                                     // head
set(19, 13, '#e8d27a'); set(20, 13, '#e8d27a'); set(21, 12, '#e8d27a');   // wheat stalk
rect(11, 15, 10, 7, K); rect(10, 16, 1, 5, K); rect(21, 16, 1, 5, K);     // body/kimono
rect(12, 22, 3, 4, K); rect(17, 22, 3, 4, K);                              // legs
for (let i = 0; i < 9; i++) set(21 + i, 19 - i, '#e6eef5');                // katana blade
rect(20, 19, 2, 2, '#c9a23a');                                             // tsuba
// falling petals
for (const [x, y] of [[4, 4], [27, 6], [6, 18], [28, 22], [3, 11]]) { set(x, y, '#f6b6c8'); set(x + 1, y, '#f19ab2'); }

function png(S) {
  const raw = Buffer.alloc((S * 4 + 1) * S);
  for (let y = 0; y < S; y++) { raw[y * (S * 4 + 1)] = 0; for (let x = 0; x < S; x++) {
    const c = px[Math.floor(y * N / S) * N + Math.floor(x * N / S)], o = y * (S * 4 + 1) + 1 + x * 4;
    raw[o] = parseInt(c.slice(1, 3), 16); raw[o + 1] = parseInt(c.slice(3, 5), 16); raw[o + 2] = parseInt(c.slice(5, 7), 16); raw[o + 3] = 255; } }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(S, 0); ih.writeUInt32BE(S, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const out = path.join(__dirname, '..', 'icons');
for (const S of [180, 192, 512]) fs.writeFileSync(path.join(out, 'icon-' + S + '.png'), png(S));
console.log('icons written');
