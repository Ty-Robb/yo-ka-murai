const { launch, newTab, sleep } = require('./cdp');
(async () => {
  const b = await launch(9397); const t = await newTab(b, 'http://localhost:8795/', 932, 430, 2); await sleep(1500);
  await t.eval(`(()=>{const G=__ykm.Game; G.startLocal('itsube','itsube','hard','dojo'); return 1})()`); await sleep(2000);
  console.log(await t.eval(`(()=>{const R=__ykm.Render,G=__ykm.Game; const t0=performance.now(); for(let i=0;i<30;i++) R.draw(G.st,{controls:true},0.016); const d=(performance.now()-t0)/30;
   const t1=performance.now(); for(let i=0;i<300;i++) __ykm.Sim.step(G.st,[{mx:0,my:0},{mx:0,my:0}]); G.st.events.length=0; return 'draw ms '+d.toFixed(2)+' sim ms '+((performance.now()-t1)/300).toFixed(3)})()`));
  b.kill(); process.exit(0);
})();
