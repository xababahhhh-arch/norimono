// 架空のチラシをブラウザ内OCRで読んだ結果（fixtures/raw/11_ocr_fake_duo.json）での回帰テスト。
// 元の文字は fixtures/raw/09_paste_duo_layout.txt（架空）。正しい抽出結果をここで定義する。
//
// 正しい抽出結果（OCRの読み誤りを含む入力に対して）
// ・発売日程は2件（先行電話予約 9/12 14:00、一般発売 9/13 10:00）。同じ発売の記載が2か所にあっても1件にまとめる。
//   2か所で年が食い違う（OCRで「2028年」）場合は、推測で決めずに確定を止める「判断が必要な記載」を出す。
//   日付の次の行に時刻だけがある場合（「9月13日（日）」＋「10:00〜」）は、その時刻を発売時刻にする。
// ・料金は「区分 金額円」と読めた EX（補助席）2,000円 だけを取り込む。
//   「3.500円」「3,000M」「1,500（円がない）」は推測で直さず料金に入れない。そのかわり、取り落とした金額を
//   原文つきで「判断が必要な記載」（確定を止める）に出し、黙って確認完了にならないようにする。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractEvent } from '../js/extract/rules.js';
import { canFinalize } from '../js/core/validate.js';
import { confirmField } from '../js/core/field.js';
import { rawFixture } from './helpers.mjs';

const REF = { referenceDate: '2026-04-01', now: '2026-04-01T00:00:00+09:00' };
const v = (f) => f?.value ?? null;
const ocrRaw = () => JSON.parse(readFileSync(new URL('../fixtures/raw/11_ocr_fake_duo.json', import.meta.url), 'utf8'));
const run = () => extractEvent(ocrRaw(), REF).event;
const k = (s) => String(s ?? '').replace(/\s/g, '');

function walk(o, fn) {
  if (o && typeof o === 'object') {
    if ('value' in o && 'confirmed' in o) return fn(o);
    Object.values(o).forEach((x) => walk(x, fn));
  }
}
const pageRaw = (text) => ({ files: [{ name: 'fake.txt', type: 'text/plain', pages: [{ page: 1, text }] }] });

test('OCR：同じ発売の記載が2か所にあっても、発売日程は2件にまとめる', () => {
  const s = run().tickets.sales_schedule.items;
  assert.equal(s.length, 2, JSON.stringify(s.map((x) => [v(x.method), v(x.date), v(x.time)])));
  const pre = s.find((x) => /先行/.test(v(x.method)));
  const gen = s.find((x) => /プレイガイド/.test(v(x.method)));
  assert.ok(pre && gen);
  assert.equal(v(pre.time), '14:00');
  assert.equal(v(gen.date), '2026-09-13');
  assert.equal(v(gen.time), '10:00');
  assert.doesNotMatch(v(gen.method), /[・、]$/);
});

test('OCR：2か所で年が食い違う発売日は推測で決めず、確定を止める', () => {
  const ev = run();
  const pre = ev.tickets.sales_schedule.items.find((x) => /先行/.test(v(x.method)));
  assert.ok(pre.date.reasons.some((r) => /食い違/.test(r)));
  const r = ev.meta.review_items.find((x) => x.topic === '発売日の食い違い');
  assert.ok(r, ev.meta.review_items.map((x) => x.topic).join(','));
  assert.equal(r.blocking, true);
  assert.match(r.reason, /2028/);
  assert.match(r.reason, /2026/);
});

test('OCR：読み誤った金額は料金に入れず、取り落とした金額を原文つきで確定を止める記載に出す', () => {
  const ev = run();
  assert.deepEqual(ev.pricing.prices.items.map((p) => v(p.amount)), [2000]);
  const r = ev.meta.review_items.find((x) => x.topic === '料金の取り落とし');
  assert.ok(r, ev.meta.review_items.map((x) => x.topic).join(','));
  assert.equal(r.blocking, true);
  assert.match(r.reason, /3,000M/);
  assert.match(r.reason, /1,500/);
  assert.ok(ev.meta.review_items.some((x) => x.topic === '金額の読み取り' && /3\.500/.test(x.reason)));
});

