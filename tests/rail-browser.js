import { railLevels, tracks } from '../games/play/shared/rail-geometry.js';
const results = document.querySelector('#results');
const lines = [];
function log(text) { lines.push(text); results.textContent = lines.join('\n'); }
function assert(ok, message) { if (!ok) throw new Error(message); }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(fn, label, timeout = 15000) {
  const start = Date.now();
  while (!fn()) { if (Date.now() - start > timeout) throw new Error(`timeout: ${label}`); await sleep(25); }
  return fn();
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function screenPoint(path, length) {
  return path.getPointAtLength(length).matrixTransform(path.getScreenCTM());
}
function renderedPort(doc, cell, side) {
  const path = doc.querySelector(`[data-cell="${cell[0]},${cell[1]}"] .rail-centerline`);
  const type = cell[2], length = path.getTotalLength();
  const offsets = type === 'fork' ? { W: 0, E: 100, N: length } : { [tracks[type].from || 'N']: 0, [tracks[type].to || 'S']: length };
  return screenPoint(path, offsets[side]);
}
function inspectConnections(doc, level) {
  let maxGap = 0;
  for (let i = 1; i < level.route.length; i++) {
    const a = level.route[i - 1], b = level.route[i];
    maxGap = Math.max(maxGap, distance(renderedPort(doc, a, tracks[a[2]].to), renderedPort(doc, b, tracks[b[2]].from)));
  }
  if (level.siding) {
    maxGap = Math.max(maxGap, distance(renderedPort(doc, level.route[1], 'N'), renderedPort(doc, level.siding[0], 'S')));
  }
  assert(maxGap < .1, `rendered seam gap ${maxGap.toFixed(2)}px`);
  // Compare the train's full route against the actual visible track, not just level data.
  const visible = [];
  for (const path of doc.querySelectorAll('.rail-centerline')) {
    const length = path.getTotalLength();
    for (let d = 0; d <= length; d += .5) visible.push(screenPoint(path, d));
    visible.push(screenPoint(path, length));
  }
  const route = doc.querySelector('.rail-route'), length = route.getTotalLength();
  let maxRouteError = 0;
  for (let d = 0; d <= length; d += 2) {
    const p = screenPoint(route, d);
    maxRouteError = Math.max(maxRouteError, Math.min(...visible.map(q => distance(p, q))));
  }
  assert(maxRouteError < .7, `train route leaves visible rail ${maxRouteError.toFixed(2)}px`);
  const matrix = route.getScreenCTM();
  assert(Math.abs(Math.hypot(matrix.a, matrix.b) - Math.hypot(matrix.c, matrix.d)) < .001, 'non-uniform board scaling');
  return { maxGap, maxRouteError, visible };
}

async function check(width, height) {
  const frame = document.createElement('iframe');
  frame.width = width; frame.height = height; frame.title = `${width}×${height}`;
  frame.src = '../games/play/rail.html';
  const loaded = new Promise(resolve => frame.onload = resolve);
  document.querySelector('#frames').append(frame);
  await loaded;
  const win = frame.contentWindow, doc = frame.contentDocument;
  const errors = [];
  win.addEventListener('error', e => errors.push(e.message));
  win.speechSynthesis.speak = utterance => setTimeout(() => utterance.onend?.(), 10);
  win.speechSynthesis.cancel = () => {};
  await waitFor(() => doc.querySelector('#skip'), 'intro');
  doc.querySelector('#skip').click();
  for (let round = 0; round < 3; round++) {
    await waitFor(() => doc.querySelectorAll('.gap').length === round + 1, 'next stage');
    const before = doc.querySelectorAll('.gap').length;
    doc.querySelector('#tools button[aria-label="みぎへ カーブ"]').click();
    assert(doc.querySelectorAll('.gap').length === before, 'wrong track accepted');
    const level = railLevels[round];
    for (const [x, y] of level.holes) {
      const type = level.route.find(cell => cell[0] === x && cell[1] === y)[2];
      const label = { straight: 'まっすぐ', curve: 'したへ カーブ', up: 'みぎへ カーブ', fork: 'ぶんき' }[type];
      doc.querySelector(`#tools button[aria-label="${label}"]`).click();
    }
    const measurement = inspectConnections(doc, level);
    assert(doc.querySelectorAll(".rail-buffer").length === (level.buffers || []).length, "siding buffer missing");
    const train = await waitFor(() => doc.querySelector('.rail-train'), 'train');
    let samples = 0, turns = 0, maxTrainError = 0;
    await waitFor(() => {
      if (!train.isConnected) return true;
      const matrix = train.getScreenCTM();
      const p = { x: matrix.e, y: matrix.f };
      const error = Math.min(...measurement.visible.map(q => distance(p, q)));
      maxTrainError = Math.max(maxTrainError, error);
      if (Math.abs(matrix.b) > .05) turns++;
      samples++;
      return false;
    }, 'train finishes');
    assert(maxTrainError < .7, `train off track ${maxTrainError.toFixed(2)}px`);
    assert(samples > 10, 'too few train samples');
    if (round > 0) assert(turns > 5, 'train did not turn on the curves');
    assert(doc.documentElement.scrollWidth <= width, 'horizontal overflow');
    assert(errors.length === 0, errors.join('; '));
    log(`PASS ${width}×${height} stage ${round + 1}: 継ぎ目 ${measurement.maxGap.toFixed(3)}px / 軌道誤差 ${maxTrainError.toFixed(3)}px / ${samples} samples`);
  }
  await waitFor(() => doc.querySelector('#again'), 'clear');
  doc.querySelector('#again').click();
  assert(doc.querySelectorAll('.gap').length === 1, 'restart failed');
  log(`PASS ${width}×${height}: クリア・もういっかい`);
}
try {
  await Promise.all([[320, 568], [375, 667], [390, 844], [412, 915]].map(size => check(...size)));
  log('ALL PASS: 12ステージ・4回の再挑戦。実端末の音声と操作は別途確認。');
  document.title = 'PASS — 線路の接続・走行検証';
} catch (e) { log(`FAIL: ${e.message}`); document.title = 'FAIL — 線路の接続・走行検証'; }
