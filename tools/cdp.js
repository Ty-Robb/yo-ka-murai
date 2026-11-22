// minimal headless-Edge driver over the Chrome DevTools Protocol (Node 22+ has WebSocket built in)
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function launch(port) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ykm-edge-'));
  const proc = spawn(EDGE, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + dir, '--no-first-run', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=960,600', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { const r = await fetch('http://127.0.0.1:' + port + '/json/version'); if (r.ok) break; } catch (e) { } await sleep(200); }
  return { proc, port, kill() { try { proc.kill(); } catch (e) { } } };
}
async function newTab(b, url, w, h, dpr) {
  if (!b.bws) { const v = await (await fetch('http://127.0.0.1:' + b.port + '/json/version')).json(); b.bws = new WebSocket(v.webSocketDebuggerUrl); await new Promise(r => b.bws.onopen = r); b.bid = 0; b.bp = new Map(); b.bws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && b.bp.has(m.id)) { b.bp.get(m.id)(m); b.bp.delete(m.id); } }; }
  const cr = await new Promise(res => { const i = ++b.bid; b.bp.set(i, res); b.bws.send(JSON.stringify({ id: i, method: 'Target.createTarget', params: { url: 'about:blank', newWindow: true, background: false } })); });
  const tid = cr.result.targetId; const list = await (await fetch('http://127.0.0.1:' + b.port + '/json/list')).json(); const info = list.find(x => x.id === tid);
  const ws = new WebSocket(info.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); const logs = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.type + ': ' + m.params.args.map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ')); else if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION: ' + (m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text)); };
  const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w || 800, height: h || 480, deviceScaleFactor: dpr || 1, mobile: !!dpr });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  if (dpr) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const tab = {
    logs, send,
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) throw new Error('eval: ' + (r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text)); return r.result && r.result.result ? r.result.result.value : undefined; },
    async shot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64')); },
    async key(code, key, type) { await send('Input.dispatchKeyEvent', { type: type || 'keyDown', code, key: key || code, windowsVirtualKeyCode: 0 }); },
    async press(code, key, ms) { await tab.key(code, key, 'keyDown'); await sleep(ms || 60); await tab.key(code, key, 'keyUp'); },
    async click(x, y) { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, pointerType: 'mouse' }); },
    async reload() { await send('Page.reload'); },
    close() { ws.close(); }
  };
  await send('Page.navigate', { url });
  return tab;
}
module.exports = { launch, newTab, sleep };
