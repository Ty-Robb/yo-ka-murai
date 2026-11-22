const {launch,newTab,sleep}=require('./cdp');
(async()=>{const b=await launch(9452);try{const t=await newTab(b,'http://localhost:8795/',932,430,2);await sleep(1000);
console.log(t.logs);console.log(await t.eval(`(()=>{
UI.buildCards(()=>{});UI.show('select');
const overflow=[...document.querySelectorAll('.card')].filter(c=>c.scrollWidth>c.clientWidth+2).map(c=>c.dataset.id);
for(const id of ROSTER)for(const pose of Art.POSES)Art.frame(id,pose);
let checks=0;
for(const id of ROSTER){
 const st=Sim.create({arena:'palace',fighters:[{id},{id:'itsube'}]});st.phase='fight';
 st.fighters[0].x=350;st.fighters[1].x=410;
 for(let k=0;k<180;k++){Sim.step(st,[{mx:0,my:0,a:false,b:false,s:k<72},{mx:0,my:0,a:false,b:false,s:false}]);Game.st=st;Game.handleEvents(st.events);st.events=[];Render.draw(st,{controls:true},1/60);const copy=Online.unpack(Online.pack(st));Render.draw(copy,{controls:true},1/60);checks++;}
}
UI.show('select');return JSON.stringify({checks,overflow});
})()`));
await t.shot(__dirname+'/shots/character-select.png');
console.log(t.logs.filter(x=>/EXCEPTION/.test(x)));t.close();}finally{b.kill();}process.exit(0);})().catch(e=>{console.error(e);process.exit(1)});
