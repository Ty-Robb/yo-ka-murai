'use strict';
const Online={};
(function(){
 const O=Online,$=UI.$,zero=()=>({mx:0,my:0,a:false,b:false,s:false});
 const prefix='yo-ka-murai-v1-';
 let peer=null,conn=null,host=false,code='',remotePick=null,ready=false,remoteReady=false,starting=false,closing=false,timeout=null,lastReceive=0,remoteInput=zero(),rematchWant=false,remoteRematch=false;
 function send(v){if(conn&&conn.open)conn.send(v);}
 function status(text){$('s-status').textContent=text;}
 function cleanup(){closing=true;clearTimeout(timeout);if(conn)conn.close();if(peer)peer.destroy();conn=peer=null;Game.net=null;pendingEvents=[];closing=false;}
 function leave(){cleanup();remotePick=null;ready=remoteReady=starting=false;}
 function lost(text){if(closing)return;leave();Game.quit();UI.toast(text||'Opponent left the duel',5000);}
 function panel(text,join){
  UI.show('lobby');const p=$('lobby-panel');p.innerHTML='';
  const h=document.createElement('h2');h.textContent=text;p.appendChild(h);
  if(join){const input=document.createElement('input');input.id='lobby-code';input.maxLength=4;input.placeholder='KAMI';input.autocomplete='off';input.style.cssText='font:32px monospace;text-transform:uppercase;text-align:center;width:180px';p.appendChild(input);
   const b=document.createElement('button');b.className='btn';b.textContent='CONNECT';b.onclick=()=>{const c=input.value.trim().toUpperCase();if(!/^[A-Z]{4}$/.test(c)){UI.toast('Enter a four-letter lobby code');return;}connect(c);};p.appendChild(b);
  }
  const b=document.createElement('button');b.className='btn';b.textContent='BACK';b.onclick=()=>{leave();UI.show('mode');};p.appendChild(b);
 }
 function setupPeer(id,onOpen){
  peer=new Peer(id,{debug:0});
  peer.on('open',onOpen);
  peer.on('error',e=>{if(host&&e.type==='unavailable-id'){create();return;}lost(e.type==='peer-unavailable'?'Lobby not found. Check the code.':'Connection failed. Please try again.');});
  peer.on('disconnected',()=>lost('Connection to lobby server lost'));
 }
 function create(){
  leave();host=true;code=Array.from({length:4},()=>String.fromCharCode(65+Math.floor(Math.random()*26))).join('');
  panel('CREATING LOBBY-');setupPeer(prefix+code,()=>{panel('LOBBY CODE: '+code+' - waiting for opponent');});
  peer.on('connection',c=>{if(conn){c.on('open',()=>c.close());return;}attach(c);});
 }
 function connect(c){
  leave();host=false;code=c;panel('CONNECTING TO '+code+'-');setupPeer(undefined,()=>attach(peer.connect(prefix+code,{reliable:true,serialization:'json'})));
  timeout=setTimeout(()=>lost('Could not connect. Try another network or create a new lobby.'),15000);
 }
 function attach(c){
  conn=c;c.on('open',()=>{clearTimeout(timeout);lastReceive=performance.now();Game.openSelect('online');status('LOBBY '+code+' - Choose your fighter, then Ready');$('s-go').textContent='READY';});
  c.on('data',receive);c.on('close',()=>lost());c.on('error',()=>lost());
 }
 Game.onLobbyPick=id=>{if(ready)return;send({type:'pick',id});};
 Game.onLobbyReady=()=>{
  if(!Game.pick.me){UI.toast('Pick a fighter first');return;}
  ready=true;send({type:'ready',id:Game.pick.me});status('Ready - '+(remoteReady?'opponent ready':'waiting for opponent'));$('s-go').disabled=true;maybeStart();
 };
 Game.onLobbyBack=()=>{leave();$('s-go').disabled=false;$('s-go').textContent='CONTINUE';UI.show('mode');};
 function maybeStart(){
  if(!host||!ready||!remoteReady||starting)return;
  starting=true;const arena=U.pick(ARENA_LIST),ids=[Game.pick.me,remotePick];
  send({type:'start',arena,ids});start(arena,ids);
 }
 function start(arena,ids){
  rematchWant=remoteRematch=false;pendingEvents=[];
  UI.roulette(arena,()=>{
   const st=Sim.create({arena,fighters:ids.map(id=>({id}))});
   Game.net={tick,leave,rematch};Game.begin(st,host?0:1);Game.acc=0;remoteInput=zero();lastReceive=performance.now();$('s-go').disabled=false;
  });
 }
 function receive(m){
  if(!m||typeof m.type!=='string')return;lastReceive=performance.now();
  if(m.type==='pick'&&ROSTER.includes(m.id)){remotePick=m.id;status('Opponent: '+FIGHTERS[m.id].name+(remoteReady?' - READY':''));}
  if(m.type==='ready'&&ROSTER.includes(m.id)){remotePick=m.id;remoteReady=true;status('Opponent ready - '+FIGHTERS[m.id].name);maybeStart();}
  if(m.type==='start'&&!host&&ARENAS[m.arena]&&Array.isArray(m.ids)&&m.ids.length===2&&m.ids.every(id=>ROSTER.includes(id)))start(m.arena,m.ids);
  if(m.type==='input'&&host){const v=m.v||{};remoteInput={mx:U.clamp(Number(v.mx)||0,-1,1),my:U.clamp(Number(v.my)||0,-1,1),a:!!v.a,b:!!v.b,s:!!v.s};}
  if(m.type==='state'&&!host&&Game.net){Game.st=O.unpack(m.v);Game.handleEvents(m.events||[]);}
  if(m.type==='rematch'){remoteRematch=true;if(host&&rematchWant)restart();else $('r-wait').textContent='Opponent wants a rematch';}
 }
 function rematch(){rematchWant=true;send({type:'rematch'});$('r-wait').textContent='Waiting for opponent to rematch';if(host&&remoteRematch)restart();}
 function restart(){const arena=U.pick(ARENA_LIST),ids=Game.st.fighters.map(f=>f.id);send({type:'start',arena,ids});start(arena,ids);}
 let sendT=0,beat=0;
 function tick(dt){
  if(performance.now()-lastReceive>20000){lost();return;}
  sendT+=dt;beat+=dt;
  if(beat>2){beat=0;send({type:'ping'});}
  if(!host){if(sendT>=1/60){sendT=0;send({type:'input',v:Input.read()});}return;}
  Game.acc+=dt;let n=0;const events=[];
  while(Game.acc>=Sim.DT&&n++<6){Sim.step(Game.st,[Input.read(),performance.now()-lastReceive<1000?remoteInput:zero()]);events.push(...Game.st.events);Game.handleEvents(Game.st.events);Game.st.events.length=0;Game.acc-=Sim.DT;}
  if(sendT>=1/30){sendT=0;send({type:'state',v:O.pack(Game.st),events:pendingEvents.concat(events)});pendingEvents=[];}
  else pendingEvents.push(...events);
 }
 let pendingEvents=[];
 O.pack=st=>JSON.parse(JSON.stringify(st,(key,value)=>['def','sz','tier','arena','pending','events','hit','objHit','onHit','onObj','onEnd'].includes(key)?undefined:value));
 O.unpack=v=>{
  v.arena=ARENAS[v.arenaId];v.pending=[];v.events=[];
  for(const f of v.fighters){f.def=FIGHTERS[f.id];f.sz=SIZES[f.def.size];f.tier=TIERS[f.def.tier];if(f.act)f.act.def=f.act.slot==='s'?{kind:'guard',pose:'guard',windup:0,active:.3}:f.def[f.act.slot];}
  return v;
 };
 O.create=create;O.join=connect;O.leave=leave;
 UI.click('m-create',create);UI.click('m-join',()=>panel('JOIN LOBBY',true));
})();
