// 文字原稿を貼り付ける運用（REAL_DATA_TEST_UNPLUGGED.md の問題）の回帰テスト。
// 入力は実チラシの書き方・構造を保った架空の内容（fixtures/raw/09_paste_duo_layout.txt, 10_ambiguous.txt）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractEvent } from '../js/extract/rules.js';
import { canFinalize, gateChecks } from '../js/core/validate.js';
import { confirmField } from '../js/core/field.js';
import { normalizeEvent } from '../js/core/schema.js';
import { generateHP } from '../js/generate/hp.js';
import { generateText } from '../js/generate/text.js';
import { generateSns } from '../js/generate/sns.js';
import { rawFixture, parse } from './helpers.mjs';

const REF = { referenceDate: '2026-04-01', now: '2026-04-01T00:00:00+09:00' };
const run = (name) => extractEvent(rawFixture(name), REF);
const v = (f) => f?.value ?? null;

function walk(o, fn) {
  if (o && typeof o === 'object') {
    if ('value' in o && 'confirmed' in o) return fn(o);
    Object.values(o).forEach((x) => walk(x, fn));
  }
}
/** 人が全項目を確認し、販売状況を設定し、判断が必要な記載に対応した状態を再現する */
function reviewAll(ev, status = 'on_sale') {
  walk(ev, (f) => confirmField(f, true, '2026-04-02T00:00:00+09:00'));
  ev.status.code = status;
  ev.meta.review_items.forEach((r) => { r.resolved = true; });
  return ev;
}

test('「日付／19:00開演（18:30開場）」の開場と開演を区別する', () => {
  const d = run('09_paste_duo_layout').event.schedule.dates.items;
  assert.equal(d.length, 1);
  assert.equal(v(d[0].date), '2026-11-21');
  assert.equal(v(d[0].start_time), '19:00');
  assert.equal(v(d[0].doors_open), '18:30');
  assert.match(d[0].start_time.basis, /開演/);
});

test('開場と開演を区別できない場合は推測せず、原文つきで確認を求める', () => {
  const r = run('10_ambiguous');
  const d = r.event.schedule.dates.items[0];
  assert.equal(v(d.start_time), null);
  assert.equal(v(d.doors_open), null);
  assert.match(d.start_time.reasons.join(), /原文「開場・開演 18:00／18:30」/);
  const item = r.event.meta.review_items.find((x) => x.topic === '開場・開演の時刻');
  assert.ok(item && item.blocking && item.text === '開場・開演 18:00／18:30');
  // 対応するまで確定できない
  const ev = reviewAll(r.event);
  ev.meta.review_items.forEach((x) => { x.resolved = false; });
  assert.ok(gateChecks(ev).some((c) => c.id === 'review_items' && !c.ok));
});

test('発売日・電話受付時間を公演日時として拾わない（行をまたぐ発売の文も）', () => {
  const ev = run('09_paste_duo_layout').event;
  const dates = ev.schedule.dates.items.map((x) => v(x.date));
  assert.deepEqual(dates, ['2026-11-21']);
  assert.ok(!dates.includes('2026-09-13'));
});

test('発売時刻を販売方法ごとに保持する（同じ記載の重複はまとめる）', () => {
  const t = run('09_paste_duo_layout').event.tickets;
  assert.deepEqual(t.sales_schedule.items.map((x) => [v(x.method), v(x.date), v(x.time)]), [
    ['さくらプラザ先行電話予約', '2026-09-12', '14:00'],
    ['チケット引換・発売・さくらプラザ窓口・オンライン窓口・その他プレイガイド', '2026-09-13', '10:00'],
  ]);
  assert.equal(v(t.sales_start), '2026-09-13');
});

test('交通案内を上演時間、発売案内を曲目、別企画・手数料・会員登録を料金として拾わない', () => {
  const r = run('09_paste_duo_layout');
  const ev = r.event;
  assert.equal(v(ev.schedule.duration), null, '「約10分」は交通案内');
  assert.equal(ev.program.works.items.length, 0, 'PROGRAM欄の後の施設名・発売情報を曲目にしない');
  assert.match(v(ev.program.notes), /新作初演予定/);
  assert.deepEqual(ev.pricing.prices.items.map((p) => v(p.amount)), [3500, 3000, 2000, 1500]);
  assert.ok(r.event.meta.review_items.some((x) => x.topic === '料金らしき記載' && /500円/.test(x.text) && !x.blocking));
  assert.equal(v(ev.schedule.closed_days), null, '施設の休館日は公演情報にしない');
});

test('見出し「出演」がない書き方から出演者2名と楽器・欧文名・プロフィールを取り出す', () => {
  const ps = run('09_paste_duo_layout').event.performers.items;
  assert.deepEqual(ps.map((p) => [v(p.name), v(p.instrument), v(p.roman_name)]), [
    ['山田太郎', 'ピアノ', 'TARO YAMADA'],
    ['川村花子', 'サクソフォン', 'HANAKO KAWAMURA'],
  ]);
  assert.equal(v(ps[0].profile), '架空の音楽家。サンプル音楽大学作曲科卒業。\n国内外で演奏活動を行う。');
  assert.equal(v(ps[1].profile), '架空のサクソフォン奏者。サンプル市出身。', '標語の行を含めない');
  assert.ok(ps[0].name.reasons.some((x) => /字間の空白を詰めました/.test(x)));
  assert.ok(ps[1].name.reasons.some((x) => /表記が異なります/.test(x)));
  assert.ok(ps[0].instrument.reasons.some((x) => /Piano/.test(x)), '英語と日本語の2通りの表記を知らせる');
});

