(()=>{'use strict';
const games=[
['bus-stop-count','バスていの ならび','かず','🚌','バスていに ひとりずつ ならぼう'],
['roof-builder','トラックの やね','かたち','🚚','やねの かたちを つくろう'],
['signal-painter','しんごう ぬりえ','いろ','🚦','しんごうの いろを つけよう'],
['hide-helicopter','ヘリは どこ？','きおく','🚁','ヘリの いた ばしょを おぼえよう'],
['drum-boat','ふねの たいこ','おと','🚢','たいこの リズムを まねしよう'],
['submarine-steer','せんすいかんの そうじゅう','ほうこう','🚢','うみの なかを すすもう'],
['train-car-order','でんしゃの れんけつ','じゅんばん','🚆','しゃりょうを じゅんばんに つなごう'],
['vehicle-spotlight','ライトで みつけよう','かんさつ','🚓','ライトに うつった のりものを さがそう'],
['wind-sock','ふきながしの かぜ','いんが','🚁','かぜの つよさで ふきながしを うごかそう'],
['snow-loader','ゆきを つもう','そうさ','🚜','ショベルカーで ゆきを つもう']
];
const game=games.find(g=>g[0]===new URLSearchParams(location.search).get('id'))||games[0],mode=games.indexOf(game),$=id=>document.getElementById(id),stage=$('stage'),choices=$('choices'),hint=$('hint'),progress=$('progress');$('title').textContent=game[1];document.title=game[1];
const names={'🌸':'さくら','🌳':'き','🏠':'おうち','🏫':'がっこう','🚁':'ヘリコプター','🚆':'でんしゃ','🚓':'パトカー','🚜':'ショベルカー','🚚':'トラック','🚢':'ふね','🔴':'あか','🟡':'きいろ','🟢':'みどり','🔵':'あお','●':'まる','▲':'さんかく','■':'しかく','★':'ほし','⬆️':'うえ','⬇️':'した','⬅️':'ひだり','➡️':'みぎ','🥁':'ドン','👏':'パン','🔔':'リン'};
const name=x=>names[x]||String(x),wait=t=>new Promise(r=>setTimeout(r,t));let round=0,step=0,q,busy=true,epoch=0,ctx=null;
function audio(kind){try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume();const seq=kind==='win'?[523,659,784,1046]:kind==='bad'?[440,392]:[523,659,784];seq.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.11;o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.017,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.19);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.2)})}catch{}}
function cancel(){epoch++;try{speechSynthesis.cancel()}catch{}}
async function say(t){cancel();const e=epoch;hint.textContent=t;try{if('speechSynthesis'in window)await new Promise(resolve=>{const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=.83;let done=false;const finish=()=>{if(!done){done=true;resolve()}};u.onend=finish;u.onerror=finish;try{speechSynthesis.speak(u)}catch{finish()}setTimeout(finish,Math.min(7500,2000+t.length*160))})}catch{}await wait(90);return e===epoch}
function build(){const n=round+2,z={view:'',detail:'',options:[],answer:'',prompt:'',steps:1,sequence:null,hide:false};
switch(mode){
case 0:z.view='🚌  🚏  '+'🧍'.repeat(n);z.detail='ひとりずつ ならんでいるよ';z.options=['1','2','3','4','5','6'];z.answer=String(n);z.prompt='バスていに おきゃくさんが '+n+'にん いるよ。 '+n+'の すうじを おしてね';break;
case 1:{const a=['▲','■','●'];z.answer=a[round];z.view='🚚  🏠  '+z.answer;z.detail='トラックの やねを つくろう';z.options=['●','▲','■','★'];z.prompt='トラックの やねは '+name(z.answer)+' だよ。 '+name(z.answer)+'を おしてね';break}
case 2:{const a=['🔴','🟡','🟢'];z.answer=a[round];z.view='🚦  ⚪  '+z.answer;z.detail='おなじ いろを ぬろう';z.options=['🔴','🟡','🟢','🔵'];z.prompt='しんごうを '+name(z.answer)+'に ぬろう。 '+name(z.answer)+'を おしてね';break}
case 3:{const a=['ひだり','まんなか','みぎ'];z.answer=a[round];z.view='🚁  '+a.map(x=>x===z.answer?'🚁':'☁️').join('  ');z.detail='ヘリコプターの ばしょを おぼえよう';z.options=a;z.hide=true;z.prompt='ヘリコプターは '+z.answer+'に いるよ。 よく みてね。 かくれたら '+z.answer+'を おしてね';break}
case 4:{const a=['🥁','👏','🔔'];z.answer=a[round];z.view='🚢  🎶  '+z.answer.repeat(n);z.detail='おとの まねを しよう';z.options=a;z.steps=n;z.prompt='ふねの おとは '+name(z.answer)+' だよ。 '+name(z.answer)+'を '+n+'かい おしてね';break}
case 5:{const a=['⬆️','➡️','⬇️'];z.answer=a[round];z.view='🚢  🐠  '+z.answer;z.detail='さかなの いる ほうへ すすもう';z.options=['⬆️','⬇️','⬅️','➡️'];z.prompt='せんすいかんを '+name(z.answer)+'へ すすめよう。 '+name(z.answer)+'の やじるしを おしてね';break}
case 6:{const a=['🔴','🟡','🟢','🔵'];z.sequence=a.slice(0,n);z.answer=z.sequence[0];z.view='🚆  '+z.sequence.join(' → ');z.detail='ひだりから しゃりょうを つなごう';z.options=a;z.prompt='でんしゃの さいしょの しゃりょうは '+name(z.answer)+'だよ。 '+name(z.answer)+'を おしてね';break}
case 7:{const a=['🚁','🚓','🚜'];z.answer=a[round];z.view='🔦  '+z.answer+'  🌙';z.detail='ライトの なかの のりものを さがそう';z.options=['🚁','🚓','🚜','🚚'];z.prompt='ライトの なかに '+name(z.answer)+'が いるよ。 '+name(z.answer)+'を おしてね';break}
case 8:{const a=['よわい','ふつう','つよい'];z.answer=a[round];z.view='🚁  💨  '+'〰️'.repeat(n);z.detail='かぜの つよさで ふきながしが かわるよ';z.options=a;z.prompt='かぜは '+z.answer+' よ。 '+z.answer+'の ボタンを おして ふきながしを うごかそう';break}
case 9:z.answer='つむ';z.options=['すくう','つむ','おろす'];z.view='🚜  ❄️  '+'⛄'.repeat(n);z.detail='ショベルカーで ゆきを はこぼう';z.steps=n;z.prompt='ショベルカーで ゆきを '+n+'こ つもう。 つむを おしてね';break;
}return z}
function paint(){stage.innerHTML='';const big=document.createElement('div');big.textContent=q.view;const detail=document.createElement('div');detail.className='detail';detail.textContent=q.detail;stage.append(big,detail);choices.innerHTML='';q.options.forEach(x=>{const b=document.createElement('button');b.className='choice';b.textContent=x;b.setAttribute('aria-label',name(x));b.onclick=()=>choose(x);choices.append(b)});progress.textContent=(round+1)+' / 3'+(q.steps>1||q.sequence?'  ⭐ '+step+' / '+(q.sequence?.length||q.steps):'')}
async function begin(){busy=true;step=0;q=build();paint();const e=epoch;await say(q.prompt);if(e!==epoch)return;if(q.hide)stage.firstChild.textContent='☁️  ❓  ❓  ❓';busy=false}
async function choose(x){if(busy)return;busy=true;if(x!==q.answer){audio('bad');await say('これは '+name(x)+' だね。 もういちど。 '+q.prompt);busy=false;return}audio('ok');stage.firstChild.textContent='⭐  '+game[3]+'  ⭐';
if(q.sequence&&step<q.sequence.length-1){step++;q.answer=q.sequence[step];q.prompt='つぎの しゃりょうは '+name(q.answer)+' だよ。 '+name(q.answer)+'を おしてね';paint();await say(q.prompt);busy=false;return}
if(q.steps>1&&step<q.steps-1){step++;stage.firstChild.textContent=game[3]+'  '+'⭐'.repeat(step)+'  '+ '📦'.repeat(q.steps-step);progress.textContent=(round+1)+' / 3  ⭐ '+step+' / '+q.steps;await say('いいね。 あと '+(q.steps-step)+'かい。 '+name(q.answer)+'を おしてね');busy=false;return}
await say('せいかい！ '+game[1]+' できたね');round++;if(round<3){await wait(150);await begin()}else finish()}
async function finish(){busy=true;audio('win');stage.textContent='🎉  🌟  🎊';progress.textContent='3 / 3';choices.innerHTML='';await say('ぜんぶ できたね！ すごいね！');for(const [text,fn] of [['🔁 もういちど',()=>{round=0;intro()}],['🏠 おうちへ',()=>location.href='../../index.html']]){const b=document.createElement('button');b.className='choice';b.textContent=text;b.onclick=fn;choices.append(b)}busy=false}
function intro(){cancel();busy=true;stage.textContent=game[3]+'  👆';hint.textContent=game[4]+'。 はじめるを おしてね';progress.textContent='あそびかた';choices.innerHTML='';const b=document.createElement('button');b.className='choice';b.textContent='▶️ はじめる';b.onclick=()=>{audio('ok');begin()};choices.append(b)}
$('repeat').onclick=()=>{if(!busy&&q)say(q.prompt)};$('again').onclick=()=>{round=0;intro()};addEventListener('pagehide',cancel);intro();
})();