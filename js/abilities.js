'use strict';
(function(){
 const H=Sim.helpers;
 function area(st,f,x,y,r,dmg,kb,extra={}) {
  for(const t of H.targetsOf(st,f.team)) if(Math.hypot(t.x-x,t.y-y)<r+t.r)
   H.applyHit(st,f,t,{dmg,kb,dir:Math.atan2(t.y-y,t.x-x),m1:false,...extra});
  for(const o of st.objs) if(o.alive&&Math.hypot(o.x-x,o.y-y)<r+o.r) H.damageObj(st,o,4,f.face,f);
  H.fx(st,'bighit',x,y,{size:r});H.ev(st,{type:'shake',amt:10});
 }
 Sim.SPECIALS.hook={start(st,f){
  const dir=H.aimAssist(st,f,330);f.face=dir;
  H.fireProj(st,f,dir,{speed:650,life:.5,radius:6,dmg:0,kb:0,proj:'chain'},{
   m1:false,onHit(st,p,t){
    if(t.decoy){H.popDecoy(st,t);return;}
    if(H.applyHit(st,f,t,{dmg:5,kb:0,dir,m1:false,stun:.3})!=='hit')return;
    const a=Math.atan2(t.y-f.y,t.x-f.x),gap=Math.max(0,Math.hypot(t.x-f.x,t.y-f.y)-f.r-t.r-8);
    if(t.sz.idx>f.sz.idx){f.vx=Math.cos(a)*gap*7;f.vy=Math.sin(a)*gap*7;}
    else {t.vx=-Math.cos(a)*gap*7;t.vy=-Math.sin(a)*gap*7;}
    H.fx(st,'chain',f.x,f.y,{tx:t.x,ty:t.y});
   }
  });H.sfx(st,'clang',f.x,f.y,.5);
 }};
 Sim.SPECIALS.charge={
  start(st,f){f.spec={kind:'charge',t:0,moveMul:.5,breakable:true,pose:'wind',lockFace:true};},
  update(st,f){if(!f.input.s||f.spec.t>=1.2)Sim.endSpecial(st,f,false);},
  end(st,f,d,interrupted,s){if(interrupted)return;const q=Math.min(1,s.t/1.2);
   H.fireProj(st,f,f.face,{speed:850,life:1.1,radius:5,dmg:10+q*22,kb:250+q*400,proj:'arrow',pierce:true},{m1:false,heavy:true});
   H.sfx(st,'throw',f.x,f.y);
  }
 };
 Sim.SPECIALS.whirl={
  start(st,f){f.spec={kind:'whirl',t:0,moveMul:.8,armour:true,tick:0};},
  update(st,f,d,dt){const s=f.spec;s.tick-=dt;
   if(s.tick<=0){s.tick=.25;area(st,f,f.x,f.y,105,4,80,{light:true});H.fx(st,'slash',f.x,f.y,{range:105,arc:360,dir:s.t*12});}
   if(s.t>=2)Sim.endSpecial(st,f,false);
  }
 };
 Sim.SPECIALS.rush={
  start(st,f){const m=Math.hypot(f.input.mx,f.input.my);f.spec={kind:'rush',t:0,dir:m>.18?Math.atan2(f.input.my,f.input.mx):f.face,moveMul:0,tick:0};},
  update(st,f,d,dt){const s=f.spec;f.x+=Math.cos(s.dir)*440*dt;f.y+=Math.sin(s.dir)*440*dt;s.tick-=dt;
   if(s.tick<=0){s.tick=.055;st.zones.push({kind:'trail',x:f.x,y:f.y,r:23,t:3,owner:f.i});}
   if(s.t>.45)Sim.endSpecial(st,f,false);
  }
 };
 Sim.SPECIALS.roar={start(st,f){
  f.spec={kind:'roar',t:0,noMove:true,threat:140,tx:f.x,ty:f.y};
 },update(st,f){if(f.spec.t>.35){area(st,f,f.x,f.y,140,12,300,{stun:1});H.ev(st,{type:'banner',text:'ONI ROAR!',color:'#ff674a'});Sim.endSpecial(st,f,false);}}};
 Sim.SPECIALS.hand={
  start(st,f){f.spec={kind:'hand',t:0,moveMul:.5,tx:f.x+Math.cos(f.face)*160,ty:f.y+Math.sin(f.face)*160,threat:75};},
  update(st,f,d,dt){const s=f.spec;s.tx=U.clamp(s.tx+f.input.mx*220*dt,40,760);s.ty=U.clamp(s.ty+f.input.my*220*dt,40,420);
   if(!f.input.s||s.t>=1.5)Sim.endSpecial(st,f,false);
  },
  end(st,f,d,interrupted,s){if(interrupted)return;
   const x=s.tx,y=s.ty;st.marks.push({x,y,r:75,t:1,kind:'hand'});
   st.pending.push({t:1,fn(){area(st,f,x,y,75,26,350,{knockup:1});st.decals.push({kind:'crater',x,y,r:45});H.fx(st,'hand',x,y,{size:75});}});
  }
 };
 Sim.SPECIALS.tunnel={
  start(st,f){f.under=true;f.spec={kind:'tunnel',t:0,moveMul:1.3,tick:0};H.ev(st,{type:'banner',text:'THE SERPENT STIRS!',color:'#c4ee98'});},
  update(st,f,d,dt){const s=f.spec;s.tick-=dt;if(s.tick<=0){s.tick=.1;st.decals.push({kind:'crack',x:f.x,y:f.y,x2:f.x+Math.cos(f.face)*18,y2:f.y+Math.sin(f.face)*18});}
   if(!f.input.s||s.t>=2.5)Sim.endSpecial(st,f,false);
  },
  end(st,f,d,interrupted){f.under=false;if(interrupted)return;area(st,f,f.x,f.y,155,30,450,{knockup:1});
   for(let k=0;k<8;k++){const a=k*Math.PI/4;st.decals.push({kind:'crater',x:f.x+Math.cos(a)*75,y:f.y+Math.sin(a)*75,r:22,seed:k});}
  }
 };
 for(const kind of ['hook','charge','whirl','rush','roar','hand','tunnel']) AI.SPECIAL[kind]=function(b,st,me,T,c){
  if(me.spec){if(kind==='charge')c.out.s=me.spec.t<b.d.charge;
   if(kind==='tunnel'){c.out.s=me.spec.t<1.8&&c.dist>110;c.out.mx=Math.cos(c.dir);c.out.my=Math.sin(c.dir);}
   if(kind==='hand'){c.out.s=me.spec.t<.6;c.out.mx=U.clamp((T.x-me.spec.tx)/50,-1,1);c.out.my=U.clamp((T.y-me.spec.ty)/50,-1,1);}
   return;
  }
  const range={hook:300,charge:600,whirl:120,rush:240,roar:140,hand:400,tunnel:500}[kind];
  if(me.cd.s<=0&&c.seen&&c.dist<range&&Math.random()<.025*b.d.aggro){c.out.s=true;c.out.a=c.out.b=false;me.face=c.dir;}
 };
})();
