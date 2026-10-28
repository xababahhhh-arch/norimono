import {scenes} from './scene-registry.js';
import {colors} from './scene-art.js';
import {definitions,createState,act,prompt} from './next-models.js';
const kind=document.body.dataset.game,config=definitions[kind],$=s=>document.querySelector(s),stage=$('#stage'),hint=$('#hint');
let round=0,state,busy=false,generation=0,timers=new Set(),ctx,lastPrompt='';
function later(fn,ms){const generationAtStart=generation;const t=setTimeout(()=>{timers.delete(t);if(generationAtStart===generation)fn();},ms);timers.add(t);}
function reset(){generation++;for(const t of timers)clearTimeout(t);timers.clear();NoriVoice.stop();busy=false;}
function unlock(){try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume();}catch{}}
function sound(final=false){unlock();if(!ctx)return;(final?[523,659,784,1047,784,1047]:[660,880]).forEach((f,i)=>{const t=ctx.currentTime+i*(final?.14:.08),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.2);});}
function say(text){lastPrompt=text;hint.textContent=text.replaceAll('。','');return NoriVoice.speak(text);}
function draw(transient=null){
 stage.dataset.phase=state.phase;stage.dataset.round=round;stage.dataset.kind=kind;
 const svg=scenes[kind](state,round,transient);
 stage.innerHTML=`<svg viewBox="0 0 360 400" xmlns="http://www.w3.org/2000/svg" aria-label="${config.title}">${svg}</svg>`;
 stage.querySelectorAll('[data-action]').forEach(el=>{const run=()=>interact(el.dataset.action,el.dataset.index===''?undefined:Number(el.dataset.index));el.addEventListener('click',run);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}});});
}
function interact(action,index){
 if(busy)return;unlock();const before=state.phase;
 if(!act(state,action,index)){const t=stage.querySelector(`[data-action="${action}"]`);t?.animate([{opacity:.5},{opacity:1}],{duration:240});say(prompt(state));return;}
 busy=true;sound();draw({action,index});
 if(state.done){const g=generation;const voice=say(kind==='dig'?'道ができたね。車が通れるよ。':kind==='lock'?'水の高さがそろったね。船が通れるよ。':kind==='garbage'?'ぎゅっと小さくなったね。出発！':kind==='flight'?'大空へ出発！':'みんな乗ったね。出発！');Promise.all([voice,new Promise(resolve=>later(resolve,1900))]).then(()=>{if(g!==generation)return;round++;round<3?startRound():finish();});}
 else later(()=>{busy=false;draw();if(before!==state.phase)say(prompt(state));else{hint.textContent=prompt(state).replaceAll('。','');lastPrompt=prompt(state);}},750);
}
function dots(){ $('#progress').innerHTML=[0,1,2].map(i=>`<i class="${i<round?'on':i===round?'on current':''}"></i>`).join(''); }
function startRound(){reset();state=createState(kind,round);dots();draw();say(prompt(state));}
function finish(){reset();dots();sound(true);stage.dataset.phase='complete';stage.innerHTML=`<div class="overlay"><div class="complete-art">${NoriVehicles.artwork(config.vehicle)}</div><h2>ぜんぶ できたね！</h2><p>たくさん あそんだね</p><button id="again">もういっかい</button><button class="secondary" id="home2">おうちへ</button></div><div class="celebration" aria-hidden="true">${Array.from({length:16},(_,i)=>`<i style="--x:${i*6.4}%;--c:${colors[i%6]};--delay:${i*.09}s"></i>`).join('')}</div>`;$('#again').onclick=()=>{round=0;startRound();};$('#home2').onclick=()=>{reset();location.href='../../index.html';};say('全部できたね！');}
function intro(){reset();dots();hint.textContent='';stage.dataset.phase='intro';stage.innerHTML=`<div class="overlay"><div class="preview">${NoriVehicles.artwork(config.vehicle)}</div><h2>${config.title}</h2><p>タッチして あそぼう</p><button id="listen">せつめいを きく</button><button id="skip" class="secondary">せつめいを スキップ</button></div>`;$('#listen').onclick=async()=>{unlock();$('#listen').disabled=true;const g=generation;await say(config.intro);if(g===generation)startRound();};$('#skip').onclick=()=>{unlock();startRound();};}
$('#home').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 3l9 8v10h-7v-7h-4v7H3Z" fill="currentColor"/></svg>';$('#title').textContent=config.title;document.title=config.title;$('#repeat').onclick=()=>{unlock();if(stage.dataset.phase==='intro')say(config.intro);else if(!busy)say(lastPrompt||prompt(state));};$('#home').addEventListener('click',reset);addEventListener('pagehide',reset);intro();