test('車椅子：会場の案内と、販売窓口の取扱制限を区別する', () => {
  const ev = run('09_paste_duo_layout').event;
  assert.equal(v(ev.accessibility.wheelchair), '車椅子席をお求めの際はチケットご予約の際にお知らせください。');
  const online = ev.tickets.ticket_channels.items.find((c) => v(c.name) === 'さくらプラザオンライン窓口');
  assert.match(v(online.notes), /車椅子席の取扱いはございません/);
  // 判断できない文は項目に入れず、要確認にする
  const amb = run('10_ambiguous').event;
  assert.equal(v(amb.accessibility.wheelchair), null);
  assert.ok(amb.meta.review_items.some((x) => x.topic === '車椅子に関する記載' && x.blocking));
});

test('チケット取扱をまとまりとして読む（電話・URL・注記・コード）', () => {
  const t = run('09_paste_duo_layout').event.tickets;
  assert.deepEqual(t.ticket_channels.items.map((c) => [v(c.name), v(c.phone), v(c.url), v(c.hours)]), [
    ['戸塚区民文化センターさくらプラザ', '045-000-0000', null, '9:00〜21:00'],
    ['さくらプラザオンライン窓口', null, 'https://example.jp/online.html', null],
    ['ローソンチケット', null, 'https://tickets.example.jp/order/?code=12345', null],
    ['架空チケット', '050-0000-0000', null, '平日10時〜17時'],
  ]);
  assert.ok(t.ticket_codes.items.some((k) => v(k.code) === 'Lコード 12345'));
});

test('主催の括弧書きの続き・「企画・制作」の区切り・サブタイトル候補', () => {
  const ev = run('09_paste_duo_layout').event;
  assert.equal(v(ev.organization.organizer), 'さくらプラザ(架空)(指定管理者 サンプル株式会社)');
  assert.equal(v(ev.organization.cooperation), 'サンプル食堂');
  assert.equal(v(ev.basic.subtitle), 'Taro Yamada+Hanako Kawamura');
  assert.equal(v(ev.genre), null, '標語「ジャズでつながる…」からジャンルを決めない');
});

test('すべての取り出した値に抽出根拠があり、確認済みにはしない。販売状況は未確認', () => {
  const ev = run('09_paste_duo_layout').event;
  walk(ev, (f) => {
    assert.equal(f.confirmed, false);
    if (f.origin === 'extracted' && f.value !== null) assert.ok(f.basis, `根拠がない：${f.value}`);
  });
  assert.equal(ev.status.code, 'unset');
  assert.ok(gateChecks(ev).some((c) => c.id === 'status' && !c.ok));
});

test('HP：出演者・販売方法別の発売日時・取扱先ごとの注記を出力し、販売状況を仮定しない', () => {
  const ev = run('09_paste_duo_layout').event;
  const draft = parse(generateHP(ev, { mode: 'page' }).html);
  assert.match(draft.querySelector('.ev-status-badge').textContent, /未確認/);
  const ev2 = reviewAll(normalizeEvent(JSON.parse(JSON.stringify(ev))), 'scheduled');
  assert.equal(canFinalize(ev2).ok, true, JSON.stringify(canFinalize(ev2).blockers));
  const doc = parse(generateHP(ev2, { mode: 'page' }).html);
  assert.equal(doc.querySelector('.ev-lead-performers').textContent, '出演：山田太郎（ピアノ）、川村花子（サクソフォン）');
  const sales = [...doc.querySelectorAll('.ev-sales-schedule li')].map((x) => x.textContent);
  assert.equal(sales[0], 'さくらプラザ先行電話予約：2026年9月12日（土） 14:00〜');
  assert.ok(doc.querySelector('.ev-sales-schedule time[datetime="2026-09-13T10:00+09:00"]'));
  assert.match(doc.querySelector('#ev-tickets').textContent, /車椅子席の取扱いはございません/);
  assert.match(generateText(ev2).text, /さくらプラザ先行電話予約：2026年9月12日（土） 14:00〜/);
});

test('SNS「公演のお知らせ」に出演者と発売日時を入れる（3媒体）', () => {
  const ev = reviewAll(run('09_paste_duo_layout').event, 'scheduled');
  const x = generateSns(ev, 'x', 'A', { pageUrl: 'https://example.jp/e.html' }).text;
  assert.match(x, /出演：山田太郎（ピアノ）、川村花子（サクソフォン）/);
  assert.match(x, /さくらプラザ先行電話予約 9\/12\(土\)14:00〜/);
  const fb = generateSns(ev, 'facebook', 'A').text;
  assert.match(fb, /■出演\n山田太郎（ピアノ）、川村花子（サクソフォン）/);
  assert.match(fb, /■発売\nさくらプラザ先行電話予約：9月12日（土） 14:00〜/);
  const ig = generateSns(ev, 'instagram', 'A').text;
  assert.match(ig, /🎵 出演：山田太郎（ピアノ）、川村花子（サクソフォン）/);
  assert.doesNotMatch(x + fb + ig, /発売中/);
});
