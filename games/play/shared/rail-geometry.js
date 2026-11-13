// The displayed tracks, connection checks and train route use these same coordinates.
export const tracks = {
  straight: { path: 'M0 50H100', ports: { W: [0, 50], E: [100, 50] }, from: 'W', to: 'E', commands: [['L', 100, 50]] },
  curve: { path: 'M0 50Q50 50 50 100', ports: { W: [0, 50], S: [50, 100] }, from: 'W', to: 'S', commands: [['Q', 50, 50, 50, 100]] },
  up: { path: 'M50 0Q50 50 100 50', ports: { N: [50, 0], E: [100, 50] }, from: 'N', to: 'E', commands: [['Q', 50, 50, 100, 50]] },
  fork: { path: 'M0 50H100M50 50V0', ports: { W: [0, 50], E: [100, 50], N: [50, 0] }, from: 'W', to: 'E', commands: [['L', 100, 50]] },
  vertical: { path: 'M50 0V100', ports: { N: [50, 0], S: [50, 100] } }
};

export const railLevels = [
  { route: [[0, 1, 'straight'], [1, 1, 'straight'], [2, 1, 'straight'], [3, 1, 'straight']], holes: [[1, 1]] },
  { route: [[0, 0, 'straight'], [1, 0, 'curve'], [1, 1, 'up'], [2, 1, 'straight'], [3, 1, 'straight']], holes: [[1, 0], [1, 1]] },
  { route: [[0, 1, 'straight'], [1, 1, 'fork'], [2, 1, 'curve'], [2, 2, 'up'], [3, 2, 'straight']], holes: [[1, 1], [2, 1], [2, 2]], siding: [[1, 0, 'vertical']], buffers: [[150, 0]] }
];

export function port(cell, side) {
  const point = tracks[cell[2]]?.ports[side];
  return point && [cell[0] * 100 + point[0], cell[1] * 100 + point[1]];
}
const equal = (a, b) => Boolean(a && b && a[0] === b[0] && a[1] === b[1]);

export function validateLevel(level) {
  const route = level.route;
  if (!route.length) return false;
  // A successful placement must form one continuous route, including each curve.
  for (let i = 0; i < route.length; i++) {
    const cell = route[i], spec = tracks[cell[2]];
    if (!spec?.from || !spec?.to) return false;
    if (i && !equal(port(route[i - 1], tracks[route[i - 1][2]].to), port(cell, spec.from))) return false;
  }
  const start = port(route[0], tracks[route[0][2]].from);
  const end = port(route.at(-1), tracks[route.at(-1)[2]].to);
  const allowedEnds = [start, end, ...(level.buffers || [])];
  const cells = [...route, ...(level.siding || [])];
  const opposite = { N: 'S', S: 'N', W: 'E', E: 'W' };
  // Every branch must connect to a neighbor or terminate at an explicit buffer.
  return cells.every(cell => Object.keys(tracks[cell[2]].ports).every(side => {
    const point = port(cell, side);
    return allowedEnds.some(end => equal(point, end)) || cells.some(other => other !== cell && equal(port(other, opposite[side]), point));
  }));
}

export function routePath(route) {
  const start = port(route[0], tracks[route[0][2]].from);
  let d = `M${start.join(' ')}`;
  for (const [x, y, type] of route) {
    for (const [command, ...coords] of tracks[type].commands) {
      d += command + coords.map((value, i) => value + (i % 2 ? y : x) * 100).join(' ');
    }
  }
  return d;
}

export function trackMarkup(type) {
  const d = tracks[type].path;
  return `<g class="rail-piece" data-type="${type}"><path d="${d}" fill="none" stroke="#917255" stroke-width="25" stroke-dasharray="5 7"/><path d="${d}" fill="none" stroke="#536b73" stroke-width="15"/><path class="rail-centerline" d="${d}" fill="none" stroke="#e9e9cf" stroke-width="8"/></g>`;
}

export function trackIcon(type) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${trackMarkup(type)}</svg>`;
}
