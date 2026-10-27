/* Original geometric vehicle artwork. No brand references or external assets. */
export const vehicles={
 car:{name:'くるま',say:'くるま',category:'road',color:'#ed7856'},
 bus:{name:'バス',say:'バス',category:'road',color:'#e9b840'},
 fire:{name:'しょうぼうしゃ',say:'しょうぼうしゃ',category:'rescue',color:'#e8504c'},
 truck:{name:'トラック',say:'トラック',category:'work',color:'#4c9eae'},
 train:{name:'でんしゃ',say:'でんしゃ',category:'rail',color:'#69ad89'},
 plane:{name:'ひこうき',say:'ひこうき',category:'air',color:'#7aa8da'},
 boat:{name:'ふね',say:'ふね',category:'water',color:'#9b8ac6'}
};
export function vehicle(id,overrides={}){const v={...vehicles[id],...overrides};let body='';const c=v.color;
if(id==='plane')body=`<path d="M30 85L110 64 125 15 143 15 151 62 215 80 218 94 150 88 145 119 168 132 163 143 130 132 100 142 94 132 116 118 113 88 30 100Z" fill="${c}"/><path d="M120 58h25" stroke="#25485e" stroke-width="9"/>`;
else if(id==='boat')body=`<path d="M20 95h220l-30 43H55Z" fill="${c}"/><path d="M70 90V50h100v40" fill="#fff3d9"/><path d="M90 60h22v22H90zm40 0h22v22h-22z" fill="#3b6174"/><path d="M12 145q24-12 48 0t48 0t48 0t48 0t48 0" fill="none" stroke="#77c9dd" stroke-width="9"/>`;
else {body=`<rect x="22" y="${id==='car'?70:43}" width="${id==='truck'?140:210}" height="${id==='car'?58:85}" rx="18" fill="${c}"/>`;
if(id==='truck')body='<path d="M22 65v63h140V65" fill="#c8e0d9" stroke="'+c+'" stroke-width="12"/>';
if(id==='car')body+=`<path d="M65 74l22-35h65l39 35" fill="${c}"/><path d="M91 48h49l24 26H75Z" fill="#d4f1ed"/>`;
else if(id==='truck')body+=`<path d="M163 70h45l31 31v27h-76Z" fill="#f3bc50"/><path d="M177 79h24l20 22h-44Z" fill="#d4f1ed"/>`;
else body+=`<rect x="39" y="57" width="43" height="31" rx="6" fill="#d4f1ed"/><rect x="94" y="57" width="43" height="31" rx="6" fill="#d4f1ed"/>${id==='fire'?'<path d="M37 32h157M48 23v18m27-18v18m27-18v18m27-18v18m27-18v18m27-18v18" stroke="#f5e3c3" stroke-width="7"/><rect x="162" y="56" width="52" height="13" rx="6" fill="#fff3df"/>':'<rect x="150" y="57" width="60" height="31" rx="6" fill="#d4f1ed"/>'}`;
body+=`<path d="M28 111h197" stroke="#fff3df" stroke-width="8"/>`;
for(const x of [65,195])body+=`<circle cx="${x}" cy="129" r="21" fill="#294353"/><circle cx="${x}" cy="129" r="10" fill="#e4e9e5"/>`;}
return `<svg viewBox="0 0 260 160" role="img" aria-label="${v.name}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;}
// Optional personal names affect data only; artwork remains the commercial original.
export async function profile(){if(new URLSearchParams(location.search).get('profile')==='sou')return (await import('./sou.js')).default;return {};}
