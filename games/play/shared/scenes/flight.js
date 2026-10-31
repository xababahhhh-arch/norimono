import {art,target,village,colors,person,cloud} from '../scene-art.js?v=8eedbce0';
export function render(state,round,transient){
 let svg=village;const done=state.done,vehicleClass=done?'leave':transient?'roll':'';
  const sky=state.phase!=='runway';
  svg=`<rect width="360" height="400" fill="#acd9ec"/><circle cx="307" cy="42" r="25" fill="#f7db8c"/><path d="M0 340Q150 275 360 333V400H0Z" fill="#a6c79e"/>`;
  if(!sky){svg+=`<path d="M0 312H360V400H0Z" fill="#83949e"/><path d="M0 365H360" stroke="#fff5d7" stroke-width="6" stroke-dasharray="25 20"/>`;for(let i=0;i<3;i++)svg+=`<rect x="${47+i*110}" y="324" width="22" height="10" rx="5" fill="${i<state.speed?'#ffdb60':'#b4c7c9'}"/>`;svg+=art('plane',15+state.speed*17,210-state.speed*8,260,transient?'roll':'');svg+=target('vehicle',null,12,198,327,123,'',true,'飛行機を加速する');}
  else{const positions=[[70,95],[275,150],[75,240],[275,285]];for(let i=0;i<state.count;i++){const p=positions[(i+state.seed)%4];if(!state.items.includes(i))svg+=target('cloud',i,p[0]-45,p[1]-42,90,86,cloud(p[0],p[1],i),true,'雲をふわっと消す');}svg+=art('plane',70,178-state.items.length*13,220,done?'leave':transient?.action==='vehicle'?'jet':'float');}
 return svg;
}