test('OCR：取り出した項目を全部確認しても、取り落としの記載に対応するまで確定できない', () => {
  const ev = run();
  walk(ev, (f) => confirmField(f, true, REF.now));
  ev.status.code = 'on_sale';
  const blockingTopics = ev.meta.review_items.filter((r) => r.blocking).map((r) => r.topic);
  assert.ok(blockingTopics.includes('料金の取り落とし'));
  assert.equal(canFinalize(ev).ok, false);
  const b = canFinalize(ev).blockers.find((x) => x.label === '判断が必要な記載');
  assert.match(b.message, /料金の取り落とし/);
});

test('貼り付けた文字（同じ架空チラシ）では、料金4件・発売日程2件のまま（取り落としの記載は出ない）', () => {
  const ev = extractEvent(rawFixture('09_paste_duo_layout'), REF).event;
  assert.deepEqual(ev.pricing.prices.items.map((p) => v(p.amount)), [3500, 3000, 2000, 1500]);
  assert.equal(ev.tickets.sales_schedule.items.length, 2);
  assert.equal(ev.meta.review_items.some((x) => x.topic === '料金の取り落とし' || x.topic === '発売日の食い違い'), false);
});

test('料金の行で「円」が付かない金額は取り込まず、取り落としとして出す（OCRでなくても同じ）', () => {
  const ev = extractEvent(pageRaw('架空の演奏会\n2026年5月10日（日）14:00開演\n全席指定 一般 3,000円 学生 1,500\n電話 045-000-0000'), REF).event;
  assert.deepEqual(ev.pricing.prices.items.map((p) => v(p.amount)), [3000]);
  const r = ev.meta.review_items.find((x) => x.topic === '料金の取り落とし');
  assert.ok(r);
  assert.match(r.reason, /学生 ?1,500/);
});

test('料金の行の日付・時刻・電話番号・郵便番号は取り落としにしない', () => {
  const ev = extractEvent(pageRaw('架空の演奏会\n2026年5月10日（日）14:00開演\n料金 一般 3,000円（2026年4月1日発売） 当日 3,500円 問合せ 045-000-0000 〒000-0000'), REF).event;
  assert.equal(ev.meta.review_items.some((x) => x.topic === '料金の取り落とし'), false, JSON.stringify(ev.meta.review_items));
});

test('日付の次の行に時刻だけがある発売の記載は、その時刻を発売時刻にする', () => {
  const ev = extractEvent(pageRaw('架空の演奏会\n2026年5月10日（日）14:00開演\n一般発売：2026年3月1日（日）\n10:00〜\n一般 3,000円'), REF).event;
  const s = ev.tickets.sales_schedule.items;
  assert.equal(s.length, 1);
  assert.equal(v(s[0].date), '2026-03-01');
  assert.equal(v(s[0].time), '10:00');
});

test('発売日が開催日より後になる場合は、確定を止める記載に出す', () => {
  const ev = extractEvent(pageRaw('架空の演奏会\n2026年5月10日（日）14:00開演\n一般発売：2027年3月1日（月）10:00〜\n一般 3,000円'), REF).event;
  const r = ev.meta.review_items.find((x) => x.topic === '発売日の確認');
  assert.ok(r, JSON.stringify(ev.meta.review_items.map((x) => x.topic)));
  assert.equal(r.blocking, true);
});

test('販売方法ごとの発売日が複数あるとき、同じ方法で日付が違うものはまとめない', () => {
  const ev = extractEvent(pageRaw('架空の演奏会\n2026年5月10日（日）14:00開演\n会員先行：2026年2月1日（日）10:00〜\n一般発売：2026年3月1日（日）10:00〜\n一般 3,000円'), REF).event;
  assert.deepEqual(ev.tickets.sales_schedule.items.map((x) => [k(v(x.method)), v(x.date)]), [['会員先行', '2026-02-01'], ['一般発売', '2026-03-01']]);
});
