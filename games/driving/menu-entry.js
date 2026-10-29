// Additive registration works with both the original and expanded learning menus.
import {trainFront} from './train/art.js';
const list=document.getElementById('list');
if(list&&!document.getElementById('driving-series')){
 const section=document.createElement('section');section.id='driving-series';section.innerHTML=`<h2>なりきり・運転シリーズ</h2><a class="series-card" href="games/driving/index.html"><span class="series-art">${trainFront}</span><span><strong>でんしゃを うんてん！</strong><small>じぶんで うごかす。うんてんしに なろう。</small></span><span class="series-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 3 14 9-14 9Z"/></svg></span></a>`;
 const learning=document.createElement('h2');learning.id='learning-title';learning.textContent='知育シリーズ';list.before(section,learning);list.classList.add('learning-list');list.parentElement.classList.add('series-menu');
 const foot=document.querySelector('.foot');if(foot)foot.textContent='あそびたい ゲームを えらんでね';
}
