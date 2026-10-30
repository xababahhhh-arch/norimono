import {TrainJourney,ROUTE} from './model.js';
import {TrainScene} from './scene.js';
import {CabAudio} from '../shared/audio.js';
import {Narrator} from '../shared/narration.js';
import {icon,trainFront,sideDoors} from './art.js';
const $=id=>document.getElementById(id),cab=$('cab'),overlay=$('overlay');
const sound=new CabAudio(),voice=new Narrator(),scene=new TrainScene($('scenery'));
let train=new TrainJourney(Math.floor(Math.random()*6)),started=false,paused=false,lastTime=0,frame=0,token=0,activePointer=null,brakeNotified=false;
const write=(node,value)=>{if(node.textContent!==String(value))node.textContent=String(value);};
$('home').innerHTML=icon('home');$('mute').innerHTML=icon('sound');$('pause').innerHTML=icon('pause');$('horn').querySelector('.horn-icon').innerHTML=icon('horn');$('door').querySelector('.door-icon').innerHTML=icon('door');$('door-scene').innerHTML=sideDoors;$('arrival').querySelector('.arrival-star').innerHTML=icon('star');
for(const [value,name] of [['1','up'],['0','coast'],['-1','brake']])document.querySelector(`[data-notch="${value}"] .symbol`).innerHTML=icon(name);
function cue(text,approach=false){write($('cue'),text);$('cue').classList.toggle('approach',approach);}
function speak(text){return voice.say(text);}
function updateRoute(){
 $('route').innerHTML=ROUTE.map((station,i)=>`<span class="route-stop ${i<train.visited.length?'visited':''} ${i===train.leg?'current':''}" title="${station.name}" aria-label="${station.name}${i<train.visited.length?'、とうちゃく':''}"></span>`).join('');
 $('station-name').textContent=train.route.name;cab.style.setProperty('--station-color',train.route.color);
}
function confetti(){const colors=['#e6b756','#e58b70','#88bcb0','#d5dbb5'];$('confetti').innerHTML=Array.from({length:18},(_,i)=>`<i style="--x:${i*5.8}%;--color:${colors[i%4]};--delay:${i%4*.09}s"></i>`).join('');}
function refresh(){
 cab.dataset.phase=started?train.phase:'intro';cab.dataset.notch=train.notch;cab.dataset.leg=train.leg;cab.dataset.arrivals=train.visited.length;cab.dataset.result=train.result||'';
 $('speed').dataset.mps=train.speed.toFixed(3);write($('speed'),Math.round(Math.abs(train.speed)*3.6));
 $('distance').dataset.metres=train.distance.toFixed(3);write($('distance'),Math.max(0,Math.ceil(train.distance/5)*5));
 $('journey-progress').style.width=`${Math.max(0,Math.min(100,train.position/train.route.length*100))}%`;
 document.querySelectorAll('.speed-bars i').forEach((bar,i)=>bar.classList.toggle('on',Math.abs(train.speed)>i*4+.5));
 $('handle').style.top=`${train.notch===1?17:train.notch===-1?83:50}%`;
 const shouldBrake=train.phase==='running'&&train.near&&train.speed>1;
 const shouldPower=train.phase==='ready'||(train.phase==='running'&&train.speed===0&&train.distance>28);
 for(const button of document.querySelectorAll('[data-notch]')){const value=Number(button.dataset.notch);button.setAttribute('aria-pressed',String(value===train.notch));button.disabled=!train.canDrive||paused;button.classList.toggle('prompt',(value===-1&&shouldBrake)||(value===1&&shouldPower));}
 $('door').disabled=!['doors-open','arrived'].includes(train.phase)||paused;
 $('door').classList.toggle('prompt',!$('door').disabled);
 write($('door-label'),train.phase==='arrived'?'ドアを あける':train.phase==='doors-open'?'ドアを しめる':['opening','boarding'].includes(train.phase)?'のりおり しているよ':train.phase==='closing'?'しまるよ':'ドア しまってる');
 $('door-scene').hidden=!['doors-open','closing','arrived','opening','boarding'].includes(train.phase);
 $('door-scene').classList.toggle('open',['doors-open','opening','boarding'].includes(train.phase));
 $('door-scene').classList.toggle('boarding',train.phase==='boarding');
 $('stop-guide').hidden=!(train.phase==='running'&&train.distance<100);
 $('stop-train').style.left=`${Math.max(4,Math.min(96,50-train.distance*.8))}%`;
 $('arrival').hidden=!['arrived','aligning','opening','boarding'].includes(train.phase);
 write($('arrival-text'),train.result==='perfect'?'ぴったり！':train.result==='overrun'?'ちょっと いきすぎた！':'とうちゃく！');
 $('pause').disabled=!started||train.phase==='complete';
}
function events(){for(const event of train.drain()){
 if(event.type==='ready'){brakeNotified=false;updateRoute();cue('レバーを うえへ');speak('出発！レバーを上にしよう。');}
 if(event.type==='approach'){sound.approach();cue('もうすぐ えき！',true);speak(`もうすぐ、${train.route.say}。ブレーキで止まろう。`);brakeNotified=true;}
 if(event.type==='early-stop'){cue('もうすこし はしろう');speak('もう少し、進もう。レバーを上にしてね。');}
 if(event.type==='overrun'){cue('だいじょうぶ。えきに あわせるよ');speak('少し行き過ぎたね。大丈夫。駅に合わせるよ。');}
 if(event.type==='arrival'){updateRoute();sound.arrival(event.result==='perfect');confetti();cue('ドアを あけよう');speak(event.result==='perfect'?'ぴったり！上手に止まれたね。':event.result==='overrun'?'駅に着いたよ。ドアを開けよう。':'到着！運転ありがとう。');}
 if(event.type==='phase'){
  if(event.phase==='running')cue('しゅっぱつ！');
  if(event.phase==='opening')cue('ドアが あくよ');
  if(event.phase==='boarding')cue('のりおり しているよ');
  if(event.phase==='doors-open'){cue('ドアを しめよう');speak('ドアを閉めて、次の駅へ行こう。');}
  if(event.phase==='complete')finish();
 }
}}
function loop(time){
 const dt=lastTime?Math.min(.05,(time-lastTime)/1000):0;lastTime=time;
 if(started&&!paused&&train.phase!=='complete'){train.step(dt);events();refresh();}
 scene.render(train);
 const tunnel=train.route.theme==='tunnel'&&train.position>=185&&train.position<285;
 sound.update(train.speed,train.notch,train.position,started&&!paused,tunnel);
 frame=requestAnimationFrame(loop);
}
function start(){token++;voice.stop();sound.unlock();train=new TrainJourney(Math.floor(Math.random()*6));started=true;paused=false;lastTime=0;brakeNotified=false;overlay.hidden=true;$('confetti').innerHTML='';updateRoute();cue('ドアを しめよう');refresh();speak('ドアを閉めて、出発しよう。');}
function setNotch(value){
 if(!started||paused)return;sound.unlock();
 if(train.setNotch(value)){
  if(train.phase==='running'&&train.notch===0)cue(train.near?'えきが ちかいよ':'そのまま はしるよ',train.near);
  if(train.phase==='running'&&train.notch===-1)cue('ゆっくり とまるよ',train.near);
  if(train.phase==='running'&&train.notch===1)cue(train.near?'えきだよ。ブレーキ！':'はしっているよ',train.near);
  events();refresh();
 }
}
const master=$('master');
function notchAt(y){const r=master.getBoundingClientRect(),fraction=(y-r.top)/r.height;return fraction<1/3?1:fraction<2/3?0:-1;}
master.addEventListener('pointerdown',e=>{if(activePointer!==null||!train.canDrive||paused)return;activePointer=e.pointerId;master.setPointerCapture?.(e.pointerId);setNotch(notchAt(e.clientY));e.preventDefault();});
master.addEventListener('pointermove',e=>{if(e.pointerId!==activePointer)return;const value=notchAt(e.clientY);if(value!==train.notch)setNotch(value);e.preventDefault();});
function release(e){if(e.pointerId!==activePointer)return;activePointer=null;if(master.hasPointerCapture?.(e.pointerId))master.releasePointerCapture(e.pointerId);}
master.addEventListener('pointerup',release);master.addEventListener('pointercancel',release);master.addEventListener('lostpointercapture',()=>{activePointer=null;});
document.querySelectorAll('[data-notch]').forEach(button=>button.addEventListener('click',()=>setNotch(Number(button.dataset.notch))));
$('door').onclick=()=>{if(paused)return;sound.unlock();if(train.door()){sound.door();events();refresh();}};
$('horn').onclick=()=>{if(!started||paused)return;sound.horn();$('horn').classList.remove('sounding');void $('horn').offsetWidth;$('horn').classList.add('sounding');};
$('mute').onclick=()=>{sound.unlock();sound.setMuted(!sound.muted);voice.muted=sound.muted;if(voice.muted)voice.stop();$('mute').innerHTML=icon(sound.muted?'mute':'sound');$('mute').setAttribute('aria-pressed',String(sound.muted));$('mute').setAttribute('aria-label',sound.muted?'音を出す':'音を消す');};
function pause(){if(!started||paused||train.phase==='complete')return;paused=true;activePointer=null;voice.stop();sound.suspend();refresh();overlay.hidden=false;overlay.innerHTML=`<div class="pause-card"><span class="eyebrow">ひとやすみ</span><h2>また はしろう</h2><button id="resume" class="primary">つづける</button><a class="home-link" href="../index.html">ゲームを えらぶ</a></div>`;$('resume').onclick=()=>{sound.unlock();paused=false;lastTime=0;overlay.hidden=true;refresh();};}
$('pause').onclick=pause;
function finish(){
 sound.quiet();sound.complete();speak('全部の駅に着いたね。運転ありがとう！');overlay.hidden=false;
 overlay.innerHTML=`<div class="finish-card"><div class="finish-train">${trainFront}</div><span class="eyebrow">まちの でんしゃ</span><h2>うんてん ありがとう！</h2><div class="finish-stations">${ROUTE.map(s=>`<span class="station-stamp">${icon('star')}<span>${s.name}</span></span>`).join('')}</div><p>みんなを えきへ はこべたね</p><div class="intro-actions"><button id="again" class="primary">もういっかい</button><a class="secondary" href="../index.html" style="text-decoration:none;display:grid;place-items:center">ゲームを えらぶ</a></div></div>`;$('again').onclick=start;
}
function intro(){
 overlay.hidden=false;overlay.innerHTML=`<div class="intro-card"><div class="intro-art">${trainFront}</div><div class="intro-copy"><span class="eyebrow">あそぼう</span><h2>でんしゃを<br>うんてん！</h2><div class="lesson"><i class="mini-lever"></i><span>レバーを うえにして<br>しゅっぱつ！</span>${icon('up')}</div><div class="lesson braking"><i class="mini-lever"></i><span>えきが みえたら<br>したで ブレーキ！</span>${icon('brake')}</div><div class="intro-actions"><button id="listen" class="primary">せつめいを きく</button><button id="skip" class="secondary">せつめいを スキップ</button></div><div class="rotate-tip">${icon('rotate')}よこむきでも あそべるよ</div><a class="home-link" href="../index.html">ゲームを えらぶ</a></div></div>`;
 $('listen').onclick=async()=>{sound.unlock();const t=++token;$('listen').disabled=true;$('listen').textContent='きいているよ';await speak('ドアを閉めよう。レバーを上にすると、電車が走るよ。駅が見えたら、レバーを下にして、ブレーキ。駅に着いたら、ドアを開けよう。');if(t===token)start();};$('skip').onclick=start;
}
new ResizeObserver(()=>scene.resize()).observe($('scenery'));
addEventListener('resize',()=>scene.resize());
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
addEventListener('pagehide',()=>{cancelAnimationFrame(frame);voice.stop();sound.suspend();activePointer=null;});
addEventListener('pageshow',e=>{if(e.persisted){lastTime=0;frame=requestAnimationFrame(loop);pause();}});
updateRoute();refresh();intro();frame=requestAnimationFrame(loop);
if('serviceWorker' in navigator)navigator.serviceWorker.register('../../../sw.js').catch(()=>{});
