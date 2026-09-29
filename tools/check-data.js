// データの確認用（パソコンで実行）: node tools/check-data.js
// ゲーム本体では使いません。問題を足したり直したりしたあとに実行してください。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
for (const f of ['vehicles.js', 'nakama-data.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const { VEHICLES, NAKAMA_ITEMS, NAKAMA_QUESTIONS } = ctx;

const errors = [];
const vehicleIds = new Set(VEHICLES.map((v) => v.id));
const hasAll = (item, tags) => tags.every((t) => item.tags.indexOf(t) >= 0);

// 絵
for (const [id, it] of Object.entries(NAKAMA_ITEMS)) {
  if (!it.name || !it.say) errors.push(`絵 ${id}: name と say が必要です`);
  if (!Array.isArray(it.tags) || !it.tags.length) errors.push(`絵 ${id}: tags が必要です`);
  if (!it.image && !it.svg && !it.vehicle) errors.push(`絵 ${id}: vehicle / svg / image のどれかが必要です`);
  if (it.vehicle && !vehicleIds.has(it.vehicle)) errors.push(`絵 ${id}: vehicles.js に ${it.vehicle} がありません`);
}

// 問題
const seen = new Set();
for (const q of NAKAMA_QUESTIONS) {
  const name = `問題 ${q.id}（${q.text}）`;
  if (seen.has(q.id)) errors.push(`${name}: id が重なっています`);
  seen.add(q.id);
  if (!q.text || !q.say) errors.push(`${name}: text と say が必要です`);
  if (!q.answers || !q.answers.length) errors.push(`${name}: answers が必要です`);
  if (!q.wrongs || q.wrongs.length < 2) errors.push(`${name}: wrongs は2つ以上 必要です（3たく用）`);
  for (const id of (q.answers || []).concat(q.wrongs || [])) {
    if (!NAKAMA_ITEMS[id]) errors.push(`${name}: 絵 ${id} がありません`);
  }
  for (const id of q.answers || []) {
    const it = NAKAMA_ITEMS[id];
    if (it && !hasAll(it, q.tags)) errors.push(`${name}: 正解の ${id} が なかま（${q.tags}）に入っていません`);
  }
  for (const id of q.wrongs || []) {
    const it = NAKAMA_ITEMS[id];
    if (it && hasAll(it, q.tags)) errors.push(`${name}: 不正解の ${id} も なかま（${q.tags}）に入るため、正解が2つになります`);
    if ((q.answers || []).indexOf(id) >= 0) errors.push(`${name}: ${id} が answers と wrongs の両方にあります`);
  }
}
if (NAKAMA_QUESTIONS.length < 5) errors.push('問題は5つ以上 必要です（1回5問・重複なし）');

if (errors.length) {
  console.error('NG: ' + errors.length + ' 件\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log(`OK: 問題 ${NAKAMA_QUESTIONS.length} こ / 絵 ${Object.keys(NAKAMA_ITEMS).length} こ。どの問題も正解は1つです。`);
