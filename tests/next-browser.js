const results=document.querySelector('#results'),frames=document.querySelector('#frames'),lines=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function log(t){lines.push(t);results.textContent=lines.join('\n');}
function assert(v,msg){if(!v)throw Error(msg);}
async function wait(fn,msg,ms=18000){const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error(msg+' timeout');await sleep(35);}return fn();}
async function test(kind,width,height){
 const f=document.createElement('iframe');f.width=width;f.height=height;f.title=kind;f.src='../games/play/'+kind+'.html';const loaded=new Promise(r=>f.onload=r);frames.append(f);await loaded;
 const w=f.contentWindow,d=f.contentDocument,errors=[],utterances=[];let active=null,overlap=false;
 w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};w.speechSynthesis.getVoices=()=>[{name:'Japanese test',lang:'ja-JP'}];
 w.speechSynthesis.speak=u=>{if(active)overlap=true;active=u;utterances.push(u.text);setTimeout(()=>{if(active===u){active=null;u.onend?.();}},10);};w.speechSynthesis.cancel=()=>{active=null;};
 const stage=()=>d.querySelector('#stage');
 function fit(){assert(d.documentElement.scrollWidth<=width,'horizontal overflow');assert(d.documentElement.scrollHeight<=height,'vertical overflow');for(const b of d.querySelectorAll('header a,header button,.overlay button')){const r=b.getBoundingClientRect();assert(r.x>=0&&r.y>=0&&r.right<=width+.5&&r.bottom<=height+.5,'offscreen control');}}
 function click(selector){const e=d.querySelector(selector);assert(e,'missing '+selector);const r=e.querySelector?.('.hit')?.getBoundingClientRect()||e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;assert(r.width>=48&&r.height>=48,'small target '+selector+' '+r.width+'x'+r.height);const hit=d.elementFromPoint(x,y);assert(hit&&(hit===e||e.contains(hit)),'blocked target '+selector+' by '+hit?.outerHTML?.slice(0,150));hit.dispatchEvent(new w.MouseEvent('click',{bubbles:true,clientX:x,clientY:y}));fit();}
 await wait(()=>d.querySelector('#skip'),'intro');fit();
 if(width===320){click('#listen');await wait(()=>stage().dataset.phase!=='intro','listen start');assert(utterances.some(t=>t.length>25),'instruction missing');}else click('#skip');
 await wait(()=>stage().dataset.phase!=='intro','skip start');await sleep(350);
 assert(utterances.length,'game prompt after skip');
 // Premature actions never complete the task, and remain retryable.
 const initial=stage().dataset.phase;const wrong={garbage:'vehicle',dig:'hole',lock:'gate',flight:null,busride:'person'}[kind];
 if(wrong){click(`[data-action="${wrong}"]`);assert(stage().dataset.phase===initial,'premature action advanced');await sleep(350);}
 for(let round=0;round<3;round++){
  await wait(()=>Number(stage().dataset.round)===round,'next round');
  const actions=[];
  if(kind==='garbage'){for(let i=0;i<2+round;i++)actions.push(['bin',i]);actions.push(['vehicle']);}
  if(kind==='dig')for(let i=0;i<2+round;i++)actions.push(['sand'],['hole']);
  if(kind==='lock'){actions.push(['vehicle']);for(let i=0;i<2+round;i++)actions.push(['pump']);actions.push(['gate']);}
  if(kind==='flight'){actions.push(['vehicle'],['vehicle'],['vehicle']);for(let i=0;i<2+round;i++)actions.push(['cloud',i]);}
  if(kind==='busride'){actions.push(['vehicle']);for(let i=0;i<2+round;i++)actions.push(['person',i]);actions.push(['vehicle']);}
  for(const [action,index] of actions){click(`[data-action="${action}"]${index===undefined?'':`[data-index="${index}"]`}`);await sleep(820);
   if(kind==='lock'&&action==='pump'){const water=stage().querySelector('[data-water="chamber"]');assert(water,'water geometry missing');const level=Number(water.getAttribute('d').match(/M110 ([\d.]+)/)[1]),boat=stage().querySelector('.next-art>svg');assert(Math.abs(Number(boat.getAttribute('y'))+Number(boat.getAttribute('width'))*141/320-level)<.1,'boat is floating above/below surface');}
   if(kind==='lock'&&action==='gate'){const gate=stage().querySelector('[data-gate="exit"]');assert(Number(gate.getAttribute('y'))+Number(gate.getAttribute('height'))<144,'open gate still blocks boat');}
   if(kind==='dig'){const fill=stage().querySelector('[data-fill="pit"]');assert(fill.getAttribute('clip-path')==='url(#pit)','sand not clipped to hole');assert(Number(fill.getAttribute('y'))+Number(fill.getAttribute('height'))<=378.1,'sand below ground');}
   if(kind==='busride'&&action==='vehicle'&&stage().dataset.phase==='depart'){assert(stage().querySelectorAll('.leave [data-passenger]').length===2+round,'passengers do not travel with bus');}
  }
  await wait(()=>stage().dataset.phase==='complete'||Number(stage().dataset.round)>round,'round finish');
 }
 assert(stage().dataset.phase==='complete','no complete');fit();assert(d.querySelectorAll('.celebration i').length>=10,'no completion effect');
 click('#again');await wait(()=>stage().dataset.round==='0'&&stage().dataset.phase!=='complete','replay');
 assert(!overlap,'speech overlap');assert(errors.length===0,errors.join('; '));assert(d.querySelector('#home').getAttribute('href')==='../../index.html','home path');
 d.querySelector('#home').click();await wait(()=>f.contentWindow.location.pathname==='/index.html','home navigation');
 log(`PASS ${kind} ${width}×${height}: 説明/スキップ・早すぎる操作・3ステージ・描画座標タップ・クリア・再プレイ・ホーム・音声排他`);f.remove();
}
async function crossing(){
 const f=document.createElement('iframe');f.width=320;f.height=568;f.src='../games/play/crossing.html';const loaded=new Promise(r=>f.onload=r);frames.append(f);await loaded;const d=f.contentDocument,w=f.contentWindow;w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};w.speechSynthesis.getVoices=()=>[{name:'test',lang:'ja-JP'}];w.speechSynthesis.speak=u=>setTimeout(()=>u.onend?.(),10);w.speechSynthesis.cancel=()=>{};
 assert(d.querySelector('#repeat').textContent.trim()==='きく','repeat label');d.querySelector('#skip').click();assert(d.querySelector('.signal').dataset.state==='wait','initial red');assert(w.getComputedStyle(d.querySelector('.lamp')).backgroundColor==='rgb(255, 75, 79)','red paint');d.querySelector('.wait').click();await wait(()=>d.querySelector('.signal')?.dataset.state==='go','clear signal');assert(w.getComputedStyle(d.querySelector('.lamp')).backgroundColor==='rgb(37, 142, 234)','blue paint');assert(!d.querySelector('.gate').classList.contains('down'),'gate still closed');await wait(()=>d.querySelector('.train')?.style.display==='none','open crossing');assert(d.querySelector('.signal').dataset.state==='go','open round not blue');for(const b of d.querySelectorAll('header button')){const r=b.getBoundingClientRect();assert(r.x>=0&&r.right<=320,'header cut');}f.remove();log('PASS crossing: 赤→青・遮断棒連動・開いた問題で青・きく表示・320pxヘッダー');
}
try{const q=new URLSearchParams(location.search),width=Number(q.get('w')||390),height=Number(q.get('h')||844);for(const kind of (q.get('only')?.split(',')||['garbage','dig','lock','flight','busride']))await test(kind,width,height);await crossing();log('ALL PASS');document.body.dataset.result='pass';}catch(e){log('FAIL '+e.stack);document.body.dataset.result='fail';}
