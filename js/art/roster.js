'use strict';
(function(){
 const A=Art;
 function ellipse(P,x,y,rx,ry,c){P.x.fillStyle=c;P.x.beginPath();P.x.ellipse(x,y,rx,ry,0,0,7);P.x.fill();}
 function warrior(id,w,h,body,trim){
  A.SPECS[id]={w,h,ox:w/2,draw(P,pose){
   const q=A.poseInfo(pose),cx=w/2,ground=h-2,bob=q.bob,head=h*.25+bob;
   const run=pose.startsWith('run')?Math.sin(Number(pose.slice(-1))*Math.PI/2)*4:0;
   P.rect(cx-10,ground-14,7,13+run,'#17151f');P.rect(cx+3,ground-14,7,13-run,'#17151f');
   P.rect(cx-12,ground-3+run,10,3,trim);P.rect(cx+3,ground-3-run,10,3,trim);
   P.rect(cx-13,head+9,26,h*.39,body);
   for(let j=0;j<4;j++){P.rect(cx-14,head+12+j*5,28,3,trim);P.rect(cx-10,head+12+j*5,20,2,body);}
   ellipse(P,cx,head,9,10,'#d7a77c');P.rect(cx-9,head-8,18,5,'#181823');
   P.rect(cx+3,head-1,2,2,'#17141d');
   const strike=pose==='strike'||pose==='strike2',armY=head+17;
   A.limb(P,cx+8,armY,cx+18+(strike?8:0),armY+(strike?-8:5),5,2,body);
   if(id==='hayate'){
    P.rect(cx-10,head-4,20,13,'#303341');P.rect(cx,head-2,9,3,'#e9dba7');
    P.rect(cx-11,head+9,22,4,'#b43139');P.poly;
    A.limb(P,cx-8,head+12,cx-24,head+17+run,4,2,'#b43139');
    P.line(cx+18,armY,cx+21,armY-17,'#a5b4bf');P.line(cx+21,armY-17,cx+31,armY-19,'#dce6d8');
    for(let i=0;i<8;i++)P.rect(cx+12+i*2,armY+5+Math.sin(i)*3,2,1,'#9095a1');
   }else if(id==='suzume'){
    ellipse(P,cx-3,head-9,7,4,'#211923');A.limb(P,cx-5,head-10,cx-14,head-18,5,2,'#211923');
    P.x.strokeStyle='#d2a45d';P.x.lineWidth=3;P.x.beginPath();P.x.ellipse(cx+22,head+16,8,28,0,-1.5,1.5);P.x.stroke();
    P.line(cx+23,head-12,cx+23,head+44,'#e4debd');P.line(cx+8,head+15,cx+35,head+15,'#eddec0');
    for(let k=0;k<4;k++)P.line(cx-12+k*2,head+14,cx-16+k*2,head-13,'#d7c5a2');
   }else{
    P.rect(cx-13,head-9,26,6,'#201e24');P.rect(cx-15,head-12,30,4,trim);
    P.line(cx-10,head-12,cx-17,head-23,trim);P.line(cx+10,head-12,cx+17,head-23,trim);
    P.rect(cx-9,head+1,18,9,'#33313b');
    const wx=cx+22;P.line(wx,ground,wx,head-20,'#7c5836');P.line(wx+1,ground,wx+1,head-20,trim);
    P.x.fillStyle='#d9dfdf';P.x.beginPath();P.x.moveTo(wx,head-20);P.x.lineTo(wx+23,head-16);P.x.lineTo(wx+35,head+3);P.x.lineTo(wx+15,head-8);P.x.lineTo(wx,head-9);P.x.fill();
   }
  }};
 }
 warrior('hayate',70,58,'#343542','#555766');
 warrior('suzume',74,69,'#6c242f','#c16045');
 warrior('okuma',112,96,'#292936','#c5a34b');
 A.SPECS.kappa={w:52,h:49,ox:24,draw(P,pose){const q=A.poseInfo(pose),y=20+q.bob;
  ellipse(P,21,y+12,17,15,'#435734');ellipse(P,20,y+12,12,12,'#75864c');
  for(let i=0;i<3;i++)P.line(10+i*7,y+3,8+i*7,y+22,'#344c2e');
  ellipse(P,29,y,13,12,'#77aa67');P.rect(29,y,17,5,'#b9ad50');P.rect(34,y+1,10,1,'#e2d280');
  ellipse(P,26,y-10,13,4,'#cfca80');ellipse(P,26,y-11,9,2,'#73d6df');P.rect(31,y-4,3,3,'#171d20');
  A.limb(P,20,y+16,12,46,6,2,'#79a866');A.limb(P,31,y+15,38,46,6,2,'#79a866');
  A.limb(P,34,y+6,pose==='strike'?49:42,y+15,5,2,'#87b471');P.rect(43,y+12,6,2,'#eee4bd');
 }};
 A.SPECS.akaoni={w:106,h:91,ox:44,draw(P,pose){const q=A.poseInfo(pose),y=20+q.bob;
  ellipse(P,43,y+28,25,28,'#b73b39');ellipse(P,43,y,18,18,'#cc5145');
  P.line(30,y-12,29,y-25,'#e8d4a0');P.line(52,y-12,59,y-24,'#e8d4a0');P.rect(31,y-3,8,3,'#191722');P.rect(49,y-3,8,3,'#191722');
  P.rect(39,y+8,15,5,'#44272a');P.rect(41,y+8,3,6,'#eee6cc');P.rect(49,y+8,3,6,'#eee6cc');
  P.rect(23,y+42,42,15,'#d19b3c');for(let i=0;i<5;i++)P.line(25+i*8,y+42,31+i*8,y+55,'#33242a');
  A.limb(P,29,y+53,23,86,11,4,'#ac3735');A.limb(P,56,y+53,63,86,11,4,'#ac3735');
  const strike=pose==='strike',wx=strike?83:75,wy=strike?y+25:y-15;
  A.limb(P,62,y+23,wx,wy+22,10,4,'#cb5146');A.limb(P,wx,wy+29,wx+7,wy-16,10,4,'#393a44');
  for(let k=0;k<5;k++){P.rect(wx-4,wy-14+k*7,20,3,'#737080');}
 }};
 A.SPECS.gashadokuro={w:155,h:148,ox:72,draw(P,pose){const q=A.poseInfo(pose),cx=72,y=25+q.bob;
  const bone='#ddd8be',dark='#908e82';ellipse(P,cx,y,24,23,bone);
  ellipse(P,cx-10,y-1,7,8,'#29242a');ellipse(P,cx+12,y-1,7,8,'#29242a');P.rect(cx-3,y+8,7,6,'#393138');
  P.rect(cx-16,y+16,33,10,dark);for(let k=0;k<7;k++)P.rect(cx-14+k*4,y+16,2,9,bone);
  A.limb(P,cx,y+25,cx,y+75,8,3,bone);
  for(let k=0;k<5;k++){P.x.strokeStyle=bone;P.x.lineWidth=4;P.x.beginPath();P.x.ellipse(cx,y+36+k*7,22-k,8,0,0,Math.PI*2);P.x.stroke();}
  A.limb(P,cx-18,y+30,cx-39,y+62,7,3,bone);A.limb(P,cx-39,y+62,cx-51,y+94,6,3,bone);
  const reach=pose==='strike'?25:0;
  A.limb(P,cx+18,y+30,cx+40+reach,y+52,7,3,bone);A.limb(P,cx+40+reach,y+52,cx+45+reach,y+84,6,3,bone);
  for(let k=0;k<4;k++)P.line(cx+39+reach+k*4,y+81,cx+37+reach+k*5,y+102-k*2,bone);
  ellipse(P,cx,y+80,22,10,bone);
  for(const side of [-1,1]){A.limb(P,cx+side*12,y+82,cx+side*20,y+101,8,3,bone);A.limb(P,cx+side*20,y+101,cx+side*25,143,6,2,bone);P.rect(cx+side*25-7,142,20,4,bone);}
 }};
 A.SPECS.orochi={w:245,h:180,ox:110,draw(P,pose){const q=A.poseInfo(pose);
  for(let k=0;k<8;k++){const a=k*Math.PI/4,x=108+Math.cos(a)*63,y=115+Math.sin(a)*27;
   A.limb(P,106,138,x-42,y+28,16,7,'#314b43');}
  ellipse(P,108,133,73,32,'#24423b');ellipse(P,105,128,66,24,'#41634b');
  for(let k=0;k<8;k++){const x=25+k*25,y=25+Math.abs(k-3.5)*9+Math.sin(k+q.bob)*4;
   A.limb(P,90+(k-3)*8,128,x+4,y+24,13,6,k%2?'#496c4e':'#355944');
   ellipse(P,x+6,y+14,16,11,'#577a50');P.rect(x+10,y+17,21,9,'#6d8956');
   P.rect(x+11,y+11,4,3,'#f6d75b');P.rect(x+13,y+11,1,3,'#231f23');
   P.rect(x+18,y+23,13,2,'#2d3030');P.rect(x+21,y+23,2,5,'#ece4c4');
   P.line(x,y+5,x-4,y-4,'#b4ad7d');P.line(x+10,y+5,x+13,y-5,'#b4ad7d');
  }
  for(let k=0;k<18;k++)P.rect(47+k*7,128+(k%3)*4,4,2,'#739061');
 }};
})();
