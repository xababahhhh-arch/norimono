(()=>{'use strict';
const games=[
['count-ferry-seats','フェリーの せき','数','⛴️','のりたい どうぶつの かずだけ せきを えらぼう'],
['shape-bridge-fit','はしの かたち','形','🌉','あなの かたちに あう ぶひんを えらぼう'],
['color-tram-lamps','でんしゃの ランプ','色','🚋','いろの じゅんばんを まもって ランプを つけよう'],
['memory-airport-gates','ひこうじょうの ゲート','記憶','✈️','ひこうきの ゲートを おぼえて さがそう'],
['sound-train-rhythm','でんしゃの リズム','音','🚆','きこえた リズムと おなじ かずを たたこう'],
['direction-tugboat','タグボートを うごかそう','方向','🚤','やじるしで ふねを みなとへ うごかそう'],
['order-bus-trip','バスの おでかけ','順序','🚌','のる・ドアを しめる・しゅっぱつの じゅんばん'],
['observation-construction','こうじげんばで さがそう','観察','🏗️','たくさんの どうぐから おなじ ものを さがそう'],
['cause-balloon-burner','ききゅうの ひ','因果関係','🎈','ひを つよくしたり よわくして たかさを あわせよう'],
['operation-snow-truck','ゆきの みちを ひらこう','乗り物操作','🚛','ゆきかきトラックを すすませて ゆきを どかそう']
];const $=id=>document.getElementById(id),id=new URLSearchParams(location.search).get('id'),mode=Math.max(0,games.findIndex(g=>g[0]===id)),g=games[mode];let round=0,step=0,q=null,locked=true,revision=0,audio=null,spoken='',soundCount=0;const pick=a=>a[Math.floor(Math.random()*a.length)],shuffle=a=>a.slice().sort(()=>Math.random()-.5),wait=t=>new Promise(r=>setTimeout(r,t));
function voice(t){spoken=t;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=.82;speechSynthesis.speak(u)}catch{}}
function tone(freq=440){try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;o.type='triangle';o.frequency.value=freq;v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.07,t+.03);v.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(v).connect(audio.destination);o.start(t);o.stop(t+.23)}catch{}}
async function playRhythm(n,rev){for(let i=0;i<n;i++){if(rev!==revision)return;tone(330+i*45);await wait(430)}}
function scene(visual,instruction,options){$('visual').textContent=visual;$('instruction').textContent=instruction;$('feedback').textContent='';$('progress').textContent=(round+1)+' / 3';$('choices').replaceChildren();options.forEach(x=>{const b=document.createElement('button');b.className='choice';b.textContent=x;b.setAttribute('aria-label',x);b.onclick=()=>choose(x);$('choices').append(b)});voice(instruction);locked=false}
function startRound(){locked=true;step=0;const n=round+1;switch(mode){
case 0:{const count=pick([2,3,4,5]);q={answer:String(count),count};scene('⛴️  '+'🐶'.repeat(count)+'\n'+'□'.repeat(count),'どうぶつは '+count+'ひき。 せきは なんこ いるかな？',['2','3','4','5']);break}
case 1:{const shapes=['●','▲','■'];const target=shapes[round];q={answer:target};scene('🌉  '+target+' の あな','はしの あなと おなじ かたちを おしてね',shuffle(shapes));break}
case 2:{const colors=['🔴','🟡','🟢'];const target=colors[round];q={answer:target};scene('🚋  ⚪ ⚪ ⚪\n'+colors.slice(0,round+1).join(' → '),'つぎの ランプは '+['あか','きいろ','みどり'][round]+'。 おしてね',shuffle(colors));break}
case 3:{const gates=['Ａ','Ｂ','Ｃ'];const target=pick(gates);q={answer:target,hidden:false};scene('✈️  '+gates.map(x=>x===target?'✈️'+x:'□'+x).join('  '),'ひこうきが いる ゲートを おぼえてね', ['👀 おぼえた']);break}
case 4:{const count=n+1;q={answer:'🔔 たたく',count,hits:0};scene('🚆  🎵','でんしゃの おとを きいて、 おなじ かずだけ ベルを たたいてね',['🔔 たたく','🔊 もういちど']);const rev=revision;playRhythm(count,rev);break}
case 5:{const path=[['➡️','➡️'],['⬆️','➡️','➡️'],['➡️','⬇️','➡️']][round];q={answer:path[0],path,position:0};scene('🚤  '+ '・'.repeat(path.length)+'  ⚓','やじるしで ふねを みなとに すすめよう',shuffle(['⬅️','⬆️','➡️','⬇️']));break}
case 6:{const path=['🧍 のる','🚪 しめる','🚌 しゅっぱつ'];q={answer:path[0],path,position:0};scene('🚌  🧍  🚪','まずは バスに のろう。 じゅんばんに おしてね',shuffle(path));break}
case 7:{const icons=['🔨','🪣','🧱','🪜'];const target=icons[round];const field=shuffle([...icons,...icons]);q={answer:target};scene('🏗️  '+field.join('  '),'こうじげんばで '+{'🔨':'かなづち','🪣':'バケツ','🧱':'レンガ'}[target]+'を さがそう',shuffle(icons));break}
case 8:{const targets=[3,1,2],target=targets[round];q={answer:target>2?'🔥 つよく':target<2?'❄️ よわく':'✋ そのまま',height:2,target};scene('🎈\n'+ '☁️'.repeat(target),'ききゅうを くもの たかさに あわせよう',['🔥 つよく','❄️ よわく','✋ そのまま']);break}
case 9:{const snow=n+1;q={answer:'🚛 すすむ',snow,left:snow};scene('🚛  '+'❄️'.repeat(snow)+'  🏠','ゆきを どかして おうちまで すすもう',['🚛 すすむ','⏸️ とまる']);break}
}}
async function choose(x){if(locked)return;locked=true;const rev=revision;
if(mode===3&&!q.hidden){q.hidden=true;$('visual').textContent='✈️  ❔  ❔  ❔';$('instruction').textContent='ひこうきは どの ゲートに いたかな？';$('choices').replaceChildren();['Ａ','Ｂ','Ｃ'].forEach(x=>{const b=document.createElement('button');b.className='choice';b.textContent=x;b.onclick=()=>choose(x);$('choices').append(b)});voice($('instruction').textContent);locked=false;return}
if(mode===4){if(x==='🔊 もういちど'){playRhythm(q.count,rev);locked=false;return}q.hits++;tone(550);$('visual').textContent='🚆  '+'🔔'.repeat(q.hits);if(q.hits<q.count){locked=false;return}return correct(rev)}
if(mode===5||mode===6){if(x!==q.answer)return wrong(x);q.position++;$('visual').textContent=(mode===5?'🚤':'🚌')+'  '+'⭐'.repeat(q.position)+'  '+(mode===5?'⚓':'🏁');if(q.position<q.path.length){q.answer=q.path[q.position];$('instruction').textContent='つぎは '+q.answer+' を おしてね';voice($('instruction').textContent);locked=false;return}return correct(rev)}
if(mode===8){if(x!==q.answer)return wrong(x);q.height=q.target;$('visual').textContent='🎈\n'+ '☁️'.repeat(q.height)+'  ⭐';return correct(rev)}
if(mode===9){if(x!=='🚛 すすむ')return wrong(x);q.left--;$('visual').textContent='🚛  '+'❄️'.repeat(q.left)+'  '+'🛣️'.repeat(q.snow-q.left)+'  🏠';tone(390);if(q.left>0){locked=false;return}return correct(rev)}
if(x!==q.answer)return wrong(x);return correct(rev)}
function wrong(x){$('feedback').textContent='もういっかい！ 👆';voice('おしいね。 もういっかい えらんでね');locked=false}
async function correct(rev){tone(660);$('feedback').textContent='できたね！ ⭐';voice('せいかい！ できたね！');await wait(750);if(rev!==revision)return;round++;if(round<3)startRound();else finish()}
function finish(){locked=true;$('progress').textContent='3 / 3';$('visual').textContent='🎉 '+g[3]+' 🎉';$('instruction').textContent='ぜんぶ できたね！';voice('ぜんぶ できたね！');$('choices').replaceChildren();[['🔁 もういちど',intro],['🏠 おうちへ',()=>location.href='../../index.html']].forEach(([x,fn])=>{const b=document.createElement('button');b.className='choice';b.textContent=x;b.onclick=fn;$('choices').append(b)})}
function intro(){revision++;try{speechSynthesis.cancel()}catch{}round=0;locked=true;$('progress').textContent='あそびかた';$('visual').textContent=g[3]+'  👆';$('instruction').textContent=g[4];$('feedback').textContent='';$('choices').replaceChildren();const b=document.createElement('button');b.className='choice';b.textContent='▶️ はじめる';b.onclick=()=>{try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume()}catch{}startRound()};$('choices').append(b)}
$('title').textContent=g[1];document.title=g[1];$('repeat').onclick=()=>{if(mode===4&&q&&!locked)playRhythm(q.count,revision);else voice(spoken||g[4])};$('again').onclick=intro;addEventListener('pagehide',()=>{revision++;try{speechSynthesis.cancel()}catch{}});intro();
})();