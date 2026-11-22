const {launch,newTab,sleep}=require('./cdp');
(async()=>{const b=await launch(9451);try{
 const a=await newTab(b,'http://localhost:8795/',1000,600),z=await newTab(b,'http://localhost:8795/',1000,600);await sleep(1000);
 await a.eval("Online.create()");
 let code;for(let k=0;k<20;k++){await sleep(500);code=await a.eval("document.querySelector('#lobby-panel h2').textContent");if(code.includes('LOBBY CODE'))break;}
 console.log(code);const match=code.match(/CODE: ([A-Z]{4})/);if(!match)throw Error('Lobby creation failed');
 await z.eval("Online.join('"+match[1]+"')");
 for(let k=0;k<25;k++){await sleep(500);if(await z.eval("UI.cur==='select'"))break;}
 console.log('guest screen',await z.eval("UI.cur"));
 await a.eval("Game.pick.me='suzume';Game.onLobbyPick('suzume');Game.onLobbyReady()");
 await z.eval("Game.pick.me='orochi';Game.onLobbyPick('orochi');Game.onLobbyReady()");
 for(let k=0;k<30;k++){await sleep(500);if(await z.eval("Game.mode==='match'"))break;}
 console.log(await z.eval("JSON.stringify({mode:Game.mode,local:Game.local,ids:Game.st?.fighters.map(f=>f.id),timer:Game.st?.timer})"));
 await a.eval("(()=>{const st=Game.st;st.phase='fight';for(let k=0;k<120;k++){Sim.step(st,[{mx:1,my:0,a:true,b:false,s:false},{mx:-1,my:0,a:false,b:true,s:true}]);}return st.t;})()");
 await sleep(700);
 console.log(await a.eval("JSON.stringify({phase:Game.st?.phase,t:Game.st?.t})"),await z.eval("JSON.stringify({phase:Game.st?.phase,t:Game.st?.t})"));
 console.log('errors',a.logs.filter(x=>/EXCEPTION/.test(x)),z.logs.filter(x=>/EXCEPTION/.test(x)));
 await z.shot(__dirname+'/shots/online.png');
 await a.eval("Game.st.phase='over';Game.st.winner=0;Game.st.wins=[2,0];Game.st.fighters[1].hp=0;");
 await sleep(700);
 console.log('guest final state',await z.eval("JSON.stringify({phase:Game.st.phase,wins:Game.st.wins,hp:Game.st.fighters[1].hp})"));
 await a.eval("Game.net.rematch()");await z.eval("Game.net.rematch()");
 await sleep(6500);console.log('rematch',await z.eval("Game.st.round"));
 await a.eval("Online.leave()");await sleep(500);console.log('disconnect',await z.eval("document.getElementById('toast').textContent"));
 a.close();z.close();
 }finally{b.kill();}process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
