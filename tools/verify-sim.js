const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx=vm.createContext({console,Math,Set});
for(const f of ['util','data','arenas','sim','ai','abilities'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);
vm.runInContext(`
let matches=0;
for(const arena of ARENA_LIST)for(const id of ROSTER){
 const st=Sim.create({arena,fighters:[{id},{id:'itsube'}]});
 const bots=[AI.create(0,'hard'),AI.create(1,'hard')];
 for(let k=0;k<15000&&st.phase!=='over';k++){
 Sim.step(st,bots.map(b=>AI.think(b,st)));st.events.length=0;
 for(const f of st.fighters)if(!Number.isFinite(f.x+f.y+f.hp))throw Error('Nonfinite '+id);
 }
 if(st.phase!=='over')throw Error('Unfinished '+id+' '+arena);
 matches++;
}
console.log('Completed AI duels:',matches);
for(const id of ROSTER){
 const st=Sim.create({arena:'dojo',fighters:[{id},{id:'itsube'}]});st.phase='fight';
 const [f,t]=st.fighters;f.x=350;t.x=410;f.y=t.y=230;f.face=0;
 const inputs=[{mx:0,my:0,a:false,b:false,s:true},{mx:0,my:0,a:false,b:false,s:false}];
 for(let k=0;k<220;k++){inputs[0].s=k<75;Sim.step(st,inputs);st.events.length=0;}
 if(f.under||f.spec)throw Error('Special stuck '+id);
}
console.log('All specials activate and finish');
`,ctx);
