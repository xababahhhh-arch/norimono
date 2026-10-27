import '../../../shared/vehicles.js';
export const vehicles=Object.fromEntries(NoriVehicles.list().map(v=>[v.id,v]));
export function vehicle(id,overrides={}) { const svg=NoriVehicles.artwork(id,overrides); return overrides.name?svg.replace(/aria-label="[^"]*"/,`aria-label="${overrides.name}"`):svg; }
export async function profile(){if(new URLSearchParams(location.search).get('profile')==='sou')return (await import('./sou.js')).default;return {};}
