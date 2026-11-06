import {mountRail} from './rail.js';
import {vehicles,vehicle,profile} from './vehicles.js';
const data=await profile();
const $=s=>document.querySelector(s),stage=$('#stage'),tools=$('#tools'),hint=$('#hint');
const kind=document.body.dataset.game;
const configs={fire:['しょうぼうしゃで ひを けそう','しょうぼうしゃを タッチ。ついたら、火を タッチして 水をかけよう。','fire'],rail:['せんろを つなごう','ひかる すきまに、せんろを つなごう。下の せんろを タッチしてね。できたら でんしゃが はしるよ。','train'],wash:['ピカピカ せんしゃじょう','よごれを タッチして あらおう。水、あわ、ブラシ、水で ピカピカにしよう。','car'],truck:['トラックに のせよう','にもつを タッチして、トラックに のせよう。ぜんぶ のったら しゅっぱつ！','truck'],night:['くらやみ のりものさがし','くらい まちを タッチして てらそう。のりものを みつけたら タッチしてね。','plane']};
const [title,instruction,preview]=configs[kind];
$('#title').textContent=title;document.title=title;
let generation=0,timers=new Set(),round=0,busy=false,ctx,voicePending=Promise.resolve();
const art=id=>vehicle(id,data[id]);
const name=id=>(data[id]||vehicles[id]).name;
function later(fn,ms){const g=generation;const t=setTimeout(()=>{timers.delete(t);if(g===generation)fn();},ms);timers.add(t);return t;}
function cancelVoice(){NoriVoice.stop();}
function speak(text){voicePending=NoriVoice.speak(text);return voicePending;}
function unlock(){try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume();}catch{}}
function sound(final=false){unlock();if(!ctx)return;const notes=final?[523,659,784,1047,784,1047]:[660,880];notes.forEach((f,i)=>{const t=ctx.currentTime+i*(final?.15:.09),o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.09,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.22);});}
function reset(){$('#repeat').disabled=false;generation++;timers.forEach(clearTimeout);timers.clear();cancelVoice();busy=false;stage.className='';stage.innerHTML='';tools.innerHTML='';}
function sparkle(x=50,y=50){for(let i=0;i<8;i++){const s=document.createElement('span');s.className='spark';s.textContent='✦';s.style.cssText=`left:${x+(Math.random()-.5)*18}%;top:${y}%;--dx:${(Math.random()-.5)*140}px`;stage.append(s);later(()=>s.remove(),950);}}
function dots(n=3){$('#progress').innerHTML=Array.from({length:n},(_,i)=>`<i class="${i<=round?'on':''}"></i>`).join('');}
function button(label,fn,icon=''){const b=document.createElement('button');b.innerHTML=icon+label;b.onclick=fn;tools.append(b);return b;}
const home='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 3l9 8v10h-6v-7H9v7H3Z" fill="currentColor"/></svg>';
$('#home').innerHTML=home;$('#repeat').onclick=()=>{unlock();speak(hint.textContent||instruction);};
function intro(){reset();hint.textContent='';dots();stage.innerHTML=`<div class="overlay"><h2>${title}</h2><div class="preview">${art(preview)}</div><button id="listen">▷ せつめいを きく</button><button class="secondary" id="skip">≫ せつめいを スキップ</button></div>`;$('#listen').onclick=async()=>{unlock();$('#listen').disabled=true;const g=generation;await speak(instruction);if(g===generation)start();};$('#skip').onclick=()=>{unlock();start();};}
function start(){round=0;next();}
function next(){reset();dots();({fire,rail,wash,truck,night}[kind])();}
function win(){if(busy)return;busy=true;$('#repeat').disabled=true;sound();sparkle();const g=generation;voicePending.then(()=>{if(g===generation)later(()=>{round++;if(round<3)next();else finish();},1800);});}
function finish(){reset();dots();sound(true);sparkle();hint.textContent='';stage.innerHTML='<div class="overlay"><div class="complete-art">✦</div><h2>ぜんぶ できたね！</h2><div class="preview">'+art(preview)+'</div><button id="again">↻ もういっかい</button><button id="menu" class="secondary">おうちへ</button></div>';$('#again').onclick=()=>{unlock();start();};$('#menu').onclick=()=>location.href='../../index.html';speak('すごい！ぜんぶ できたね。');}
function fire(){let arrived=false,left=round+1;hint.textContent='しょうぼうしゃを タッチ';stage.innerHTML='<div class="house"><i class="window" style="left:12%"></i><i class="window" style="left:40%"></i><i class="window" style="left:68%"></i></div><div class="road"></div><button class="vehicle demo" aria-label="しょうぼうしゃを はしらせる">'+art('fire')+'</button>';const car=$('.vehicle');car.onclick=()=>{if(arrived)return;arrived=true;car.classList.remove('demo');car.style.transform='translateX(15%)';sound();hint.textContent='ひを タッチして みずを かけよう';speak(hint.textContent);};for(let i=0;i<left;i++){const b=document.createElement('button');b.className='target';b.setAttribute('aria-label','ひに みずをかける');b.style.cssText=`left:${14+i*27}%;top:${22+Math.random()*8}%`;b.innerHTML='<svg viewBox="0 0 60 80"><path d="M30 3C44 25 55 34 52 54S7 83 7 50C7 36 21 29 19 17l11 13Z" fill="#ee7743"/><path d="M30 32q25 35 0 39-23-4 0-39" fill="#ffd16b"/></svg>';stage.append(b);b.onclick=()=>{if(b.disabled||busy)return;if(!arrived){car.classList.add('demo');speak('しょうぼうしゃを タッチしてね');return;}b.disabled=true;const beam=document.createElement('div');beam.className='water';const r=stage.getBoundingClientRect(),br=b.getBoundingClientRect();const dx=br.left+br.width/2-r.left-r.width*.57,dy=br.top+br.height/2-r.top-r.height*.8;beam.style.cssText=`left:57%;top:80%;width:${Math.hypot(dx,dy)}px;transform:rotate(${Math.atan2(dy,dx)}rad)`;stage.append(beam);sound();later(()=>{beam.remove();b.innerHTML='<svg viewBox="0 0 60 80"><circle cx="24" cy="40" r="18" fill="#eaf0ed"/><circle cx="39" cy="26" r="15" fill="#eaf0ed"/></svg>';},350);later(()=>{b.remove();sparkle(20+i*27,32);left--;if(!left){hint.textContent='あんしん！ ひが きえたね';win();}},850);};}speak(hint.textContent);}
function rail(){mountRail({stage,tools,hint,round,art,sound,speak,later,win,button,isBusy:()=>busy,setBusy:value=>{busy=value;}});}
function wash(){const id=['car','bus','truck','fire'][Math.floor(Math.random()*4)];let phase=0,hits=0;const labels=['みずで ぬらそう','あわを つけよう','ブラシで こすろう','みずで ながそう'];stage.innerHTML='<div class="wash-sign"></div><button class="washzone" aria-label="くるまを あらう"><div class="vehicle">'+art(id)+'</div></button>';const zone=$('.washzone');const positions=Array.from({length:10},(_,i)=>[12+i%5*16,38+Math.floor(i/5)*18]);function setup(){hits=0;hint.textContent=labels[phase];$('.wash-sign').textContent=['みず','あわ','ブラシ','みず'][phase];zone.querySelectorAll('.dirt,.foam').forEach(e=>e.remove());positions.forEach(([x,y],i)=>{const d=document.createElement('i');d.className=phase===1||phase===3?'foam':'dirt';d.style.cssText=`left:${x}%;top:${y}%;width:11%;height:13%;opacity:${phase===0?1:phase===2?.6:phase===1?0:1}`;d.dataset.spot=i;zone.append(d);});speak(hint.textContent);}
function scrub(e){if(busy)return;const r=zone.getBoundingClientRect();let spots=[...zone.querySelectorAll('[data-spot]:not([data-done])')];if(!spots.length)return;spots.sort((a,b)=>{const d=n=>{const q=n.getBoundingClientRect();return Math.hypot(q.left+q.width/2-e.clientX,q.top+q.height/2-e.clientY);};return d(a)-d(b);});const d=spots[0];d.dataset.done='1';d.style.opacity=phase===1?'1':'0';d.style.transform='scale(1.2)';hits++;sound();if(hits===10){busy=true;later(()=>{phase++;if(phase===4){hint.textContent='ピカピカ！ ありがとう';zone.querySelectorAll('.dirt,.foam').forEach(n=>n.remove());$('.vehicle').classList.add('drive');busy=false;win();}else{busy=false;setup();}},450);}}
let down=false,last=0;zone.onpointerdown=e=>{down=true;zone.setPointerCapture(e.pointerId);scrub(e);};zone.onpointermove=e=>{if(down&&Date.now()-last>90){last=Date.now();scrub(e);}};zone.onpointerup=zone.onpointercancel=()=>down=false;setup();}
function truck(){
  let loaded=0;
  const total=3+round;
  const bed=vehicles.truck.anchors.bed;
  hint.textContent='にもつを タッチして のせよう';
  stage.innerHTML='<div class="road"></div><div class="vehicle" style="width:96%;left:2%;bottom:3%">'+art('truck')+'</div>';
  const car=$('.vehicle');
  for(let i=0;i<total;i++){
    const box=document.createElement('button');
    box.className='crate';box.setAttribute('aria-label',`にもつ ${i+1} を のせる`);
    const initialSize=i%2?60:74;
    box.style.cssText=`left:${8+(i%3)*30}%;top:${10+Math.floor(i/3)*25}%;width:${initialSize}px;height:${initialSize}px;background:${['#ed936b','#e4bb52','#70ae9a','#899ac7','#d68b9d'][(i+round)%5]}`;
    stage.append(box);
    box.onclick=()=>{
      if(box.disabled||busy)return;
      box.disabled=true;
      const slot=loaded++,size=i%2?36:42;
      const from=box.getBoundingClientRect(),vehicleRect=car.getBoundingClientRect();
      // Move the box into the truck's coordinate system before flying it aboard.
      // This keeps the cargo on the real bed on short and tall phone screens alike.
      car.append(box);
      box.style.left=`${from.left-vehicleRect.left}px`;
      box.style.top=`${from.top-vehicleRect.top}px`;
      box.style.transform='none';
      box.getBoundingClientRect();
      box.style.left=`${(bed.x+12+(slot%3)*(bed.width-13)/3)/320*100}%`;
      box.style.top=`${(bed.floorY-size-Math.floor(slot/3)*(bed.height+2))/160*100}%`;
      box.style.width=`${size/320*100}%`;
      box.style.height=`${size/160*100}%`;
      sound();
      if(loaded===total){
        busy=true;hint.textContent='いっぱい！ しゅっぱつ！';
        speak('いっぱい のったね。しゅっぱつ！');
        later(()=>car.classList.add('drive'),600);
        later(()=>{busy=false;win();},1700);
      }
    };
  }
  speak(hint.textContent);
}
function night(){const count=3+round;let found=0;stage.className='night';hint.textContent='さわって てらして みつけよう';stage.innerHTML='<div class="night-ground"></div><div class="moon"></div><div class="darkness"></div><div class="found-name"></div>';const ids=Object.keys(vehicles).sort(()=>Math.random()-.5).slice(0,count),slots=[[4,18],[55,18],[4,44],[55,44],[30,70]].sort(()=>Math.random()-.5);let lastVoice=Promise.resolve();ids.forEach((id,i)=>{const b=document.createElement('button');b.className='hidden-vehicle';b.setAttribute('aria-label','かくれた のりもの');b.style.cssText=`left:${slots[i][0]+Math.random()*3}%;top:${slots[i][1]}%`;b.innerHTML=art(id);stage.append(b);b.onclick=e=>{if(b.classList.contains('found')||busy)return;const r=stage.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;const prev=stage._light||[r.width*.5,r.height*.5];if(Math.hypot(x-prev[0],y-prev[1])>90){light(e);return;}light(e);b.classList.add('found');b.setAttribute('aria-label',name(id));$('.found-name').textContent=name(id);found++;sound();sparkle(slots[i][0]+18,slots[i][1]);hint.textContent=`みつけた！ ${found} / ${count}`;const g=generation;lastVoice=lastVoice.then(()=>g===generation?speak((data[id]||vehicles[id]).say):null);if(found===count){busy=true;lastVoice.then(()=>{if(g===generation)later(()=>{busy=false;win();},300);});}};});function light(e){const r=stage.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;stage.style.setProperty('--lx',`${x}px`);stage.style.setProperty('--ly',`${y}px`);stage._light=[x,y];}stage.onpointerdown=light;stage.onpointermove=e=>{if(e.buttons||e.pointerType==='touch')light(e);};speak(hint.textContent);}
window.addEventListener('pagehide',()=>{reset();ctx?.suspend();});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelVoice();ctx?.suspend();}});intro();
