const results=document.querySelector('#results'),frames=document.querySelector('#frames'),lines=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(condition,message)=>{if(!condition)throw Error(message);};
function log(text){lines.push(text);results.textContent=lines.join('\n');}
async function wait(fn,message,timeout=20000){const start=Date.now();while(!fn()){if(Date.now()-start>timeout)throw Error(message+' timeout');await sleep(15);}return fn();}
async function run(width,height){
 const f=document.createElement('iframe');f.width=width;f.height=height;f.title=`train ${width}×${height}`;f.style.maxWidth='none';
 const base=new URL('../games/asobou/train/',location.href).href;
 const source=await(await fetch(base+'index.html')).text();
 const boot=`<script>window.__errors=[];addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));let tick=0;window.requestAnimationFrame=cb=>setTimeout(()=>cb(tick+=50),4);window.cancelAnimationFrame=clearTimeout;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};window.__speech=[];window.__active=null;window.__overlap=false;speechSynthesis.getVoices=()=>[{name:'test',lang:'ja-JP'}];speechSynthesis.cancel=()=>{__active=null;};speechSynthesis.speak=u=>{if(__active)__overlap=true;__active=u;__speech.push(u.text);setTimeout(()=>{if(__active===u){__active=null;u.onend?.();}},10);};<\/script>`;
 f.srcdoc=source.replace('<head>',`<head><base href="${base}">`).replace('<script type="module"',boot+'<script type="module"');frames.replaceChildren(f);await new Promise(resolve=>f.onload=resolve);
 const d=f.contentDocument,w=f.contentWindow,$=selector=>d.querySelector(selector),cab=()=>$('#cab'),phase=()=>cab().dataset.phase,speed=()=>Number($('#speed').dataset.mps),distance=()=>Number($('#distance').dataset.metres);
 await wait(()=>$('#skip'),'intro loaded');
 function fit(){assert(d.documentElement.scrollWidth<=width+1,'horizontal overflow');assert(d.documentElement.scrollHeight<=height+1,'vertical overflow');const list=$('#overlay').hidden?d.querySelectorAll('#master button,#door,#horn,header a,header button'):d.querySelectorAll('#overlay button,#overlay a');for(const e of list){const r=e.getBoundingClientRect();assert(r.x>=-1&&r.y>=-1&&r.right<=width+1&&r.bottom<=height+1,`offscreen ${e.id||e.textContent} ${JSON.stringify(r.toJSON())}`);}}
 function click(selector){const e=$(selector);assert(e,`missing ${selector}`);assert(!e.disabled,`disabled ${selector}`);const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;assert(r.width>=44&&r.height>=44,`small ${selector}: ${r.width}×${r.height}`);const target=d.elementFromPoint(x,y);assert(target&&(target===e||e.contains(target)),`blocked ${selector}`);target.dispatchEvent(new w.MouseEvent('click',{bubbles:true,clientX:x,clientY:y}));fit();}
 fit();if(width===568){click('#listen');await wait(()=>$('#overlay').hidden,'listen start');assert(w.__speech.some(t=>t.includes('駅が見えたら')),'instructions not spoken');}else click('#skip');
 await wait(()=>phase()==='doors-open','start doors');assert(speed()===0,'moving with open door');assert($('[data-notch="1"]').disabled,'open door must lock power');
 click('#door');assert(phase()==='closing','close animation');await wait(()=>phase()==='ready','doors close');
 // A pointer travels along the physical lever, not an API call into the model.
 const master=$('#master'),r=master.getBoundingClientRect();master.setPointerCapture=()=>{};master.releasePointerCapture=()=>{};master.hasPointerCapture=()=>false;
 const pointer=(type,fraction)=>master.dispatchEvent(new w.PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'touch',clientX:r.x+r.width*.25,clientY:r.y+r.height*fraction}));
 pointer('pointerdown',.15);await wait(()=>speed()>8,'accelerate');const fast=speed();pointer('pointermove',.5);assert(cab().dataset.notch==='0','drag to coast');await wait(()=>speed()<fast-.06,'coast speed change');assert(speed()>fast*.85,'coast inertia');pointer('pointermove',.85);assert(cab().dataset.notch==='-1','drag to brake');await wait(()=>speed()<fast-1,'gradual brake');pointer('pointerup',.85);assert(speed()>0,'brake must not instantly stop');
 click('#horn');assert($('#horn').classList.contains('sounding'),'horn event');
 click('#pause');const frozen=distance();await sleep(80);assert(distance()===frozen,'paused physics moves');click('#resume');
 for(let leg=0;leg<3;leg++){
  if(leg>0){await wait(()=>phase()==='doors-open','boarding done');click('#door');await wait(()=>phase()==='ready','next departure');}
  click('[data-notch="1"]');
  if(leg===1){await wait(()=>distance()<=speed()*speed()/(2*2.65)+3,'manual braking point');click('[data-notch="-1"]');}
  await wait(()=>phase()==='arrived','arrival',45000);fit();assert(Number(cab().dataset.arrivals)===leg+1,'station count');assert(speed()===0,'arrival while moving');assert(!$('#arrival').hidden,'no result');if(leg===1)assert(['perfect','arrival'].includes(cab().dataset.result),'manual stopping failed');if(leg===2)assert(cab().dataset.result==='overrun','overrun not shown');
  assert($('[data-notch="1"]').disabled,'departed before boarding');click('#door');assert(phase()==='opening','door not opening');await wait(()=>phase()==='boarding','passengers');assert($('#door-scene').classList.contains('boarding'),'passengers missing');
 }
 await wait(()=>phase()==='complete','finish');fit();assert($('#overlay').textContent.includes('うんてん ありがとう'),'no final celebration');click('#again');assert(phase()==='doors-open'&&cab().dataset.arrivals==='0','replay not reset');
 assert(w.__errors.length===0,w.__errors.join('; '));assert(!w.__overlap,'voice overlap');
 const canvas=$('#scenery'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;assert(pixels.some((v,i)=>i%4===0&&v!==pixels[0]),'blank scene');
 click('#home');await wait(()=>f.contentWindow.location.pathname.endsWith('/games/asobou/index.html'),'return to driving menu');
 log(`PASS ${width}×${height}: 説明/スキップ・ドア連動・タッチレバー・加速/惰行/ブレーキ・警笛操作・一時停止・3駅・停止結果・乗降・完走・再プレイ・ホーム・画面内/コンソール`);f.remove();
}
document.querySelector('#run').onclick=async()=>{document.querySelector('#run').disabled=true;lines.length=0;try{const q=new URLSearchParams(location.search);const sizes=q.has('w')?[[Number(q.get('w')),Number(q.get('h'))]]:[[568,320],[844,390],[1024,768],[320,568]];for(const [w,h]of sizes)await run(w,h);log('ALL PASS');document.body.dataset.result='pass';}catch(e){log('FAIL '+e.stack);document.body.dataset.result='fail';}finally{document.querySelector('#run').disabled=false;}};
