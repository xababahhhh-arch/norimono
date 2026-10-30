import {art,target,village,colors,person,cloud} from '../scene-art.js';
export function render(state,round,transient){
 let svg=village;const done=state.done,vehicleClass=done?'leave':transient?'roll':'';
  svg+=`<path d="M20 168H344V228H20Z" fill="#efe2c8"/><path d="M42 108v63m-15-63h30v34H27Z" fill="#fff5db" stroke="#648d87" stroke-width="5"/>`;
  const open=state.phase==='board';svg+=`<g class="${vehicleClass}">${art('bus',21,237,318)}`;
  if(open)svg+=`<rect x="276" y="279" width="30" height="54" rx="5" fill="#334f60"/><path d="M281 284v43m20-43v43" stroke="#aedbe3" stroke-width="4"/>`;
  for(const i of state.items)svg+=`<g data-passenger="${i}"><circle cx="${64+i*51}" cy="276" r="8" fill="#f0c49e"/><path d="M${54+i*51} 293q10-20 20 0" fill="${colors[(i+state.seed)%6]}"/></g>`;
  svg+='</g>';
  for(let i=0;i<state.count;i++){const x=48+i*(264/Math.max(state.count-1,1));if(!state.items.includes(i))svg+=target('person',i,x-40,147,80,90,person(x,184,colors[(i+state.seed)%6]),open,'待っている人を乗せる');}
  svg+=target('vehicle',null,13,241,333,111,'',!open||state.items.length===state.count,open?'ドアを閉めて出発':'バスのドアを開ける');
  if(transient?.action==='person'){const x=48+transient.index*(264/Math.max(state.count-1,1));svg+=`<g class="board-walk" style="--dx:${286-x}px;--dy:110px">${person(x,184,colors[(transient.index+state.seed)%6])}</g>`;}
 return svg;
}
