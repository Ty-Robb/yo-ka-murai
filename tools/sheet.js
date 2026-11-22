// node tools/sheet.js [ids] [scale] -> tools/shots/sheet.png   (needs node tools/serve.js 8795)
const { launch, newTab, sleep } = require('./cdp');
(async () => {
  const b = await launch(9395); const t = await newTab(b, 'http://localhost:8795/tools/sheet.html?id=' + (process.argv[2] || '') + '&s=' + (process.argv[3] || 4), 1900, 1000); await sleep(1500);
  const [w, h] = JSON.parse(await t.eval('JSON.stringify([c.width,c.height])'));
  await t.send('Emulation.setDeviceMetricsOverride', { width: Math.min(w, 3000), height: Math.min(h, 3000), deviceScaleFactor: 1, mobile: false }); await sleep(300);
  await t.shot(__dirname + '/shots/sheet.png'); console.log(t.logs.join('\n')); b.kill(); process.exit(0);
})();
