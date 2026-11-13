(()=>{'use strict';
const games=[
['ticket-count','きっぷを くばろう','かず','🚆','でんしゃの おきゃくさんに きっぷを くばる'],
['shape-ferry','かたちの フェリー','かたち','⛴️','かたちの あなに にもつを はめる'],
['color-bus','バスの いろさがし','いろ','🚌','バスの まどと おなじ いろを さがす'],
['memory-ship','ふねの たからばこ','きおく','🚢','ふねに のせた たからを おぼえる'],
['sound-station','えきの ベル','おと','🚆','えきの ベルの なった かずを きく'],
['rocket-target','ロケットの ほし','ほうこう','🚀','ロケットを ほしの ほうへ むける'],
['delivery-steps','はいたつの じゅんろ','じゅんばん','🚚','にもつを じゅんばんに とどける'],
['find-garage','ガレージの まちがい','かんさつ','🚗','ちがう くるまを みつける'],
['rain-wiper','あめの ワイパー','いんが','🚙','あめの つよさに あわせて ワイパーを うごかす'],
['crane-operator','クレーンで はこぼう','そうさ','🏗️','クレーンを うごかして にもつを おろす']
];
const game=games.find(g=>g[0]===new URLSearchParams(location.search).get('id'))||games[0],mode=games.indexOf(game),$=id=>document.getElementById(id),stage=$('stage'),choices=$('choices'),hint=$('hint'),progress=$('progress');$('title').textContent=game[1];document.title=game[1];
const symbols={'🌳':'き','🏠':'おうち','🏫':'がっこう','🏥':'びょういん','🚗':'くるま','🚙':'くるま','🚆':'でんしゃ','🚚':'トラック','🚢':'ふね','🚌':'バス','🚀':'ロケット','🔴':'あか','🔵':'あお','🟡':'きいろ','🟢':'みどり','●':'まる','▲':'さんかく','■':'しかく','★':'ほし','⬆️':'うえ','⬇️':'した','⬅️':'ひだり','➡️':'みぎ','🍎':'りんご','🍌':'バナナ','🍇':'ぶどう','🧸':'ぬいぐるみ','🛑':'とまる','▶️':'すすむ'};
const name=x=>symbols[x]||String(x),wait=t=>new Promise(r=>setTimeout(r,t));let round=0,step=0,q,busy=true,epoch=0,ctx;
function sound(ok){try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume();const notes=ok?[523,659,784]:[392,440];notes.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.11;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.018,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.19)})}catch{}}
function cancel(){epoch++;try{speechSynthesis.cancel()}catch{}}
async function say(text){cancel();const e=epoch;hint.textContent=text;document.body.dataset.speaking='true';try{if('speechSynthesis'in window)await new Promise(resolve=>{const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=.86;let done=false;const end=()=>{if(!done){done=true;resolve()}};u.onend=end;u.onerror=end;try{speechSynthesis.speak(u)}catch{end()}setTimeout(end,Math.min(7000,2200+text.length*170))})}catch{}await wait(100);if(e===epoch)document.body.dataset.speaking='false';return e===epoch}
function question(){const n=round+2;const z={view:'',detail:'',answer:'',options:[],prompt:'',need:1,sequence:null};
switch(mode){
case 0:z.view='🚆  '+ '🧍'.repeat(n);z.detail='おきゃくさんに きっぷを くばろう';z.answer=String(n);z.options=['1','2','3','4','5','6'];z.prompt='でんしゃの おきゃくさんは '+n+'にん だよ。 '+n+'の すうじを おして きっぷを くばそう';break;
case 1:{const a=['●','▲','■','★'],x=a[round];z.view='⛴️  '+x+'  ❔';z.detail='フェリーの あなと おなじ かたち';z.answer=x;z.options=a;z.prompt='フェリーに '+name(x)+'の あなが あるよ。 '+name(x)+'を おしてね';break}
case 2:{const a=['🔴','🔵','🟡','🟢'],x=a[round];z.view='🚌  🪟  '+x;z.detail='まどと おなじ いろを さがそう';z.answer=x;z.options=a;z.prompt='バスの まどは '+name(x)+'だよ。 '+name(x)+'の ボタンを おしてね';break}
case 3:{const a=['🍎','🍌','🍇'],x=a[round];z.view='🚢  📦  '+x;z.detail='たからを おぼえてね';z.answer=x;z.options=a;z.prompt='ふねの たからは '+name(x)+'だよ。 よく みて おぼえてね。 かくれたら '+name(x)+'を おしてね';z.hide=true;break}
case 4:{z.view='🚆  🔔  '+ '🎵'.repeat(n);z.detail='ベルが なんかい なったかな';z.answer=String(n);z.options=['1','2','3','4','5','6'];z.prompt='でんしゃの えきの ベルを きこう。 '+Array(n).fill('リン').join('、')+'。 なんかい かな？ すうじを おしてね';break}
case 5:{const a=['⬆️','➡️','⬅️'],x=a[round];z.view='🚀  🌟  '+x;z.detail='ほしの ほうへ すすめよう';z.answer=x;z.options=['⬆️','➡️','⬅️','⬇️'];z.prompt='ロケットの ほしは '+name(x)+'に あるよ。 '+name(x)+'の やじるしを おしてね';break}
case 6:{const a=['🏠','🏫','🏥','🌳'];z.sequence=a.slice(0,n);z.view='🚚  '+z.sequence.join(' → ');z.detail='ひだりから じゅんばんに とどけよう';z.answer=z.sequence[0];z.options=a;z.prompt='トラックで にもつを とどけよう。 さいしょは '+name(z.answer)+' だよ。 '+name(z.answer)+'を おしてね';break}
case 7:{const a=['🚗','🚙','🚚'],x=a[round],k=round+1;z.view=Array.from({length:4},(_,i)=>i===k?x:'🚗').join('  ');z.detail='ひとつだけ ちがう くるまを さがそう';z.answer=String(k+1);z.options=['1','2','3','4'];z.prompt='ガレージの '+name(x)+'を さがそう。 ひだりから '+(k+1)+'ばんめ だよ。 すうじを おしてね';break}
case 8:{const a=['よわい','ふつう','つよい'],x=a[round];z.view='🚙  🌧️  '+ '💧'.repeat(n);z.detail='あめの つよさに あわせよう';z.answer=x;z.options=a;z.prompt='くるまの まどに あめが '+x+' よ。 ワイパーを '+x+'に してね';break}
case 9:{z.view='🏗️  📦  '+ '⬇️'.repeat(n);z.detail='はこを おろそう';z.answer='おろす';z.options=['あげる','おろす','とめる'];z.need=n;z.prompt='クレーンで はこを '+n+'こ おろそう。 おろすを おしてね';break}
}z.options=[...new Set(z.options)];if(z.options.every(x=>/^\d+$/.test(x)))z.options.sort((a,b)=>Number(a)-Number(b));return z}
function paint(){stage.innerHTML='';const big=document.createElement('div');big.textContent=q.view;const detail=document.createElement('div');detail.className='detail';detail.textContent=q.detail;stage.append(big,detail);choices.innerHTML='';q.options.forEach(x=>{const b=document.createElement('button');b.className='choice';b.textContent=x;b.setAttribute('aria-label',name(x));b.onclick=()=>choose(x);choices.append(b)});progress.textContent=(round+1)+' / 3'+(q.sequence?'  ⭐ '+step+'/'+q.sequence.length:mode===9?'  ⭐ '+step+'/'+q.need:'')}
async function begin(){busy=true;step=0;q=question();paint();const e=epoch;await say(q.prompt);if(e!==epoch)return;if(q.hide)stage.firstChild.textContent='🚢  📦  ❓';busy=false}
async function choose(x){if(busy)return;busy=true;if(x!==q.answer){sound(false);await say('これは '+name(x)+' だね。 '+q.prompt);busy=false;return}sound(true);stage.firstChild.textContent='⭐  '+game[3]+'  ⭐';
if(q.sequence&&step<q.sequence.length-1){step++;q.answer=q.sequence[step];q.prompt='つぎは '+name(q.answer)+' だよ。 '+name(q.answer)+'の マークを おしてね';paint();await say(q.prompt);busy=false;return}
if(mode===9&&step<q.need-1){step++;progress.textContent=(round+1)+' / 3  ⭐ '+step+'/'+q.need;await say('いいね。 あと '+(q.need-step)+'こ。 おろすを おしてね');busy=false;return}
await say('せいかい！ '+game[3]+'が できたね');round++;if(round<3){await wait(180);await begin()}else finish()}
async function finish(){busy=true;sound(true);stage.textContent='🎉  🌟  🎊';progress.textContent='3 / 3';choices.innerHTML='';await say('ぜんぶ できたね！ すごいね！');const again=document.createElement('button');again.className='choice';again.textContent='🔁 もういちど';again.onclick=()=>{round=0;intro()};choices.append(again);const home=document.createElement('button');home.className='choice';home.textContent='🏠 おうちへ';home.onclick=()=>location.href='../../index.html';choices.append(home);busy=false}
function intro(){cancel();busy=true;stage.textContent=game[3]+'  👆';hint.textContent=game[4]+'。 はじめるを おしてね';progress.textContent='あそびかた';choices.innerHTML='';const b=document.createElement('button');b.className='choice';b.textContent='▶️ はじめる';b.onclick=()=>{try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume()}catch{}begin()};choices.append(b)}
$('repeat').onclick=()=>{if(!busy&&q)say(q.prompt)};$('again').onclick=()=>{round=0;intro()};addEventListener('pagehide',cancel);intro();
})();