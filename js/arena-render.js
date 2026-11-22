'use strict';
(function(){
 const R=Render;
 R.OBJ.boulder=function(c,o){c.fillStyle='#586472';c.beginPath();c.ellipse(o.x,o.y-8,o.r,o.r*.85,0,0,7);c.fill();c.fillStyle='#a9bbc2';c.beginPath();c.ellipse(o.x-5,o.y-16,o.r*.65,o.r*.35,-.2,0,7);c.fill();};
 R.OBJ.lantern=function(c,o){c.fillStyle='#737872';c.fillRect(o.x-9,o.y-32,18,32);c.fillRect(o.x-16,o.y-35,32,7);c.fillRect(o.x-13,o.y,26,5);c.fillStyle='#f4d282';c.fillRect(o.x-5,o.y-26,10,10);};
 R.OBJ.bamboo=function(c,o){for(let k=-1;k<=1;k++){c.fillStyle=k%2?'#649852':'#3e7542';c.fillRect(o.x+k*5-2,o.y-66+k*5,5,68);for(let j=0;j<4;j++){c.fillStyle='#a3b97a';c.fillRect(o.x+k*5-2,o.y-j*17,5,2);}}c.fillStyle='#42763b';for(let k=0;k<5;k++)c.fillRect(o.x-22+k*9,o.y-51-(k%2)*8,15,3);};
 for(const name of ['boulderBroken','lanternBroken','bambooBroken'])R.DECALS[name]=function(c,d){for(let k=0;k<9;k++){c.fillStyle=name==='bambooBroken'?'#557941':'#737a79';c.fillRect(d.x+Math.cos(k*2.3)*k*3,d.y+Math.sin(k*2.3)*k*2,8,3);}};
 R.PROJ.arrow=function(c,p){c.strokeStyle='#e5ce97';c.lineWidth=2;c.beginPath();c.moveTo(p.x-Math.cos(p.dir)*14,p.y-Math.sin(p.dir)*14);c.lineTo(p.x+Math.cos(p.dir)*5,p.y+Math.sin(p.dir)*5);c.stroke();c.fillStyle='#e5eee9';c.fillRect(p.x-2,p.y-2,4,4);};
 R.PROJ.water=function(c,p){c.fillStyle='#71d3e8';c.beginPath();c.arc(p.x,p.y,5,0,7);c.fill();};
 R.PROJ.chain=function(c,p){const f=Game.st.fighters[p.owner];c.strokeStyle='#b1b3b9';c.setLineDash([3,3]);c.beginPath();c.moveTo(f.x,f.y);c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);c.fillStyle='#d6d9db';c.fillRect(p.x-4,p.y-4,8,8);};
 R.WEATHER.mountain=function(c){c.fillStyle='rgba(240,250,255,.7)';for(let k=0;k<70;k++){const t=performance.now()/40;c.fillRect((k*113+t*1.3)%800,(k*79+t)%460,2,2);}};
 const draw=R.draw;
 R.draw=function(st,view,dt){draw(st,view,dt);};
})();
Render.extraTelegraphs=function(c,st){
 for(const m of st.marks){c.fillStyle='rgba(255,70,35,.25)';c.strokeStyle='#ffb66b';c.beginPath();c.arc(m.x,m.y,m.r,0,7);c.fill();c.stroke();}
 for(const f of st.fighters){const s=f.spec;if(!s)continue;c.strokeStyle=f.i===Render.local?'#bde8ff':'#ff805c';c.lineWidth=2;
 if(s.kind==='charge'){c.beginPath();c.moveTo(f.x,f.y);c.lineTo(f.x+Math.cos(f.face)*650,f.y+Math.sin(f.face)*650);c.stroke();}
 if(s.kind==='hand'||s.kind==='roar'){c.beginPath();c.arc(s.tx,s.ty,s.threat,0,7);c.stroke();}
 if(s.kind==='tunnel'){c.strokeStyle='#e6b67c';c.beginPath();c.ellipse(f.x,f.y,50,24,0,0,7);c.stroke();}}
};
