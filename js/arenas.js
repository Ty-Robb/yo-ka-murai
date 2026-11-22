'use strict';
(function(){
 function floor(c,color,tile){c.fillStyle=color;c.fillRect(0,0,800,460);
  for(let y=0;y<460;y+=tile)for(let x=0;x<800;x+=tile){c.strokeStyle='rgba(0,0,0,.12)';c.strokeRect(x+(y/tile%2)*tile/2,y,tile,tile);c.fillStyle='rgba(255,255,255,.08)';c.fillRect(x+5,y+4,12,2);}
 }
 ARENAS.mountain={id:'mountain',name:'Mountain',sub:'Snow, boulders and cliff ring-outs',floor:'#b8c6cc',line:'#edf4f4',stands:'#4d5864',
 drawFloor(c){floor(c,'#a9b7bd',48);c.fillStyle='#394453';c.fillRect(220,0,360,8);c.fillRect(220,452,360,8);for(let k=0;k<90;k++){c.fillStyle=k%2?'#dce7e9':'#899aa7';c.fillRect((k*137)%800,(k*73)%460,14,3);}},
 build(){return{obstacles:[[270,120],[530,120],[280,340],[520,340]].map(([x,y])=>({kind:'boulder',x,y,r:23,hp:7})),zones:[],cliffs:[{side:'top',x0:220,x1:580},{side:'bottom',x0:220,x1:580}]};}};
 ARENAS.palace={id:'palace',name:"Shogun's Palace",sub:'Stone lanterns and a koi pond',floor:'#acaaa0',line:'#f5e6c0',stands:'#6a2e34',
 drawFloor(c){floor(c,'#aca99d',40);c.fillStyle='#427f8a';c.beginPath();c.ellipse(400,230,105,135,0,0,7);c.fill();
 for(let k=0;k<12;k++){c.fillStyle=k%2?'#e4ad64':'#dbd5bc';c.fillRect(330+(k*37)%140,130+(k*47)%200,7,3);}
 c.fillStyle='#9b3438';c.fillRect(285,208,230,44);for(let x=288;x<515;x+=12){c.fillStyle='#d16a54';c.fillRect(x,211,2,38);}c.fillStyle='#59262c';c.fillRect(282,205,236,5);c.fillRect(282,251,236,5);},
 build(){return{obstacles:[[230,100],[570,100],[230,360],[570,360]].map(([x,y])=>({kind:'lantern',x,y,r:16,hp:3})),zones:[{kind:'pond',x:400,y:230,rx:105,ry:135},{kind:'bridge',x:400,y:230,w:230,h:44}]};}};
 ARENAS.bamboo={id:'bamboo',name:'Bamboo Field',sub:'Cut through the living cover',floor:'#7e9160',line:'#dce6b2',stands:'#314a32',
 drawFloor(c){floor(c,'#6f8453',64);for(let k=0;k<300;k++){c.fillStyle=k%2?'#8d9c62':'#4d7045';c.fillRect((k*89)%800,(k*61)%460,2,6);}},
 build(){const obstacles=[];for(let row=0;row<5;row++)for(let col=0;col<6;col++){const x=250+col*58+(row%2)*12,y=55+row*85;if(Math.abs(y-230)<30&&Math.abs(x-400)<90)continue;obstacles.push({kind:'bamboo',x,y,r:8,hp:1,blocksLOS:true,cutOnly:true});}return{obstacles,zones:[]};}};
 ARENA_LIST.push('mountain','palace','bamboo');
})();
