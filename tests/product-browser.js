const results=document.querySelector('#results'),lines=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=text=>{lines.push(text);results.textContent=lines.join('\n');};
const assert=(value,message)=>{if(!value)throw Error(message);};
async function wait(fn,label,ms=14000){const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('timeout: '+label);await sleep(30);}return fn();}
async function run(game){
 const width=Number(new URLSearchParams(location.search).get('width'))||390,height=Number(new URLSearchParams(location.search).get('height'))||844;const frame=document.createElement('iframe');frame.style.width=width+'px';frame.width=width;frame.style.height=height+'px';frame.height=height;frame.title=game.name;frame.src='../'+game.url;const loaded=new Promise(r=>frame.onload=r);document.querySelector('#frames').append(frame);await loaded;
 const w=frame.contentWindow,d=frame.contentDocument,errors=[],spoken=[];
 w.addEventListener('error',e=>errors.push(e.message));
 w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 w.speechSynthesis.speak=u=>{spoken.push(u.text);setTimeout(()=>u.onend?.(),10);};w.speechSynthesis.cancel=()=>{};
 w.Element.prototype.setPointerCapture=()=>{};w.Element.prototype.releasePointerCapture=()=>{};
 assert(w.NoriVoice,'shared voice missing');assert(w.NoriVehicles,'shared vehicles missing');
 const before=d.body.innerHTML;
 const gate=d.querySelector('#noriVoiceGate .skipVoice');if(gate){if([12,14].includes(game.no)){d.querySelector('#noriVoiceGate .startVoice').click();await wait(()=>!d.querySelector('#noriVoiceGate'),'spoken introduction');}else gate.click();}
 const skip=d.querySelector('#skip');if(skip)skip.click();
 if(game.no===1){for(const selector of ['#play','#skipIntro']){const r=d.querySelector(selector).getBoundingClientRect();assert(r.top>=0&&r.bottom<=height,'start control outside screen: '+selector);}d.querySelector('#play').click();await wait(()=>d.querySelector('.choice'),'guess choices');await wait(()=>spoken.some(x=>x.includes('どれ')),'question');const q=spoken.findLast(x=>x.includes('どれ'));const v=w.NoriVehicles.list().find(v=>q.startsWith(v.say));assert(v,'question pronunciation');d.querySelector(`.choice [data-nori-vehicle="${v.id}"]`).closest('button').click();await wait(()=>d.querySelector('.choice.good'),'correct response');}
 else if(game.no===2){assert(d.querySelector('canvas'),'road canvas');}
 else if(game.no===3){await wait(()=>d.querySelector('.target'),'repair target');d.querySelector('.target').click();await wait(()=>d.querySelector('#prompt').textContent.includes('できた'),'repair response');}
 else if(game.no===4){assert(d.querySelector('#nk-begin'),'classification start');d.querySelector('#nk-begin').click();await sleep(1700);assert(d.querySelectorAll('svg').length>0,'classification illustrations');}
 else if(game.no===5){const shadow=d.querySelector('#shadow svg');const correct=[...d.querySelectorAll('.choice')].find(b=>b.querySelector('svg')?.isEqualNode(shadow));assert(correct,'silhouette pair');correct.click();await wait(()=>correct.classList.contains('correct'),'shadow correct');}
 else if(game.no===6){await wait(()=>d.querySelector('#green.on'),'green light');d.querySelector('#car').click();await wait(()=>d.querySelector('#car.go'),'car departure');}
 else if(game.no===7){d.querySelector('[data-home="しょうぼうしょ"]').click();await wait(()=>d.querySelector('.home.good'),'garage response');}
 else if(game.no===8){await sleep(150);const b=d.querySelector('[data-nori-vehicle="ambulance"]')?.closest('button');assert(b,'sound ambulance');b.click();await sleep(500);}
 else if(game.no===9){d.querySelector('#startBtn').click();await wait(()=>d.querySelectorAll('.choice').length>0,'size choices');const big=d.querySelector('#prompt').textContent.includes('おおきい');const buttons=[...d.querySelectorAll('.choice')].sort((a,b)=>parseFloat(a.querySelector('.vehicle').style.width)-parseFloat(b.querySelector('.vehicle').style.width));(big?buttons.at(-1):buttons[0]).click();await wait(()=>d.querySelector('.choice.good'),'size response');}
 else if(game.no===10){d.querySelector('[data-ok="true"]').click();await wait(()=>d.querySelector('.good'),'correct response');}
 else if(game.no===17){for(let round=0;round<6;round++){const old=await wait(()=>d.querySelector('[data-ok="true"]'),'pattern choice');old.click();if(round<5)await wait(()=>!old.isConnected,'next pattern');else await wait(()=>d.querySelector('#done.show'),'pattern clear');}}
 else if(game.no===11){const b=[...d.querySelectorAll('.choice')].find(b=>b.querySelectorAll('.item').length===1);assert(b,'count option');b.click();await sleep(500);}
 else if(game.no===12){d.querySelector('#drum').dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true}));await sleep(150);}
 else if(game.no===13){d.querySelector('#listen').click();await sleep(3700);d.querySelector('#high').click();await sleep(500);}
 else if(game.no===14){d.querySelector('#listen').click();await sleep(1200);assert(d.querySelectorAll('.pad').length===3,'sound pads');}
 else if(game.no===15){d.querySelector('#loud').dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true}));await sleep(600);}
 else if(game.no===16){const fast=parseFloat(d.querySelector('#car').style.getPropertyValue('--dur'))<2;d.querySelector(`[data-a="${fast?'fast':'slow'}"]`).click();await sleep(500);}
 else if(game.no===18){const icon=d.querySelector('.scene .step svg');const target=icon?.getAttribute('data-nori-icon')||icon?.getAttribute('data-nori-vehicle');const b=[...d.querySelectorAll('#choices button')].find(b=>b.querySelector('svg')?.getAttribute('data-nori-icon')===target||b.querySelector('svg')?.getAttribute('data-nori-vehicle')===target);assert(b,'sequence option');b.click();await sleep(500);}
 else if(game.no===19){d.querySelector('[data-pos="left"]').click();await sleep(500);}
 else if(game.no===20){d.querySelector('.vehicle').click();d.querySelector('.target').click();await wait(()=>!d.querySelector('.target'),'fire smoke and extinction');}
 else if(game.no===21){d.querySelector('#tools [aria-label="まっすぐ"]').click();await wait(()=>d.querySelector('.rail-train'),'running train');}
 else if(game.no===22){const zone=d.querySelector('.washzone'),r=zone.getBoundingClientRect();for(let i=0;i<10;i++){zone.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,pointerId:1,clientX:r.x+r.width*.5,clientY:r.y+r.height*.5}));zone.dispatchEvent(new w.PointerEvent('pointerup',{bubbles:true,pointerId:1}));}await wait(()=>d.querySelector('.wash-sign').textContent==='あわ','wash phase');}
 else if(game.no===23){d.querySelectorAll('.crate').forEach(b=>b.click());await wait(()=>d.querySelector('.vehicle.drive'),'loaded truck departure');}
 else if(game.no===24){const b=d.querySelector('.hidden-vehicle'),r=b.getBoundingClientRect(),opts={bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2};b.dispatchEvent(new w.PointerEvent('pointerdown',opts));b.dispatchEvent(new w.MouseEvent('click',opts));await wait(()=>d.querySelector('.hidden-vehicle.found'),'found vehicle');}
 await sleep(400);
 const walker=d.createTreeWalker(d.body,w.NodeFilter.SHOW_TEXT),remaining=[];while(walker.nextNode()){const n=walker.currentNode;if(!n.parentElement.closest('script,style')&&/[🚗🚙🚑🚒🚓🚚🚛🚜🚂🚆🚃🚄🚅🚲🚕🚌🚢✈]/u.test(n.nodeValue))remaining.push(n.nodeValue.trim());}
 assert(!remaining.length,'vehicle emoji remains: '+remaining.join(','));
 assert(!d.querySelector('script[src="../../vehicles.js"]'),'legacy brand art still loaded');
 assert(d.documentElement.scrollWidth<=width,'horizontal overflow');const clipped=[...d.querySelectorAll('button,a')].filter(el=>{const r=el.getBoundingClientRect(),style=w.getComputedStyle(el);return r.width&&r.height&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&!el.disabled&&!el.closest('.go,.drive')&&(r.left<-.5||r.right>width+.5||r.top<-.5||r.bottom>height+.5);});assert(!clipped.length,'offscreen controls: '+clipped.map(x=>x.id||x.className).join(','));
 assert(!errors.length,errors.join('; '));
 if(game.no!==2)assert(spoken.length>0,'no utterance reached shared voice');
 assert(spoken.every(t=>!/[\u3040-\u30ff] [\u3040-\u30ff]/.test(t)),'fragmented spoken sentence');
 log(`PASS No.${game.no} ${game.name}: 表示・最初の操作・音声接続（${spoken.length}文）`);
 frame.remove();
}
try{
 const catalog=await(await fetch('../docs/game-catalog.json')).json();
 const only=(new URLSearchParams(location.search).get('only')||'').split(',').map(Number).filter(Boolean);const games=catalog.filter(g=>g.no<=24&&(!only.length||only.includes(g.no)));for(const game of games)await run(game);
 log(`ALL PASS: ${games.length}本。発音・アクセントの実聴、全ステージの再評価、固定音声制作は別途。`);document.title='PASS — 素材・音声の動作検証';
}catch(e){log('FAIL: '+e.message);document.title='FAIL — 素材・音声の動作検証';}
