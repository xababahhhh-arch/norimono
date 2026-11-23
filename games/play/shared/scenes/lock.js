import {art,target,village,colors,person,cloud} from '../scene-art.js';
export function render(state,round,transient){
 let svg=village;const done=state.done,vehicleClass=done?'leave':transient?'roll':'';
  const startLevel=320-round*20,level=startLevel-state.water*((startLevel-210)/state.count),entered=state.phase!=='enter';
  svg=`<rect width="360" height="400" fill="#d9eef1"/><path d="M0 110Q90 60 200 113T360 96V400H0Z" fill="#b9d5ac"/><path d="M0 ${startLevel}H110V400H0Z" fill="#6ebbcf"/><path data-water="chamber" d="M110 ${level}H280V400H110Z" fill="#69bbd4"/><path d="M280 210H360V400H280Z" fill="#6ebbcf"/><path d="M112 400V140M278 400V140" stroke="#cebf9c" stroke-width="13"/><path d="M116 ${level+12}h158m-155 22h153" stroke="#b7e7ed" stroke-width="3" stroke-dasharray="23 12"/>`;
  svg+=`<rect x="102" y="${entered?140:365}" width="17" height="140" rx="5" fill="#bc865c"/><rect data-gate="exit" x="269" y="${done?-75:200}" width="18" height="200" rx="5" fill="#bc865c"/>`;
  svg+=art('boat',entered?120:0,(entered?level:startLevel)-(entered?150:110)*141/320,entered?150:110,done?'leave':transient?'rise':'float');
  svg+=target('vehicle',null,2,220,108,112,'',state.phase==='enter','船を水門に入れる');
  svg+=target('pump',null,15,96,104,108,`<rect x="28" y="135" width="65" height="56" rx="12" fill="#e0a45c"/><path d="M61 143v-30m-21 0h43m-23 42v20m-10-10 10 10 10-10" stroke="#fff6d6" stroke-width="7" fill="none" stroke-linecap="round"/>`,state.phase==='pump','ポンプで水を上げる');
  svg+=target('gate',null,252,105,103,108,`<path d="M286 192v-72m-20 20 20-20 20 20" stroke="${state.phase==='gate'?'#2f7184':'#738d81'}" stroke-width="7" fill="none" stroke-linecap="round"/>`,state.phase==='gate','右の門を開ける');
  svg+=`<path d="M230 210h35" stroke="#f6d76f" stroke-width="5"/><text x="180" y="47" class="stage-caption">みずと いっしょに</text>`;
 return svg;
}
