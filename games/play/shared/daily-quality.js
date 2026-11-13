/* Shared contract for daily games: stable numeric order, named prompts, cancellable narration. */
(()=>{'use strict';
const names={'🌸':'さくら','🌳':'き','🏠':'おうち','🏡':'にわのある おうち','🌉':'はし','🏫':'がっこう','🏥':'びょういん','🏪':'おみせ','●':'まる','▲':'さんかく','■':'しかく','★':'ほし','🔴':'あか','🟡':'きいろ','🟢':'みどり','🔵':'あお','🟦':'あお','🟨':'きいろ','🟩':'みどり','🟥':'あか','⬆️':'うえ','⬇️':'した','⬅️':'ひだり','➡️':'みぎ','↰':'ひだり','↑':'まっすぐ','↱':'みぎ','🛑':'とまる','▶️':'すすむ','🐢':'ゆっくり','↩️':'もどる','🚗':'くるま','🚙':'くるま','🚕':'タクシー','🚜':'トラクター','🚒':'しょうぼうしゃ','🚑':'きゅうきゅうしゃ','🚓':'パトカー','🚌':'バス','🚚':'トラック','🚆':'でんしゃ','🚁':'ヘリコプター','✈️':'ひこうき','🚀':'ロケット','🛩️':'ちいさな ひこうき','🛸':'そらの ふね','⛵':'ふね','🚤':'ふね','🛶':'ふね','タン':'あかの たいこ','トン':'あおの たいこ','ポン':'きいろの たいこ'};
const ids={'🚗':'car','🚙':'car','🚕':'taxi','🚜':'tractor','🚒':'fire','🚑':'ambulance','🚓':'police','🚌':'bus','🚚':'truck','🚆':'train','🚁':'helicopter','✈️':'plane','🚀':'rocket','🛩️':'plane','🛸':'rocket','⛵':'boat','🚤':'boat','🛶':'boat'};
const colors={'🔴':'#e87968','🟡':'#efc650','🟢':'#75b99b','🔵':'#649fcf','🟦':'#649fcf','🟨':'#efc650','🟩':'#75b99b','🟥':'#e87968'};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg=(body,name)=>`<svg viewBox="0 0 100 100" role="img" aria-label="${escape(name)}">${body}</svg>`;
function icon(t){if(ids[t])return NoriVehicles.artwork(ids[t]);if(colors[t])return svg(`<${t.includes('🟦')||t.includes('🟨')||t.includes('🟩')||t.includes('🟥')?'rect x="15" y="15" width="70" height="70" rx="12"':'circle cx="50" cy="50" r="35"'} fill="${colors[t]}"/>`,names[t]);
if(['タン','トン','ポン'].includes(t))return svg(`<path d="M20 40h60v40q-30 15-60 0Z" fill="${{'タン':'#e87968','トン':'#649fcf','ポン':'#efc650'}[t]}"/><ellipse cx="50" cy="40" rx="30" ry="12" fill="#f5dfac"/>`,names[t]);
if(['🌳','🌸'].includes(t))return svg(`<path d="M45 90V40h12v50" fill="#a88055"/><circle cx="50" cy="36" r="29" fill="${t==='🌳'?'#75ae87':'#eaa6b5'}"/>`,names[t]);
if(['🏠','🏡','🏫','🏥','🏪'].includes(t))return svg('<path d="M12 44 50 13 88 44Z" fill="#d58b70"/><path d="M22 44h56v46H22Z" fill="#ecd4a4"/><path d="M42 90V64h17v26M28 48h15v12M60 48h13v12" fill="#6697ad"/>'+({'🏠':'','🏡':'<circle cx="85" cy="60" r="12" fill="#72ab87"/>','🏫':'<circle cx="50" cy="38" r="13" fill="white"/><path d="M50 28v10l8 5" fill="none" stroke="#41647a" stroke-width="3"/>','🏥':'<path d="M50 35c-12-17-30 4 0 24 30-20 12-41 0-24" fill="#df796b"/>','🏪':'<path d="M15 39h70v18H15Z" fill="#75a5b4"/><path d="M25 39v18m20-18v18m20-18v18" stroke="#f8edcb" stroke-width="10"/>'}[t]),names[t]);
if(t==='🌉')return svg('<path d="M5 80q20-12 40 0t50 0M10 55h80M20 55V25m60 30V25M20 25q30 40 60 0" fill="none" stroke="#6995ab" stroke-width="8"/>','はし');
return `<span class="symbol" aria-label="${escape(names[t]||t)}">${escape(t)}</span>`;}
const tokens=Object.keys({...names,...ids}).sort((a,b)=>b.length-a.length);const pattern=new RegExp(tokens.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
function markup(text){let out='',end=0;for(const m of String(text).matchAll(pattern)){out+=escape(String(text).slice(end,m.index))+icon(m[0]);end=m.index+m[0].length;}return out+escape(String(text).slice(end));}
function spoken(x){return names[x]||String(x)}
function ordered(values){const a=[...new Set(values)];return a.every(x=>/^\d+$/.test(String(x)))?a.sort((x,y)=>Number(x)-Number(y)):a;}
let revision=0,active=null;
function cancel(){revision++;active?.finish(false);active=null;try{speechSynthesis.cancel()}catch{}}
async function speak(text){cancel();const rev=revision;document.querySelector('#hint').textContent=text;document.body.dataset.speaking='true';const normalized=text.replace(pattern,t=>spoken(t));
 const result=await new Promise(resolve=>{let timer,done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timer);if(active?.finish===finish)active=null;resolve(ok)};active={finish};if(!('speechSynthesis'in window)){finish(true);return;}const u=new SpeechSynthesisUtterance(normalized);u.lang='ja-JP';u.rate=.95;const voices=speechSynthesis.getVoices?.()||[];u.voice=voices.find(v=>/^ja/.test(v.lang))||null;u.onend=()=>finish(true);u.onerror=()=>finish(true);timer=setTimeout(()=>{try{speechSynthesis.cancel()}catch{}finish(true)},Math.max(6000,normalized.length*240));try{speechSynthesis.speak(u)}catch{finish(true)}});
 if(rev!==revision)return false;await new Promise(r=>setTimeout(r,180));if(rev!==revision)return false;document.body.dataset.speaking='false';return result;}
function state(phase,round,step=0){document.body.dataset.phase=phase;document.body.dataset.round=round;document.body.dataset.step=step;document.querySelector('#choices').setAttribute('aria-busy',String(phase==='speaking'));}
window.DailyQuality={spoken,ordered,markup,icon,speak,cancel,state};addEventListener('pagehide',cancel);
})();
