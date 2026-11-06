import {art,target,village,colors,person,cloud} from '../scene-art.js';
export function render(state,round,transient){
 let svg=village;const done=state.done,vehicleClass=done?'leave':transient?'roll':'';
  svg=`<rect width="360" height="400" fill="#dceef0"/><circle cx="300" cy="52" r="25" fill="#f4d773"/><path d="M0 205Q60 150 145 210T360 195V400H0Z" fill="#b8cfad"/><path d="M0 286H360V400H0Z" fill="#c6ae89"/><path d="M5 293H355" stroke="#edd7a9" stroke-width="16"/>`;
  const depth=80*(1-state.loads/state.count);
  svg+=`<defs><clipPath id="pit"><path d="M191 293h154l-20 85H212Z"/></clipPath></defs><path d="M191 293h154l-20 85H212Z" fill="#70564b"/><rect data-fill="pit" x="191" y="${293+depth}" width="154" height="${85-depth}" fill="#dca963" clip-path="url(#pit)"/>`;
  svg+=art('excavator',0,164,215,transient?.action==='sand'?'roll':'');
  svg+=target('sand',null,5,296,128,98,`<path d="M15 376q12-80 56-49 26-26 52 49Z" fill="#e9ba70"/><path d="M46 355l12-6m20 14 13-6" stroke="#bf8f52" stroke-width="4"/>`,state.phase==='scoop','砂をすくう');
  svg+=target('hole',null,187,283,165,110,'',state.phase==='pour','穴に砂を入れる');
  const raised=state.phase==='pour',arm=raised?'M121 225 207 190 260 278':'M121 225 55 215 70 320',oldArm=raised?'M121 225 55 215 70 320':'M121 225 207 190 260 278',bucket=raised?'260 278':'70 320',oldBucket=raised?'70 320':'260 278';
  svg+=`<g pointer-events="none"><path d="${arm}" fill="none" stroke="#e3b64c" stroke-width="17" stroke-linecap="round" stroke-linejoin="round">${transient?`<animate attributeName="d" from="${oldArm}" to="${arm}" dur=".6s"/>`:''}</path><g transform="translate(${bucket})">${transient?`<animateTransform attributeName="transform" type="translate" from="${oldBucket}" to="${bucket}" dur=".6s"/>`:''}<path d="M-19-3h39l-5 26h-32Z" fill="#c9973f" stroke="#826b48" stroke-width="3"/>${raised?'<path d="M-14 1q7-22 16-9 9-9 14 9Z" fill="#e9ba70"/>':''}</g></g>`;
  if(transient?.action==='hole')svg+=`<g class="dig-pour" fill="#edbd71"><circle cx="260" cy="278" r="13"/><circle cx="275" cy="273" r="8"/></g>`;
  if(done)svg+=`<path d="M185 293H353" stroke="#d3b185" stroke-width="14"/>${art('car',-10,225,150,'leave')}`;
 return svg;
}
