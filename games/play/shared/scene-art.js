// Original scene primitives and SVG target geometry.
export const colors=['#e98465','#69a9bc','#e9ba52','#a58cc4','#82b57d','#e895af'];
export function art(id,x,y,width,cls=''){
  let source=NoriVehicles.artwork(id);
  if(id==='excavator')source=source.replace(/<path d="M180 88[\s\S]*<\/svg>$/,'</svg>');
  // Flight game uses a dedicated, child-readable side-view airliner.
  // Nose points right. One visible main wing sweeps back toward the tail;
  // the vertical fin and horizontal tailplane are clearly separated.
  if(id==='plane')source=`<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#35515c" stroke-opacity=".22" stroke-width="2" stroke-linejoin="round">
      <path d="M20 91Q22 77 47 73L226 61Q253 59 277 69L300 79Q311 84 307 91Q303 98 285 102L244 108L52 119Q27 120 20 108Q16 101 20 91Z" fill="#f7f5e8"/>
      <path d="M86 75L48 39H28L54 79Z" fill="#7da3bc"/>
      <path d="M67 75L48 55H38L51 79Z" fill="#9ab7c9"/>
      <path d="M157 105L111 145H75L126 107Z" fill="#7da3bc"/>
      <path d="M142 106L122 126H105L128 107Z" fill="#9ab7c9"/>
      <path d="M57 114L39 134H22L43 112Z" fill="#7da3bc"/>
    </g>
    <path d="M52 101L257 90" stroke="#dc986d" stroke-width="4" stroke-linecap="round"/>
    <g fill="#42778a">
      <circle cx="105" cy="88" r="4"/><circle cx="124" cy="87" r="4"/><circle cx="143" cy="86" r="4"/><circle cx="162" cy="85" r="4"/><circle cx="181" cy="84" r="4"/><circle cx="200" cy="83" r="4"/>
      <path d="M263 72Q284 73 298 84L269 87Z"/>
    </g>
    <g fill="#a8bcc5" stroke="#607984" stroke-width="2">
      <path d="M120 110Q133 108 142 113L151 121Q153 126 145 128H124Q117 126 118 120Z"/>
      <path d="M188 106Q200 104 209 109L217 116Q220 121 212 123H192Q185 121 186 115Z"/>
    </g>
    <g stroke="#607984" stroke-width="4" stroke-linecap="round">
      <path d="M95 116v13M220 108v14"/><path d="M86 130h18M211 123h18"/>
    </g>
  </svg>`;
  return `<g class="next-art ${cls}"><svg x="${x}" y="${y}" width="${width}" height="${width/2}" viewBox="0 0 320 160">${source.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</svg></g>`;
}
export function target(action,index,x,y,w,h,body,cue=false,label=''){return `<g role="button" tabindex="0" aria-label="${label}" data-action="${action}" data-index="${index??''}" data-cue="${cue}"><rect class="${cue?'cue':'hit'}" x="${x}" y="${y}" width="${w}" height="${h}" rx="20"/>${body}<rect class="hit" x="${x}" y="${y}" width="${w}" height="${h}" rx="20"/></g>`;}
export function trees(){return `<g fill="#86b998"><path d="M10 200V155h9v45M337 198v-58h9v58"/><circle cx="14" cy="142" r="28"/><circle cx="344" cy="128" r="37"/></g>`;}
export const village=`<rect width="360" height="400" fill="#d5edf1"/><circle cx="305" cy="42" r="23" fill="#f6d877"/><path d="M0 169Q90 125 190 177T360 164V400H0Z" fill="#a8cfab"/><g fill="#f4dec0" stroke="#bd9e7a" stroke-width="3"><path d="M30 95h77v69H30zM236 85h87v79h-87z"/></g><g fill="#86b9c7"><path d="M44 109h18v22H44zM76 109h18v22H76zM250 102h24v23h-24zM288 102h21v23h-21z"/></g><path d="M21 96l48-37 48 37M226 85l54-37 54 37" fill="#d2927c"/><path d="M0 290H360V400H0Z" fill="#a5b6bb"/><path d="M0 364H360" stroke="#f8f1d7" stroke-width="5" stroke-dasharray="28 20"/>${trees()}`;
export function person(x,y,c){return `<g transform="translate(${x} ${y})"><circle cy="-21" r="13" fill="#f0c49e"/><path d="M-15-6Q0-14 15-6L19 27H-19Z" fill="${c}"/><path d="M-9 27v15m18-15v15" stroke="#465c70" stroke-width="8" stroke-linecap="round"/></g>`;}
export function cloud(x,y,i){return `<g fill="#fff" stroke="#c3dce3" stroke-width="2"><ellipse cx="${x}" cy="${y}" rx="33" ry="20"/><circle cx="${x-10}" cy="${y-14}" r="21"/><circle cx="${x+13}" cy="${y-9}" r="24"/></g>`;}
