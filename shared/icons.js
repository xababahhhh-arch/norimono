/* Original supporting symbols and emoji-to-vector migration for legacy game views. */
(function(root){
 const vehicleMap={'🚗':'car','🚙':'car','🏎':'car','🚌':'bus','🚐':'bus','🚒':'fire','🚑':'ambulance','🚓':'police','🚔':'police','🚚':'truck','🚛':'truck','🚜':'tractor','🚂':'locomotive','🚆':'train','🚃':'train','🚄':'shinkansen','🚅':'shinkansen','🚝':'train','🚲':'bicycle','🚕':'taxi','✈':'plane','🛩':'plane','🚁':'helicopter','🚢':'boat','⛴':'boat','🚀':'rocket','🏍':'motorbike'};
 const symbols={
  '⭐':'<path d="m32 5 8 17 19 3-14 14 3 19-16-9-17 9 4-19L5 25l19-3Z" fill="#e9b24c"/>',
  '★':'<path d="m32 5 8 17 19 3-14 14 3 19-16-9-17 9 4-19L5 25l19-3Z" fill="#e9b24c"/>',
  '☆':'<path d="m32 5 8 17 19 3-14 14 3 19-16-9-17 9 4-19L5 25l19-3Z" fill="none" stroke="#b8bdad" stroke-width="3"/>',
  '✨':'<path d="m30 8 8 18 18 8-18 8-8 18-8-18-18-8 18-8Z" fill="#e9b24c"/><path d="m53 3 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#f3cf83"/>',
  '🎉':'<path d="m11 54 13-36 23 25Z" fill="#e0a267"/><path d="m24 18 23 25-7-22Z" fill="#cf856e"/><path d="M32 8v8m11-7-3 11m14 1-9 6M9 23l9 2M17 9l5 9" stroke="#78a9a1" stroke-width="5" stroke-linecap="round"/>',
  '🔊':'<path d="M7 25h13l16-14v42L20 39H7Z" fill="#537b8d"/><path d="M43 21q14 11 0 22m7-32q24 21 0 42" fill="none" stroke="#537b8d" stroke-width="4" stroke-linecap="round"/>',
  '🔉':'<path d="M7 25h13l16-14v42L20 39H7Z" fill="#537b8d"/><path d="M43 21q14 11 0 22" fill="none" stroke="#537b8d" stroke-width="4"/>',
  '🔈':'<path d="M7 25h13l16-14v42L20 39H7Z" fill="#537b8d"/>',
  '🏠':'<path d="M7 30 32 9l25 21v27H39V40H25v17H7Z" fill="#c48d6e"/><path d="M3 31 32 5l29 26" fill="none" stroke="#8d6d5a" stroke-width="6" stroke-linejoin="round"/>',
  '🔧':'<path d="m15 49 26-26-2-13 10-5-1 12 11-2-4 12-13 1-26 27Z" fill="#7d9aa2" stroke="#4d7181" stroke-width="3"/>',
  '🚦':'<rect x="20" y="4" width="24" height="48" rx="9" fill="#3d5663"/><circle cx="32" cy="15" r="6" fill="#db7d69"/><circle cx="32" cy="28" r="6" fill="#edc465"/><circle cx="32" cy="41" r="6" fill="#88b59b"/><path d="M32 52v11" stroke="#526c73" stroke-width="5"/>',
  '👆':'<path d="M20 50V30q0-7 7-4V10q0-8 7-5v23q9-6 17 2v18q0 9-11 11H29Z" fill="#edc28f" stroke="#b88c62" stroke-width="3" stroke-linejoin="round"/><path d="M34 30v11m8-9v10" stroke="#c79a70" stroke-width="2"/>',
  '👇':'<g transform="translate(0 64) scale(1 -1)"><path d="M20 50V30q0-7 7-4V10q0-8 7-5v23q9-6 17 2v18q0 9-11 11H29Z" fill="#edc28f" stroke="#b88c62" stroke-width="3"/></g>',
  '🔔':'<path d="M12 45h40l-6-12V23q0-18-14-18T18 23v10Z" fill="#dfb05c"/><path d="M7 46h50" stroke="#b48242" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="54" r="6" fill="#9a7854"/>',
  '💧':'<path d="M32 5Q4 35 13 48q19 23 38 0Q60 35 32 5Z" fill="#7dbccc"/><path d="M22 31q-10 14 1 18" fill="none" stroke="#c8e6e5" stroke-width="5" stroke-linecap="round"/>',
  '🥁':'<ellipse cx="32" cy="22" rx="25" ry="12" fill="#e6d5b2"/><path d="M7 22v27q25 17 50 0V22q-25 18-50 0" fill="#cf8b73"/><path d="m9 28 11 25 12-20 12 20 11-25" fill="none" stroke="#ecd2a6" stroke-width="3"/><path d="M8 9 35 25M56 9 30 25" stroke="#8a7860" stroke-width="4" stroke-linecap="round"/>',
  '🍎':'<path d="M31 21q-13-17-23 1-9 25 14 36h21q23-15 13-36-10-14-25-1" fill="#d67a5e"/><path d="M31 23V7" stroke="#8e7757" stroke-width="5"/><path d="M34 13q3-14 20-10-3 17-20 10" fill="#86a774"/>',
  '⚽':'<circle cx="32" cy="32" r="27" fill="#f3edda" stroke="#a8b7b2" stroke-width="2"/><path d="m32 19 13 9-5 16H24l-5-16Z" fill="#506a76"/><path d="m12 13 8 15m25 0 7-14M24 44l-9 12m25-12 9 12M32 5v14" stroke="#8c9e9b" stroke-width="3"/>',
  '🌷':'<path d="M32 61V31" stroke="#7b9d6d" stroke-width="5"/><path d="M31 48Q9 54 9 35q18-2 22 13m3 2q21 5 21-16-16-3-21 16" fill="#95b982"/><path d="M13 7 24 15 32 4l9 11 10-8v16q-3 20-19 19-17 1-19-19Z" fill="#d79191"/>',
  '🌳':'<path d="M26 60V32h12v28" fill="#a18060"/><path d="M9 33Q-1 14 19 13 26-6 42 10q25-1 17 22 0 18-24 16Q15 50 9 33Z" fill="#89ad82"/>',
  '🌱':'<path d="M32 59V21" stroke="#7b9d6d" stroke-width="5"/><path d="M30 34Q3 34 8 11q27 0 22 23m4-8Q38 3 60 10q-1 24-26 16" fill="#93b67f"/>',
  '🌙':'<path d="M47 6Q21 5 15 27q-6 26 26 32Q13 34 47 6Z" fill="#e6c479"/>',
  '☀':'<circle cx="32" cy="32" r="16" fill="#e4b359"/><path d="M32 2v8m0 44v8M2 32h8m44 0h8M11 11l6 6m30 30 6 6m0-42-6 6M17 47l-6 6" stroke="#dca75b" stroke-width="5" stroke-linecap="round"/>',
  '⏰':'<circle cx="32" cy="34" r="24" fill="#f3e8cb" stroke="#81a5ad" stroke-width="5"/><path d="M32 19v16l10 7M9 9l10-5m26 0 10 5" stroke="#557780" stroke-width="5" stroke-linecap="round"/>',
  '🚧':'<path d="M10 20h44v22H10Z" fill="#e8bd66"/><path d="m13 20 14 22m3-22 14 22m3-22 7 12M17 42v17m30-17v17" stroke="#7c7970" stroke-width="7"/>',
  '🪨':'<path d="m7 45 7-25 19-11 22 14 5 30-35 6Z" fill="#95a2a1"/><path d="m14 20 19 8 22-5M33 28l-8 31" fill="none" stroke="#b5bfba" stroke-width="4"/>',
  '🪵':'<path d="M8 22h39q20 5 9 23H8Z" fill="#aa8564"/><ellipse cx="12" cy="33" rx="10" ry="14" fill="#d5b18a"/><ellipse cx="12" cy="33" rx="5" ry="8" fill="none" stroke="#9d7956" stroke-width="2"/>',
  '🐦':'<path d="M8 39q-9-24 18-24 4-17 21-10 13 9 4 24L37 48 16 51Z" fill="#88b2b9"/><path d="M47 16h17l-13 8" fill="#dbb274"/><circle cx="43" cy="13" r="3" fill="#2e4b5a"/><path d="M18 32q14-17 22 1L25 44Z" fill="#bdd4ce"/>',
  '🐘':'<path d="M7 47V24q0-17 22-17h17q17 0 14 20v23h-9V31h-9v23H31V42H19v12H7Z" fill="#91a4a9"/><ellipse cx="32" cy="24" rx="14" ry="18" fill="#b5c4c4"/><circle cx="49" cy="17" r="3" fill="#365365"/>',
  '🧼':'<rect x="8" y="22" width="46" height="30" rx="12" fill="#d9acb4"/><circle cx="16" cy="14" r="9" fill="#e6eff0"/><circle cx="36" cy="10" r="6" fill="#e6eff0"/>',
  '💨':'<path d="M5 20h34q17-12 20 1 0 11-25 11M5 40h27q19 0 16 12" fill="none" stroke="#b2c6c5" stroke-width="5" stroke-linecap="round"/>',
  '➡':'<path d="M7 24h28V10l24 22-24 22V40H7Z" fill="#8ba79e"/>',
  '⬆':'<path d="M24 57V29H10L32 5l22 24H40v28Z" fill="#8ba79e"/>',
  '⬇':'<path d="M24 7v28H10l22 24 22-24H40V7Z" fill="#8ba79e"/>',
  '◀':'<path d="M49 8 14 32l35 24Z" fill="currentColor"/>','▶':'<path d="M15 8 50 32 15 56Z" fill="currentColor"/>'
 };
 Object.assign(symbols,{
  '?':'<circle cx="32" cy="32" r="27" fill="#e3e6d3"/><path d="M23 22q2-13 15-8 14 6 1 17l-7 5v6" fill="none" stroke="#597b85" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="51" r="3" fill="#597b85"/>',
  '●':'<circle cx="20" cy="24" r="12" fill="#83aaa0"/><circle cx="45" cy="24" r="12" fill="#83aaa0"/><circle cx="32" cy="47" r="12" fill="#d3a479"/>',
  '●●':'<circle cx="17" cy="32" r="13" fill="#6b969d"/><circle cx="47" cy="32" r="13" fill="#6b969d"/>',
  '🔷':'<path d="m16 16 12 16-12 16L4 32Zm32 0 12 16-12 16-12-16Z" fill="#8295b7"/>',
  '🎵':'<path d="M25 43V12l25-5v32" fill="none" stroke="#8b93b3" stroke-width="6"/><ellipse cx="18" cy="47" rx="11" ry="8" fill="#8b93b3"/><ellipse cx="43" cy="42" rx="11" ry="8" fill="#8b93b3"/>',
  '🛣':'<path d="M25 3h14l23 58H2Z" fill="#839b9e"/><path d="M32 9v10m0 9v11m0 10v12" stroke="#f1e6c4" stroke-width="4"/>',
  '👂':'<path d="M18 28Q14 6 33 7q23 0 17 23-2 8-11 14-1 14-12 13-9-1-9-10m7-17q-5-14 7-15 14 0 8 15l-7 7" fill="none" stroke="#d6ab85" stroke-width="7" stroke-linecap="round"/>',
  '◼':'<path d="M7 36h9l9-17h20l9 17h5v16H7Z" fill="#617582"/><circle cx="18" cy="51" r="7" fill="#344f5d"/><circle cx="49" cy="51" r="7" fill="#344f5d"/>',
  '↕':'<path d="m17 22 15-16 15 16H37v20h10L32 58 17 42h10V22Z" fill="#83a3ad"/>',
  '↔':'<path d="M22 17 6 32l16 15V37h20v10l16-15-16-15v10H22Z" fill="#83a3ad"/>',
  '🌼':'<g fill="#e9c67b"><ellipse cx="32" cy="17" rx="10" ry="15"/><ellipse cx="32" cy="47" rx="10" ry="15"/><ellipse cx="17" cy="32" rx="15" ry="10"/><ellipse cx="47" cy="32" rx="15" ry="10"/></g><circle cx="32" cy="32" r="11" fill="#bb9461"/>',
  '🙂':'<circle cx="32" cy="32" r="27" fill="#e9cc8d"/><circle cx="22" cy="26" r="3" fill="#6a6a59"/><circle cx="42" cy="26" r="3" fill="#6a6a59"/><path d="M19 39q13 12 26 0" fill="none" stroke="#8d755a" stroke-width="4" stroke-linecap="round"/>'
 });
 symbols['🎶']=symbols['🎵'];symbols['🧩']=symbols['🔷'];
 symbols['🥚']='<path d="M13 41Q9 18 32 4q23 14 19 37-2 19-19 19T13 41Z" fill="#ece2ca" stroke="#c9bda3" stroke-width="2"/>';
 symbols['🐣']='<path d="M11 39 20 33l12 8 13-8 9 8-5 18H16Z" fill="#e9e1ca"/><circle cx="32" cy="24" r="17" fill="#e4c57b"/><circle cx="26" cy="21" r="2" fill="#62715f"/><circle cx="38" cy="21" r="2" fill="#62715f"/><path d="m28 27 4-4 5 4-5 5Z" fill="#c99259"/>';
 symbols['☁']='<path d="M10 43Q-1 26 15 23q3-22 24-15 14 2 15 18 17 8 5 20H14Z" fill="#a8bec3"/>';
 symbols['🌧']='<path d="M10 32Q0 17 17 15 24-2 40 10q26-1 20 22Z" fill="#a0b9bf"/><path d="m16 42-4 9m21-9-4 9m21-9-4 9" stroke="#6a9cab" stroke-width="5" stroke-linecap="round"/>';
 symbols['🌈']='<path d="M5 54q0-77 54 0" fill="none" stroke="#d99980" stroke-width="7"/><path d="M12 54q0-58 40 0" fill="none" stroke="#e5c67d" stroke-width="7"/><path d="M19 54q0-38 26 0" fill="none" stroke="#90b398" stroke-width="7"/><path d="M26 54q0-17 12 0" fill="none" stroke="#82a7b5" stroke-width="7"/>';
 const keys=[...Object.keys(vehicleMap),...Object.keys(symbols)].sort((a,b)=>b.length-a.length);
 const pattern=new RegExp(keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
 function svg(key){key=key.replace(/[\ufe0e\ufe0f]/g,'');if(vehicleMap[key])return root.NoriVehicles.artwork(vehicleMap[key]).replace('<svg ','<svg class="nori-glyph nori-vehicle-glyph" ');return `<svg class="nori-glyph" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-nori-icon="${key}">${symbols[key]||symbols['⭐']}</svg>`;}
 function apply(container){
  if(!container)return;
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){const parent=node.parentElement;if(!parent||parent.closest('script,style,textarea,svg,[data-nori-icon],[data-nori-vehicle],.nori-glyph'))continue;
   pattern.lastIndex=0;if(!pattern.test(node.nodeValue))continue;pattern.lastIndex=0;
   const fragment=document.createDocumentFragment();let at=0;
   for(const m of node.nodeValue.matchAll(pattern)){fragment.append(node.nodeValue.slice(at,m.index).replace(/[\ufe0e\ufe0f]/g,''));const holder=document.createElement('span');holder.innerHTML=svg(m[0]);fragment.append(holder.firstElementChild);at=m.index+m[0].length;}
   fragment.append(node.nodeValue.slice(at).replace(/[\ufe0e\ufe0f]/g,''));node.replaceWith(fragment);
  }
 }
 function start(){const body=document.body;if(!body)return;apply(body);new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')apply(record.target.parentElement);else for(const node of record.addedNodes){if(node.nodeType===1)apply(node);else if(node.nodeType===3&&node.parentElement)apply(node.parentElement);}}}).observe(body,{childList:true,subtree:true,characterData:true});}
 root.NoriIcons={svg,apply,vehicleMap};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(globalThis);
