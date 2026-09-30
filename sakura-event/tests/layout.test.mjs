// 別レイアウト（架空のチラシ2：2段組み・複数公演・複数料金）での検証。実物のチラシではない。
// 元のチラシの文字（正解）は、このファイルの TRUTH に定義する。OCR の結果は正解に使わない。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractEvent } from '../js/extract/rules.js';
import { itemsToLines } from '../js/extract/pdf.js';
import { canFinalize } from '../js/core/validate.js';
import { confirmField } from '../js/core/field.js';

const REF = { referenceDate: '2026-08-01', now: '2026-08-01T00:00:00+09:00' };
const v = (f) => f?.value ?? null;
const n = (s) => String(s ?? '').normalize('NFKC').replace(/\s/g, '');
const load = (name) => JSON.parse(readFileSync(new URL(`../fixtures/raw/${name}.json`, import.meta.url), 'utf8'));

// 架空のチラシ2の正しい内容
const TRUTH = {
  title: '森のおんがく会',
  dates: [['2026-12-05', '①', '11:00', '10:30'], ['2026-12-05', '②', '14:30', '14:00'], ['2026-12-06', null, '15:00', '14:30']],
  venue: '戸塚区民文化センターさくらプラザ・ホール',
  performers: [['森野すず', 'ヴァイオリン'], ['木村たける', 'ピアノ']],
  works: [['J.S.バッハ', 'G線上のアリア'], ['架空作曲家', '森のワルツ']],
  prices: [['一般', 2000], ['子ども(3歳〜高校生)', 1000], ['親子ペア', 2500]],
  seating: '全席指定', tax: '税込',
  sales: [['会員先行', '2026-09-20', '10:00'], ['一般発売', '2026-09-27', '10:00']],
  channel: ['さくらプラザ窓口', '045-000-0000', '9:00〜21:00'],
  organizer: 'さくらプラザ(架空)', supporter: '架空市教育委員会', phone: '045-000-0000',
};

// PDF.js の textContent の項目を模したもの（x, y は pt。y は下から）
const item = (str, x, y, size = 10) => ({ str, transform: [size, 0, 0, size, x, y], width: str.length * size, height: size });
const PAGE = { width: 595, height: 842 };

test('段組みの文字入りPDF：左右の段を1行につなげず、段ごとに上から並べる', () => {
  const items = [
    item('森のおんがく会', 30, 800, 24),
    item('日時', 30, 700), item('料金', 310, 700),
    item('2026年12月5日（土）', 30, 685), item('一般 2,000円', 310, 685),
    item('①11:00開演', 30, 670), item('子ども 1,000円', 310, 670),
    item('②14:30開演', 30, 655), item('親子ペア 2,500円', 310, 655),
    item('主催：架空の主催者 後援：架空市教育委員会と架空の財団法人ほか多数', 30, 600),
  ];
  const lines = itemsToLines(items, PAGE).map((l) => l.text);
  assert.deepEqual(lines, [
    '森のおんがく会',
    '日時', '2026年12月5日（土）', '①11:00開演', '②14:30開演',
    '料金', '一般 2,000円', '子ども 1,000円', '親子ペア 2,500円',
    '主催：架空の主催者 後援：架空市教育委員会と架空の財団法人ほか多数',
  ]);
});

test('1段組みのPDF：行の中の広い空白が1〜2行だけなら、段とみなさずに1行のまま', () => {
  const items = [
    item('主催：架空の主催者', 30, 700), item('共催：架空の共催者', 330, 700),
    item('2026年12月5日（土）14:00開演', 30, 685),
    item('TEL：045-000-0000', 30, 670), item('FAX：045-000-0001', 330, 670),
  ];
  assert.deepEqual(itemsToLines(items, PAGE).map((l) => l.text), [
    '主催：架空の主催者 共催：架空の共催者', '2026年12月5日（土）14:00開演', 'TEL：045-000-0000 FAX：045-000-0001',
  ]);
});

test('架空のチラシ2（文字入りPDF・段組み）：重点項目が正解どおり', () => {
  const e = extractEvent(load('12_pdf_twocol'), REF).event;
  assert.equal(v(e.basic.title), TRUTH.title);
  assert.deepEqual(e.schedule.dates.items.map((d) => [v(d.date), v(d.session_label), v(d.start_time), v(d.doors_open)]), TRUTH.dates);
  assert.equal(n(v(e.venue.venue)), TRUTH.venue);
  assert.deepEqual(e.performers.items.map((p) => [v(p.name), v(p.instrument)]), TRUTH.performers);
  assert.deepEqual(e.program.works.items.map((w) => [v(w.composer), v(w.work)]), TRUTH.works);
  assert.deepEqual(e.pricing.prices.items.map((p) => [n(v(p.category)), v(p.amount)]), TRUTH.prices);
  assert.equal(v(e.pricing.seating_type), TRUTH.seating);
  assert.equal(v(e.pricing.tax_included), TRUTH.tax);
  assert.deepEqual(e.tickets.sales_schedule.items.map((x) => [n(v(x.method)), v(x.date), v(x.time)]), TRUTH.sales);
  const c = e.tickets.ticket_channels.items;
  assert.equal(c.length, 1);
  assert.deepEqual([v(c[0].name), v(c[0].phone), v(c[0].hours)], TRUTH.channel);
  assert.equal(n(v(e.organization.organizer)), TRUTH.organizer);
  assert.equal(v(e.organization.supporter), TRUTH.supporter);
  assert.equal(v(e.organization.phone), TRUTH.phone);
  assert.equal(e.meta.review_items.filter((r) => r.blocking).length, 0);
  assert.equal(e.status.code, 'unset');
});

test('架空のチラシ2（画像だけのPDF・OCR）：読み誤った料金は3件とも確定を止める記載に出る（黙って欠けない）', () => {
  const e = extractEvent(load('13_ocr_twocol'), REF).event;
  // 公演日時・発売は OCR でも正しく取れる
  assert.deepEqual(e.schedule.dates.items.map((d) => [v(d.date), v(d.session_label), v(d.start_time), v(d.doors_open)]), TRUTH.dates);
  assert.deepEqual(e.tickets.sales_schedule.items.map((x) => [n(v(x.method)), v(x.date), v(x.time)]), TRUTH.sales);
  // 料金は「2,000M」「1.000円」「2.500円」と読まれたため、推測で入れない
  assert.equal(e.pricing.prices.items.length, 0);
  const topics = e.meta.review_items.filter((r) => r.blocking).map((r) => r.topic);
  assert.ok(topics.includes('料金の取り落とし'));
  assert.equal(topics.filter((t) => t === '金額の読み取り').length, 2);
  // 見出し「プログラム」の読み誤りで曲目が出演者に混ざった場合は、確定を止める記載に出る
  assert.ok(topics.includes('出演者の読み取り'));
});

test('架空のチラシ2（OCR）：取り出した値を全部確認しても、判断が必要な記載に対応するまで確定できない', () => {
  const e = extractEvent(load('13_ocr_twocol'), REF).event;
  const walk = (o) => { if (o && typeof o === 'object') { if ('value' in o && 'confirmed' in o) confirmField(o, true, REF.now); else Object.values(o).forEach(walk); } };
  walk(e);
  e.status.code = 'on_sale';
  e.performers.items.forEach((p) => { p.profile_use.value = 'exclude'; });
  const r = canFinalize(e);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.label === '判断が必要な記載'));
});
