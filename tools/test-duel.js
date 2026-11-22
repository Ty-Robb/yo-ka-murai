// node tools/test-duel.js [me] [bot] [arena] [diff]  - plays a vs-AI duel (player = a 2nd bot) and screenshots it
const { launch, newTab, sleep } = require('./cdp');
const [me = 'itsube', bot = 'itsube', arena = 'dojo', diff = 'hard'] = process.argv.slice(2);
(async () => {
  const b = await launch(9396); const t = await newTab(b, 'http://localhost:8795/', 932, 430, 2); await sleep(1500);
  await t.shot(__dirname + '/shots/title.png');
  await t.eval(`(()=>{const G=__ykm.Game; G.startLocal('${me}','${bot}','${diff}','${arena}'); G.meBot=__ykm.AI.create(0,'normal'); const r=Input.read; Input.read=()=>__ykm.AI.think(G.meBot,G.st); return 1})()`);
  for (let i = 0; i < 4; i++) { await sleep(2500); await t.shot(__dirname + '/shots/duel' + i + '.png'); }
  for (let i = 0; i < 60; i++) { await sleep(2000); const s = JSON.parse(await t.eval(`JSON.stringify({ph:__ykm.Game.st.phase,r:__ykm.Game.st.round,w:__ykm.Game.st.wins,hp:__ykm.Game.st.fighters.map(f=>Math.round(f.hp)),tm:Math.round(__ykm.Game.st.timer),st:__ykm.Game.st.fighters.map(f=>f.stats)})`)); if (i % 3 === 0) console.log(JSON.stringify(s)); if (s.ph === 'over') break; }
  await sleep(2500); await t.shot(__dirname + '/shots/results.png');
  console.log(t.logs.filter(x => /EXC|rror/.test(x)).slice(0, 8).join('\n'));
  b.kill(); process.exit(0);
})();
