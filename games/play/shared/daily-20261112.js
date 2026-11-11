(()=>{'use strict';
const definitions=[
['bridge-planks','はしを かけよう','🌉','トラック'],['fuel-match','ガソリン いくつ？','⛽','くるま'],['mirror-bus','かがみの バス','🚌','バス'],['traffic-pause','しんごうで とまろう','🚦','バス'],['repair-wheels','タイヤを なおそう','🛞','トラック'],['tunnel-echo','トンネルの こだま','🚆','でんしゃ'],['delivery-map','にもつを とどけよう','📦','トラック'],['shadow-cloud','くもの かくれんぼ','✈️','ひこうき'],['boat-current','かわの ながれ','🚤','ふね'],['rescue-priority','たすける じゅんばん','🚑','きゅうきゅうしゃ']
];
const game=definitions.find(g=>g[0]===document.body.dataset.game);if(!game)return;
const $=id=>document.getElementById(id),stage=$('stage'),choices=$('choices'),hint=$('hint'),progress=$('progress');
let round=0,question=null,busy=true,epoch=0,ctx=null;
const pick=a=>a[Math.floor(Math.random()*a.length)],shuffle=a=>[...a].sort(()=>Math.random()-.5),pause=t=>new Promise(r=>setTimeout(r,t));
function unlock(){try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume()}catch{}}
function notes(freqs,volume=.02){unlock();if(!ctx)return;freqs.forEach((f,i)=>{const t=ctx.currentTime+i*.11,o=ctx.createOscillator(),v=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.03,t+.1);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(volume,t+.018);v.gain.exponentialRampToValueAtTime(.0001,t+.19);o.connect(v).connect(ctx.destination);o.start(t);o.stop(t+.2)})}
function cancel(){epoch++;try{speechSynthesis.cancel()}catch{}}
async function speak(text){const e=epoch;hint.textContent=text;try{if('speechSynthesis'in window)await new Promise(resolve=>{const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=.82;let done=false;const finish=()=>{if(!done){done=true;resolve()}};u.onend=finish;u.onerror=finish;speechSynthesis.cancel();speechSynthesis.speak(u);setTimeout(finish,Math.min(8000,2000+text.length*220))})}catch{}await pause(120);return epoch===e}
function btn(label,fn,spoken=label){const b=document.createElement('button');b.className='choice';b.textContent=label;b.setAttribute('aria-label',spoken);b.onclick=fn;choices.append(b)}
function create(){
const r=round,m=game[0],q={prompt:'',view:'',detail:'',options:[],answer:'',feedback:'',sequence:null};
if(m==='bridge-planks'){const n=r+2;q.view='🚚   🟫  🌊'.repeat(1);q.detail='🌉 '+ '〰️'.repeat(n);q.answer='🪵'.repeat(n);q.options=shuffle([1,2,3,4,5].map(k=>'🪵'.repeat(k)));q.prompt='トラックの ために '+n+'ほんの はしを かけよう';q.feedback='はしが つながったね'}
if(m==='fuel-match'){const n=r+1;q.view='🚗  ⛽';q.detail='ガソリン '+ '🟩'.repeat(n)+'⬜'.repeat(4-n);q.answer=String(n);q.options=['1','2','3','4'];q.prompt='くるまに ガソリンを '+n+'めもり いれよう';q.feedback=n+'めもり いれたね'}
if(m==='mirror-bus'){const shapes=['🟦','🟨','🟩','🟥'];const a=shuffle(shapes).slice(0,r+2),last=pick(a);q.view='🚌  🪞';q.detail=a.join(' ')+' │ '+a.slice().reverse().map(x=>x===last?'❔':x).join(' ');q.answer=last;q.options=shuffle(shapes);q.prompt='バスの かがみで かくれた '+({ '🟦':'あお','🟨':'きいろ','🟩':'みどり','🟥':'あか'})[last]+'の まどを えらぼう';q.feedback='かがみが かんせいしたね'}
if(m==='traffic-pause'){const a=[['🔴','とまる','🛑'],['🟢','すすむ','▶️'],['🟡','ゆっくり','🐢']];const x=a[r];q.view='🚌  '+x[0];q.detail='🚦  🛣️';q.answer=x[2];q.options=shuffle(['🛑','▶️','🐢','↩️']);q.prompt='バスの しんごうが '+(['あか','あお','きいろ'][r])+'だよ。 '+x[1]+'を えらぼう';q.feedback=x[1]+'が できたね'}
if(m==='repair-wheels'){const n=r+1;q.view='🚚  🔧';q.detail='タイヤが '+n+'こ たりないよ  '+'⚪'.repeat(n);q.answer='🛞'.repeat(n);q.options=shuffle([1,2,3,4].map(k=>'🛞'.repeat(k)));q.prompt='トラックに タイヤを '+n+'こ つけよう';q.feedback='タイヤが ついたね'}
if(m==='tunnel-echo'){const a=['タン','トン','ポン'];const seq=Array.from({length:r+2},()=>pick(a));q.view='🚆  🚇  🔊';q.detail=seq.map(()=> '🎵').join(' ');q.sequence=seq;q.answer=seq[0];q.options=shuffle(a);q.prompt='でんしゃの トンネルだよ。 '+seq.join('、')+'。 おなじ じゅんばんで おしてね';q.feedback='こだまが きこえたね'}
if(m==='delivery-map'){const a=['🏠','🏫','🏥','🏪','🏡'];const seq=shuffle(a).slice(0,r+2);q.view='🚚  🗺️';q.detail=seq.join(' → ');q.sequence=seq;q.answer=seq[0];q.options=shuffle(a);q.prompt='トラックで '+seq[0]+'に にもつを とどけよう';q.feedback='にもつが とどいたね'}
if(m==='shadow-cloud'){const a=['✈️','🚁','🚀','🛩️','🛸'];const target=a[r];q.view='☁️  ☁️  '+target+'  ☁️';q.detail='くもの なかの のりものを さがそう';q.answer=target;q.options=shuffle(a);q.prompt='ひこうきの なかま '+target+'を みつけよう';q.feedback='くもの なかに いたね'}
if(m==='boat-current'){const a=[['➡️','みぎ','⛵'],['⬅️','ひだり','🚤'],['⬇️','した','🛶']];const x=a[r];q.view=x[2]+'  🌊  '+x[0];q.detail='ながれに のって すすもう';q.answer=x[0];q.options=shuffle(['➡️','⬅️','⬇️','⬆️']);q.prompt='ふねを かわの ながれに あわせて '+x[1]+'へ すすめよう';q.feedback='ながれに のれたね'}
if(m==='rescue-priority'){const a=[['🚑','🏥','びょういん'],['🚒','🔥','かじ'],['🚓','🚦','こうさてん']];const x=a[r];q.view=x[1]+'  📣';q.detail='だれを よぼう？';q.answer=x[0];q.options=shuffle(['🚑','🚒','🚓','🚁']);q.prompt='きゅうきゅうしゃの なかまを かんがえよう。 '+x[2]+'には どの くるま？';q.feedback='たすけに きたね'}
return q}
function draw(){stage.innerHTML='';const big=document.createElement('div');big.textContent=question.view;const small=document.createElement('div');small.className='detail';small.textContent=question.detail;stage.append(big,small);choices.innerHTML='';question.options.forEach(x=>btn(x,()=>choose(x)));progress.textContent=(round+1)+' / 3'+(question.sequence?'  ⭐ '+(question.sequenceIndex||0)+' / '+question.sequence.length:'')}
async function begin(){cancel();busy=true;question=create();question.sequenceIndex=0;draw();const e=epoch;await speak(question.prompt);if(epoch===e)busy=false}
function sparkle(){const s=document.createElement('span');s.className='star';s.textContent='🌟 ⭐ ✨';stage.append(s);setTimeout(()=>s.remove(),800)}
async function choose(x){if(busy)return;busy=true;unlock();const b=[...choices.children].find(b=>b.textContent===x);if(x!==question.answer){notes([440,392],.012);b?.classList.add('wrong');await speak('これは '+x+' だね。 もういちど。 '+question.prompt);b?.classList.remove('wrong');busy=false;return}
notes([523,659,784]);b?.classList.add('right');sparkle();await speak('せいかい！ '+question.feedback);
if(question.sequence&&question.sequenceIndex<question.sequence.length-1){question.sequenceIndex++;question.answer=question.sequence[question.sequenceIndex];question.prompt=game[3]+'で '+question.answer+'を つぎに えらぼう';draw();await speak(question.prompt);busy=false;return}
round++;if(round<3){await pause(300);await begin()}else await finish()}
async function finish(){cancel();busy=true;notes([523,659,784,1046,880,1175],.027);stage.textContent='🎉  ⭐  🎊';choices.innerHTML='';progress.textContent='3 / 3';await speak('ぜんぶ できたね！ すごいね！');btn('🔁 もういちど',()=>{round=0;intro()},'もういちど');btn('🏠 おうちへ',()=>location.href='../../index.html','おうちへ');busy=false}
function intro(){cancel();busy=true;stage.textContent=game[2]+'  👆';hint.textContent=game[1]+'。 はじめるを おしてね';progress.textContent='あそびかた';choices.innerHTML='';btn('▶️ はじめる',()=>{unlock();begin()},'はじめる')}
$('repeat').onclick=()=>{unlock();if(!busy&&question)speak(question.prompt)};$('again').onclick=()=>{round=0;intro()};addEventListener('pagehide',cancel);intro();
})();