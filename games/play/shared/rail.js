import { tracks, railLevels, port, routePath, validateLevel, trackMarkup, trackIcon } from './rail-geometry.js';

export function mountRail({ stage, tools, hint, round, art, sound, speak, later, win, button, isBusy, setBusy }) {
  const level = railLevels[round];
  const holes = level.holes.map(([x, y]) => level.route.find(cell => cell[0] === x && cell[1] === y));
  const placed = new Map();
  let at = 0;
  const key = cell => `${cell[0]},${cell[1]}`;
  const cells = [...level.route, ...(level.siding || [])];
  const start = port(level.route[0], tracks[level.route[0][2]].from);
  const last = level.route[level.route.length - 1];
  const end = port(last, tracks[last[2]].to);
  hint.textContent = 'ひかる すきまに せんろを つなごう';
  stage.innerHTML = `<svg class="railboard" viewBox="-30 -30 460 360" role="group" aria-label="せんろと でんしゃ"><g class="rail-cells"></g><path class="rail-route" d="${routePath(level.route)}" fill="none" stroke="none"/><circle class="rail-start" cx="${start[0]}" cy="${start[1]}" r="9" fill="#70ae9a"/><circle class="rail-goal" cx="${end[0]}" cy="${end[1]}" r="9" fill="#ef9567"/>${(level.buffers || []).map(([x, y]) => `<g class="rail-buffer" role="img" aria-label="ゆきどまりの くるまどめ" transform="translate(${x} ${y})"><rect x="-28" y="-17" width="56" height="25" rx="5" fill="#738789"/><path d="M-24-5h48M-10-14v9M12-5v10" fill="none" stroke="#dce4dd" stroke-width="3"/><rect x="-23" y="5" width="46" height="9" rx="3" fill="#c27d58"/><path d="M-16 6v7M0 6v7M16 6v7" stroke="#ffe6af" stroke-width="4"/></g>`).join('')}</svg>`;
  const board = stage.querySelector('.railboard');
  const root = stage.querySelector('.rail-cells');
  const ns = 'http://www.w3.org/2000/svg';
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 4; x++) {
      const cell = cells.find(cell => cell[0] === x && cell[1] === y);
      const gap = cell && holes.includes(cell);
      const tile = document.createElementNS(ns, 'g');
      tile.classList.add('tile');
      tile.dataset.cell = `${x},${y}`;
      tile.setAttribute('transform', `translate(${x * 100} ${y * 100})`);
      tile.innerHTML = '<rect class="tile-background" x="1" y="1" width="98" height="98" rx="12"/>';
      if (gap) tile.classList.add('gap');
      else if (cell) {
        tile.insertAdjacentHTML('beforeend', trackMarkup(cell[2]));
        placed.set(key(cell), cell[2]);
      }
      root.append(tile);
    }
  }
  const tileAt = cell => root.querySelector(`[data-cell="${key(cell)}"]`);
  const light = () => tileAt(holes[at]).classList.add('next');
  light();
  for (const type of ['straight', 'curve', 'up', 'fork']) {
    const b = button('', () => {
      if (isBusy()) return;
      const cell = holes[at], tile = tileAt(cell);
      if (type !== cell[2]) {
        tile.animate([{ opacity: .5 }, { opacity: 1 }], { duration: 350 });
        speak('つながる せんろを さがそう');
        return;
      }
      placed.set(key(cell), type);
      tile.insertAdjacentHTML('beforeend', trackMarkup(type));
      tile.classList.remove('gap', 'next');
      sound();
      at++;
      if (at < holes.length) light();
      else run();
    }, trackIcon(type));
    b.setAttribute('aria-label', { straight: 'まっすぐ', curve: 'したへ カーブ', up: 'みぎへ カーブ', fork: 'ぶんき' }[type]);
  }

  function run() {
    const completed = {
      ...level,
      route: level.route.map(cell => [cell[0], cell[1], placed.get(key(cell))]),
      siding: (level.siding || []).map(cell => [cell[0], cell[1], placed.get(key(cell))])
    };
    // Do not reward merely filling the slots: the actual installed track must connect.
    if (!validateLevel(completed)) throw new Error('Rail route is disconnected');
    setBusy(true);
    tools.innerHTML = '';
    hint.textContent = 'つながった！ しゅっぱつ！';
    speak('つながった！しゅっぱつ！');
    const route = board.querySelector('.rail-route');
    const length = route.getTotalLength();
    const train = document.createElementNS(ns, 'g');
    train.classList.add('rail-train');
    // Put the wheel contact line on the route; the body sits above it.
    train.innerHTML = `<g transform="translate(-42 -42)"><svg width="84" height="52" viewBox="0 0 260 160">${art('train')}</svg></g>`;
    board.append(train);
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1800 : length * 7;
    let started;
    function move(now) {
      started ??= now;
      const fraction = Math.min((now - started) / duration, 1);
      const distance = fraction * length;
      const point = route.getPointAtLength(distance);
      const before = route.getPointAtLength(Math.max(0, distance - .5));
      const after = route.getPointAtLength(Math.min(length, distance + .5));
      const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
      train.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`);
      train.dataset.distance = String(distance);
      if (fraction < 1) later(() => move(performance.now()), 16);
      else {
        hint.textContent = 'とうちゃく！';
        later(() => { setBusy(false); win(); }, 350);
      }
    }
    move(performance.now());
  }
  speak(hint.textContent);
}
