import {art,target,village,colors,person,cloud} from '../scene-art.js';
export function render(state,round,transient){
 let svg=village;const done=state.done,vehicleClass=done?'compact-leave':transient?'roll':'';
  svg+=art('garbage',76,185,245,vehicleClass);
  const rowY=307;for(let i=0;i<state.count;i++){const x=8+i*(344/state.count),w=344/state.count-6;if(!state.items.includes(i))svg+=target('bin',i,x,rowY,w,85,`<g transform="translate(${x+w/2} 322)" fill="${colors[(i+state.seed)%6]}"><path d="M-23 3h46l-4 48h-38z"/><rect x="-28" y="-4" width="56" height="9" rx="4"/><path d="M-9-4v-7H9v7" fill="none" stroke="#345362" stroke-width="4"/><path d="M-8 14v26m16-26v26" stroke="#fff8" stroke-width="4"/></g>`,true,'ごみ箱を集める');}
  svg+=target('vehicle',null,68,177,260,128,'',state.phase==='compact','ごみを小さくして出発');
  if(state.phase==='compact')svg+=`<g class="rise"><path d="M117 173l14 15 14-15m12 0 14 15 14-15" stroke="#f4d36d" fill="none" stroke-width="7"/></g>`;
  if(transient?.action==='bin'){const x=35+transient.index*(344/state.count);svg+=`<g class="cargo-flight" style="--dx:${180-x}px;--dy:-130px"><rect x="${x}" y="325" width="28" height="33" rx="6" fill="${colors[(transient.index+state.seed)%6]}"/></g>`;}
  if(done)svg+=`<text x="180" y="115" class="stage-caption">ぎゅっ！ すっきり！</text>`;
 return svg;
}
