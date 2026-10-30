const mix=(a,b,t)=>a+(b-a)*t;
export class TrainScene {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.width=0;this.height=0;this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);}
  render(state){
    const c=this.ctx,w=this.width,h=this.height;if(!w||!h)return;
    const horizon=h*.34,trackCenter=w*.46,near=46;
    const project=(z,x=0)=>{const p=near/(Math.max(-2,z)+near);return {x:trackCenter+x*w*.1*p,y:horizon+(h-horizon)*p,p};};
    const polygon=(points,fill,stroke=null,line=1)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}};
    const rect=(x,y,width,height,fill,r=0)=>{c.fillStyle=fill;c.beginPath();if(c.roundRect)c.roundRect(x,y,width,height,r);else c.rect(x,y,width,height);c.fill();};
    const circle=(x,y,r,fill)=>{c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
    const line=(a,b,color,width=2)=>{c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
    const sky=c.createLinearGradient(0,0,0,horizon+30);sky.addColorStop(0,state.leg===2?'#a8cddd':'#b9dfe7');sky.addColorStop(1,'#eef4e3');c.fillStyle=sky;c.fillRect(0,0,w,h);
    circle(w*.8,h*.13,Math.max(15,h*.055),'#f5dc91');
    for(let i=0;i<4;i++){const x=((i*.31+state.seed*.07)*w-state.position*.045)%(w+100);const y=h*.11+(i%2)*h*.06;c.globalAlpha=.78;circle(x,y,18,'#fff9e8');circle(x+18,y+3,24,'#fff9e8');circle(x+40,y+6,16,'#fff9e8');}c.globalAlpha=1;
    for(let layer=0;layer<2;layer++){
      c.beginPath();c.moveTo(0,horizon+20);for(let x=0;x<=w+15;x+=15){const y=horizon-12-layer*10-Math.sin(x/w*9+state.seed+layer)*h*.035-Math.cos(x/w*5+layer)*h*.025;c.lineTo(x,y);}c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fillStyle=layer?'#9ebf9f':'#c1d3b4';c.fill();
    }
    rect(0,horizon+9,w,h,'#b4c797');
    for(let z=600;z>0;z-=25){const a=project(z),b=project(z-25);if((Math.floor((state.position+z)/25))%2===0)rect(0,a.y,w,b.y-a.y,'#aec28f');}
    const bridge=state.route.theme==='river'&&state.position>65&&state.position<285;
    if(state.route.theme==='river'){
      const z1=140-state.position,z2=265-state.position;
      if(z2>0&&z1<600){const far=project(Math.max(0,z2)),close=project(Math.max(0,z1));rect(0,far.y,w,close.y-far.y,'#77b9c7');for(let z=Math.max(0,z1)+8;z<z2;z+=15){const p=project(z);line({x:0,y:p.y},{x:w,y:p.y},'#a4d9d9',Math.max(1,p.p*3));}}
    }
    // The running surface is one continuous perspective plane; ties are world-spaced.
    polygon([project(600,-3),project(600,3),project(0,3),project(0,-3)],bridge?'#b2b6a5':'#c9ba9e');
    polygon([project(600,-2.2),project(600,2.2),project(0,2.2),project(0,-2.2)],'#a99d8a');
    const firstTie=Math.floor(state.position/7)*7;
    for(let world=firstTie+560;world>=firstTie;world-=7){const z=world-state.position;if(z<0)continue;polygon([project(z+.5,-2.3),project(z+.5,2.3),project(z-.5,2.3),project(z-.5,-2.3)],'#655f55');}
    for(const side of [-1,1]){
      polygon([project(600,side*1.4-.09),project(600,side*1.4+.09),project(0,side*1.4+.09),project(0,side*1.4-.09)],'#e6e6d8');
      line(project(600,side*1.4),project(0,side*1.4),'#64747a',Math.max(1,w*.004));
    }
    if(bridge){
      for(const side of [-1,1]){const far=project(Math.max(0,265-state.position),side*3.4),nearPoint=project(Math.max(0,140-state.position),side*3.4);line({x:far.x,y:far.y-40*far.p},{x:nearPoint.x,y:nearPoint.y-40*nearPoint.p},'#f3e6c5',5);for(let z=Math.max(0,140-state.position);z<265-state.position;z+=16){const p=project(z,side*3.4);line(p,{x:p.x,y:p.y-44*p.p},'#e3d6b6',Math.max(2,6*p.p));}}
    }
    // Road crossing, always closed to road traffic while this train passes.
    const crossingZ=125-state.position;
    if(state.leg===0&&crossingZ>-20&&crossingZ<500){
      const far=project(crossingZ+10),close=project(crossingZ-10);polygon([{x:0,y:far.y},{x:w,y:far.y},{x:w,y:close.y},{x:0,y:close.y}],'#8f9f9c');
      for(const side of [-1,1]){const p=project(crossingZ,side*4);line(p,{x:p.x,y:p.y-60*p.p},'#5d6b64',5*p.p);line({x:p.x,y:p.y-48*p.p},{x:p.x+side*100*p.p,y:p.y-48*p.p},'#f2d36b',8*p.p);circle(p.x,p.y-68*p.p,9*p.p,'#e78068');}
      for(const side of [-1,1])line(project(crossingZ+10,side*1.4),project(crossingZ-10,side*1.4),'#e6e6d8',Math.max(2,5*close.p));
    }
    // Nearer scenery is painted over farther scenery, with deterministic replay variety.
    const objects=[];
    for(let world=20;world<state.route.length-85;world+=30){
      const z=world-state.position;if(z<-6||z>530)continue;
      for(const side of [-1,1])objects.push({z,x:side*(4.3+((world/10+state.seed)%3)),type:(world/30+side+state.seed)%3<1?'house':'tree',variant:Math.floor(world+state.seed)%4});
    }
    objects.sort((a,b)=>b.z-a.z).forEach(o=>{
      const p=project(o.z,o.x),scale=p.p*Math.min(w/520,1.8);if(p.x<-150||p.x>w+150)return;
      if(o.type==='house'){
        const colors=['#e8d8bd','#edbc9d','#d6ded0','#e6c6b6'];rect(p.x-40*scale,p.y-65*scale,80*scale,65*scale,colors[o.variant],3*scale);
        polygon([{x:p.x-48*scale,y:p.y-62*scale},{x:p.x,y:p.y-104*scale},{x:p.x+48*scale,y:p.y-62*scale}],o.variant%2?'#809e96':'#bd846f');
        rect(p.x-27*scale,p.y-49*scale,18*scale,22*scale,'#91bfc8',2);rect(p.x+9*scale,p.y-49*scale,18*scale,22*scale,'#91bfc8',2);rect(p.x-8*scale,p.y-24*scale,16*scale,24*scale,'#9a917e',2);
      }else{rect(p.x-4*scale,p.y-51*scale,8*scale,51*scale,'#9a9672');circle(p.x,p.y-64*scale,27*scale,'#76a98d');circle(p.x-12*scale,p.y-45*scale,23*scale,'#7aaf90');circle(p.x+15*scale,p.y-42*scale,21*scale,'#88b89b');}
    });
    // Platform canopy and edge share exactly the same longitudinal coordinates as stop logic.
    const destination=state.route.length;
    const stationStart=destination-65,stationEnd=destination+42;
    if(stationEnd-state.position>0&&stationStart-state.position<530){
      const a=project(Math.max(0,stationEnd-state.position),2.7),b=project(Math.max(0,stationStart-state.position),2.7);
      const af=project(Math.max(0,stationEnd-state.position),8),bf=project(Math.max(0,stationStart-state.position),8);
      polygon([a,af,bf,b],'#eadfc6');line(a,b,'#f6cc62',Math.max(3,b.p*8));
      for(let world=stationEnd;world>=stationStart;world-=20){const z=world-state.position;if(z<0)continue;const p=project(z,3.1),q=project(z,7.8);line(p,{x:p.x,y:p.y-115*p.p},'#6b9292',Math.max(2,8*p.p));line(q,{x:q.x,y:q.y-115*q.p},'#6b9292',Math.max(2,8*q.p));}
      polygon([{x:a.x,y:a.y-125*a.p},{x:af.x,y:af.y-125*af.p},{x:bf.x,y:bf.y-125*bf.p},{x:b.x,y:b.y-125*b.p}],state.route.color);
      // A sign remains visible beside the cab after a reasonably close stop.
      const sign=project(Math.max(1,destination+25-state.position),4.5),ss=sign.p*Math.min(w/500,1.5);
      rect(sign.x-80*ss,sign.y-95*ss,160*ss,38*ss,'#fff5df',5*ss);rect(sign.x-80*ss,sign.y-62*ss,160*ss,5*ss,state.route.color);
      c.fillStyle='#365761';c.textAlign='center';c.font=`800 ${Math.max(8,20*ss)}px system-ui`;c.fillText(state.route.name,sign.x,sign.y-69*ss);
      if(state.distance<140&&state.distance>0){
        const z=state.distance,p=project(z);line(project(z,-2),project(z,2),'#f6e5a1',Math.max(4,p.p*16));
        const mark=project(z,-3);rect(mark.x-23*mark.p,mark.y-65*mark.p,46*mark.p,43*mark.p,'#f7f3d5',8*mark.p);circle(mark.x,mark.y-44*mark.p,13*mark.p,'#76b9aa');
      }
    }
    if(state.leg===2){
      const entry=185-state.position,exit=285-state.position;
      if(entry>0&&entry<400){const p=project(entry),width=w*.39*p.p,height=h*.8*p.p;c.fillStyle='#728681';c.beginPath();c.ellipse(p.x,p.y,width,height,0,Math.PI,Math.PI*2);c.lineTo(p.x+width,p.y);c.closePath();c.fill();c.fillStyle='#314e52';c.beginPath();c.ellipse(p.x,p.y,width*.75,height*.82,0,Math.PI,Math.PI*2);c.fill();line(project(entry,1.4),project(Math.max(0,entry-30),1.4),'#e9e1c5',3);line(project(entry,-1.4),project(Math.max(0,entry-30),-1.4),'#e9e1c5',3);}
      if(entry<=0&&exit>0){
        c.fillStyle='#16363bb8';c.fillRect(0,0,w,h);const glow=c.createRadialGradient(trackCenter,horizon,4,trackCenter,horizon,w*.48);glow.addColorStop(0,'#eff6daaa');glow.addColorStop(.35,'#cde2c944');glow.addColorStop(1,'#183b4100');c.fillStyle=glow;c.fillRect(0,0,w,h);
        for(let z=exit;z>0;z-=22){const p=project(z);c.beginPath();c.ellipse(trackCenter,h+10,w*.54*p.p+h*.1,h*.9*p.p,0,Math.PI,Math.PI*2);c.strokeStyle='#718e8b77';c.lineWidth=7*p.p;c.stroke();}
        rect(w*.2,h*.08,w*.055,7,'#f9df93',3);rect(w*.74,h*.08,w*.055,7,'#f9df93',3);
      }
    }
    // Window reflections and a low dashboard rim reinforce the driver's viewpoint.
    polygon([{x:0,y:0},{x:w*.17,y:0},{x:w*.02,y:h*.63},{x:0,y:h*.55}],'#ffffff16');
    c.strokeStyle='#edf3e7';c.lineWidth=4;const bottom=h-4;c.beginPath();c.moveTo(w*.18,bottom);c.lineTo(w*.47,bottom-16);c.moveTo(w*.51,bottom-16);c.lineTo(w*.82,bottom);c.stroke();
  }
}
