(()=>{'use strict';
const games=[
['seat-bus','バスの おきゃくさん','かず','🚌','バスに おきゃくさんを のせよう'],
['dock-turn','ふねを くるり','かたち','⛴️','ふねの むきを あわせよう'],
['paint-train','でんしゃを ぬろう','いろ','🚆','でんしゃの いろを つくろう'],
['hide-taxi','タクシー かくれた','きおく','🚕','かくれた くるまを おぼえよう'],
['beat-heli','ヘリの はね','おと','🚁','はねの おとを まねしよう'],
['lift-balloon','ききゅうを あげよう','ほうこう','🎈','ききゅうの たかさを あわせよう'],
['cargo-order','にもつを ならべよう','じゅんばん','🚚','にもつを じゅんばんに つもう'],
['spot-crossing','ふみきりを みよう','かんさつ','🚆','あぶない ところを みつけよう'],
['windmill-truck','かぜぐるまを まわそう','いんが','🚚','かぜの つよさを ためそう'],
['train-lever','でんしゃの レバー','そうさ','🚆','レバーで でんしゃを はしらせよう']
];
const params=new URLSearchParams(location.search),game=games.find(g=>g[0]===params.get('id'))||games[0],mode=games.indexOf(game),$=id=>document.getElementById(id),stage=$('stage'),choices=$('choices'),hint=$('hint'),progress=$('progress');
$('title').textContent=game[1];document.title=game[1];let round=0,step=0,busy=true,epoch=0,question=null,ctx=null;
const random=a=>a[Math.floor(Math.random()*a.length)],wait=t=>new Promise(r=>setTimeout(r,t)),names={'⬅️':'ひだり','➡️':'みぎ','⬆️':'うえ','⬇️':'した','🔴':'あか','🔵':'あお','🟡':'きいろ','🟢':'みどり','📦':'はこ','🧸':'ぬいぐるみ','⚽':'ボール','🪵':'き','🐱':'ねこ','🐶':'いぬ','🐰':'うさぎ','🚕':'タクシー','🚗':'くるま','🚙':'じどうしゃ','🚓':'パトカー','🚒':'しょうぼうしゃ','🚑':'きゅうきゅうしゃ'};
const speakName=x=>names[x]||String(x);
function unlock(){try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume()}catch{}}
function notes(fs){unlock();if(!ctx)return;fs.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.09;o.type='triangle';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.8,t+.16);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.025,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.21)})}
function cancel(){epoch++;try{speechSynthesis.cancel()}catch{}}
async function say(t){const e=epoch;hint.textContent=t;try{if('speechSynthesis'in window)await new Promise(resolve=>{const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=.82;let done=false;const finish=()=>{if(!done){done=true;resolve()}};u.onend=finish;u.onerror=finish;speechSynthesis.cancel();speechSynthesis.speak(u);setTimeout(finish,Math.min(6500,1700+t.length*170))})}catch{}await wait(80);return epoch===e}
function btn(label,value){const b=document.createElement('button');b.className='choice';b.textContent=label;b.setAttribute('aria-label',speakName(value));b.onclick=()=>choose(value);choices.append(b)}
function questionFor(){const n=round+2,q={view:'',detail:'',prompt:'',answer:'',options:[],need:n};let a;
switch(mode){
case 0:q.view='🚌  '+ '🧍'.repeat(step);q.detail='あいている せきは '+n+'こ';q.answer='のせる';q.options=['のせる','おろす'];q.prompt='バスに おきゃくさんを '+n+'にん のせよう。 のせるを おしてね';break;
case 1:a=['⬆️','➡️','⬅️'][round];q.view='⛴️  →  '+a;q.detail='ふねの むきを かえよう';q.answer=a;q.options=['⬆️','➡️','⬅️','⬇️'];q.prompt='ふねを '+speakName(a)+'に むけよう。 '+speakName(a)+'の やじるしを おしてね';break;
case 2:a=[['🔴','🟡','🟠'],['🔵','🟡','🟢'],['🔴','🔵','🟣']][round];q.view='🚆  🎨  '+a[2];q.detail='2つの いろを まぜよう';q.answer=a.slice(0,2).join('');q.options=['🔴','🔵','🟡'];q.prompt='でんしゃを ぬろう。 '+speakName(a[0])+'と '+speakName(a[1])+'を じゅんばんに おしてね';q.colors=a;break;
case 3:a=['🐱','🐶','🐰'][round];q.view='🚕  '+a+'  🚕';q.detail='かくれる どうぶつを おぼえよう';q.answer=a;q.options=['🐱','🐶','🐰'];q.prompt='タクシーの そばに '+speakName(a)+'が いるよ。 おぼえてから '+speakName(a)+'を おしてね';q.hide=true;break;
case 4:q.view='🚁  '+ '🎵'.repeat(n);q.detail='はねを '+n+'かい たたこう';q.answer='たたく';q.options=['たたく','できた'];q.prompt='ヘリコプターの はねの おとを '+n+'かい まねしよう。 たたくを おしてね';break;
case 5:q.view='🎈  '+ '☁️'.repeat(n);q.detail='くもの ところまで あげよう';q.answer='あげる';q.options=['あげる','さげる'];q.prompt='ききゅうを くもの ところまで '+n+'かい あげよう。 あげるを おしてね';break;
case 6:a=[['📦','🧸'],['⚽','📦','🧸'],['🧸','⚽','🪵','📦']][round];q.view='🚚  '+a.join(' → ');q.detail='ひだりから じゅんばんに つもう';q.sequence=a;q.answer=a[0];q.options=['📦','🧸','⚽','🪵'];q.prompt='トラックに じゅんばんに つもう。 さいしょは '+speakName(a[0])+' だよ。 '+speakName(a[0])+'を おしてね';break;
case 7:a=[['🚧','🚦','🧍'],['🚧','🚗','🐱'],['🚧','🚆','🚲']][round];q.view='🚆  🚧  '+a.slice(1).join(' ');q.detail='ふみきりの まえを みよう';q.answer=a[1];q.options=a.slice(1).concat('🌳','🏠');q.prompt='ふみきりの まえに '+speakName(a[1])+'が いるよ。 '+speakName(a[1])+'を おしてね';break;
case 8:q.view='🚚  🌬️  '+ '🍃'.repeat(step);q.detail='かぜぐるまを '+n+'かい まわそう';q.answer='ふく';q.options=['ふく','とめる'];q.prompt='トラックの かぜぐるまを '+n+'かい まわそう。 ふくを おしてね';break;
case 9:q.view='🚆  '+ '🛤️'.repeat(n);q.detail='レバーを '+n+'かい すすめよう';q.answer='すすめる';q.options=['すすめる','とまる'];q.prompt='でんしゃを '+n+'こ さきの えきへ はしらせよう。 すすめるを おしてね';break;
}return q}
function render(){question=questionFor();stage.innerHTML='';const big=document.createElement('div');big.textContent=question.view;const detail=document.createElement('div');detail.className='detail';detail.textContent=question.detail;stage.append(big,detail);choices.innerHTML='';question.options.forEach(x=>btn(x,x));progress.textContent=(round+1)+' / 3　'+step+' / '+(question.sequence?.length||question.need);return question}
async function begin(){cancel();busy=true;step=0;render();const e=epoch;await say(question.prompt);if(e!==epoch)return;if(question.hide){stage.firstChild.textContent='🚕  ❓  🚕'}busy=false}
async function choose(x){if(busy)return;busy=true;unlock();const q=question,correct=mode===2?q.colors.includes(x)&&x!==q.colors[2]&&!q.picked?.includes(x):x===q.answer;
if(!correct){notes([350,290]);await say('これは '+speakName(x)+' だね。 '+q.prompt);busy=false;return}
notes([523,659]);if(mode===2){q.picked??=[];q.picked.push(x);if(q.picked.length<2){q.prompt='つぎは '+speakName(q.colors.find(c=>!q.picked.includes(c)&&c!==q.colors[2]))+'を おしてね';await say(q.prompt);busy=false;return}}
else if(q.sequence){step++;if(step<q.sequence.length){q.answer=q.sequence[step];q.prompt='つぎは '+speakName(q.answer)+' だよ。 '+speakName(q.answer)+'を おしてね';progress.textContent=(round+1)+' / 3　'+step+' / '+q.sequence.length;await say(q.prompt);busy=false;return}}
else if([0,4,5,8,9].includes(mode)){step++;stage.firstChild.textContent=game[3]+'  '+ '⭐'.repeat(step);progress.textContent=(round+1)+' / 3　'+step+' / '+q.need;if(step<q.need){await say('いいね。 あと '+(q.need-step)+'かい。 '+speakName(x)+'を おしてね');busy=false;return}}
stage.firstChild.textContent='🌟  '+game[3]+'  🌟';await say('せいかい！ よく できたね');round++;if(round<3){await wait(200);await begin()}else finish()}
async function finish(){cancel();busy=true;notes([523,659,784,1046]);stage.textContent='🎉 ⭐ 🎊';choices.innerHTML='';progress.textContent='3 / 3';await say('ぜんぶ できたね！ すごいね！');btn('🔁 もういちど','again');btn('🏠 おうちへ','home');busy=false}
const oldChoose=choose;choose=async x=>{if(x==='again'){round=0;intro();return}if(x==='home'){location.href='../../index.html';return}return oldChoose(x)};
function intro(){cancel();busy=true;round=0;step=0;stage.textContent=game[3]+' 👆';hint.textContent=game[4]+'。 はじめるを おしてね';progress.textContent='あそびかた';choices.innerHTML='';const b=document.createElement('button');b.className='choice';b.textContent='▶️ はじめる';b.onclick=()=>{unlock();begin()};choices.append(b)}
$('repeat').onclick=()=>{unlock();if(question&&!busy)say(question.prompt)};$('again').onclick=intro;addEventListener('pagehide',cancel);intro();
})();