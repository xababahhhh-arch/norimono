const sleep=ms=>new Promise(r=>setTimeout(r,ms)),results=document.querySelector('#results'),lines=[];
function log(t){lines.push(t);results.textContent=lines.join('\n');}
function assert(v,t){if(!v)throw Error(t);}
async function wait(fn,t,ms=15000){const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('timeout '+t);await sleep(30);}return fn();}
async function run(kind){
 const frame=document.createElement('iframe');frame.src='../games/play/'+kind+'.html';frame.title=kind;const loaded=new Promise(r=>frame.onload=r);document.querySelector('#frames').append(frame);await loaded;
 const w=frame.contentWindow,d=frame.contentDocument,errors=[];w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 w.speechSynthesis.speak=u=>setTimeout(()=>u.onend?.(),10);w.speechSynthesis.cancel=()=>{};w.Element.prototype.setPointerCapture=()=>{};w.Element.prototype.releasePointerCapture=()=>{};
 d.querySelector('#skip').click();
 for(let round=0;round<3;round++){
  await wait(()=>!d.querySelector('#again'),'game state');
  if(kind==='fire'){await wait(()=>d.querySelectorAll('.target').length===round+1,'fire stage');d.querySelector('.vehicle').click();d.querySelectorAll('.target').forEach(b=>b.click());}
  if(kind==='rail'){await wait(()=>d.querySelectorAll('.gap').length===round+1,'rail stage');for(const label of [['まっすぐ'],['したへ カーブ','みぎへ カーブ'],['ぶんき','したへ カーブ','みぎへ カーブ']][round])d.querySelector(`[aria-label="${label}"]`).click();await wait(()=>d.querySelector('.rail-train'),'train');}
  if(kind==='wash'){await wait(()=>d.querySelector('.wash-sign')?.textContent==='みず','wash stage');for(const next of ['あわ','ブラシ','みず','complete']){const zone=d.querySelector('.washzone'),r=zone.getBoundingClientRect();for(let i=0;i<10;i++){zone.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,pointerId:1,clientX:r.x+r.width*.5,clientY:r.y+r.height*.5}));zone.dispatchEvent(new w.PointerEvent('pointerup',{bubbles:true,pointerId:1}));}if(next==='complete')await wait(()=>d.querySelector('.vehicle.drive'),'wash departure');else await wait(()=>d.querySelector('.wash-sign')?.textContent===next,'wash phase '+next);}}
  if(kind==='truck'){await wait(()=>d.querySelectorAll('.crate:not(:disabled)').length===round+3,'truck stage');d.querySelectorAll('.crate').forEach(b=>b.click());assert(d.querySelectorAll('.vehicle>.crate').length===round+3,'cargo must belong to truck');await wait(()=>d.querySelector('.vehicle.drive'),'truck departure');const vr=d.querySelector('.vehicle').getBoundingClientRect(),bed=w.NoriVehicles.anchors.truck.bed;for(const box of d.querySelectorAll('.vehicle>.crate')){const br=box.getBoundingClientRect();assert(br.left>=vr.left+bed.x/320*vr.width-1&&br.right<=vr.left+(bed.x+bed.width)/320*vr.width+1,'cargo beyond bed sides');assert(br.bottom<=vr.top+bed.floorY/160*vr.height+1,'cargo floats below bed floor');}}
  if(kind==='night'){await wait(()=>d.querySelectorAll('.hidden-vehicle').length===round+3,'night stage');for(const b of d.querySelectorAll('.hidden-vehicle')){const r=b.getBoundingClientRect(),opts={bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2};b.dispatchEvent(new w.PointerEvent('pointerdown',opts));b.dispatchEvent(new w.MouseEvent('click',opts));}assert(d.querySelectorAll('.found').length===round+3,'found count');}
  const board=d.querySelector('#stage').firstElementChild;
  await wait(()=>!board.isConnected,'next stage');
  assert(errors.length===0,errors.join('; '));log(`PASS ${kind} stage ${round+1}`);
 }
 await wait(()=>d.querySelector('#again'),'clear');d.querySelector('#again').click();await wait(()=>!d.querySelector('#again'),'restart');assert(d.querySelector('#home').getAttribute('href')==='../../index.html','home URL');log(`PASS ${kind}: クリア・再挑戦・ホーム導線`);frame.remove();
}
try{for(const kind of ['fire','rail','wash','truck','night'])await run(kind);log('ALL PASS: 5本×3ステージ');document.title='PASS — 新作5本の通し操作検証';}catch(e){log('FAIL: '+e.message);document.title='FAIL — 新作5本の通し操作検証';}
