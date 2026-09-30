// ルールベース抽出：出典つきで取り出せること、推測で埋めないこと、確認済みにしないこと
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractEvent, findDates, findTimes, prepLine } from '../js/extract/rules.js';
import { classify } from '../js/core/classify.js';
import { rawFixture } from './helpers.mjs';

const REF = { referenceDate: '2026-04-01', now: '2026-04-01T00:00:00+09:00' };
const run = (name) => extractEvent(rawFixture(name), REF).event;

function walkFields(obj, fn) {
  if (obj && typeof obj === 'object') {
    if ('value' in obj && 'confirmed' in obj) return fn(obj);
    for (const v of Object.values(obj)) walkFields(v, fn);
  }
}

test('日付の表記ゆれ（全角・和暦・スラッシュ・丸付き曜日）', () => {
  const d = (s) => findDates(prepLine(s)).map((x) => [x.year, x.month, x.day, x.weekday]);
  assert.deepEqual(d('２０２６年７月４日（土）'), [[2026, 7, 4, '土']]);
  assert.deepEqual(d('2026.7.4 [土]'), [[2026, 7, 4, '土']]);
  assert.deepEqual(d('7/4（土）'), [[null, 7, 4, '土']]);
  assert.deepEqual(d('7月4日㈯'), [[null, 7, 4, '土']]);
  assert.deepEqual(d('令和8年7月4日(土)'), [[2026, 7, 4, '土']]);
  assert.deepEqual(d('10月12日（月・祝）'), [[null, 10, 12, '月']]);
  // 誤検出しない
  assert.deepEqual(d('約1.5倍'), []);
  assert.deepEqual(d('TEL 045-000-0000'), []);
});

test('開場・開演の向き（前置・後置・括弧）', () => {
  const t = (s) => findTimes(prepLine(s)).map((x) => [x.kind, x.time]);
  assert.deepEqual(t('13:30開場 14:00開演'), [['doors_open', '13:30'], ['start_time', '14:00']]);
  assert.deepEqual(t('開場13:30／開演14:00'), [['doors_open', '13:30'], ['start_time', '14:00']]);
  assert.deepEqual(t('14:00開演（13:30開場）'), [['start_time', '14:00'], ['doors_open', '13:30']]);
  assert.deepEqual(t('午後2時開演'), [['start_time', '14:00']]);
  assert.deepEqual(t('10:00〜12:00'), [['start_time', '10:00'], ['end_time', '12:00']]);
  assert.deepEqual(t('上演時間 約3時間'), []);
});

test('1. 通常クラシック：主要項目を出典つきで取り出す', () => {
  const ev = run('01_classic');
  assert.equal(ev.event_type.value, 'performance');
  const d = ev.schedule.dates.items;
  assert.equal(d.length, 1);
  assert.equal(d[0].date.value, '2026-07-04');
  assert.equal(d[0].weekday_on_flyer.value, '土');
  assert.equal(d[0].doors_open.value, '13:30');
  assert.equal(d[0].start_time.value, '14:00');
  assert.equal(d[0].date.source_page, 1);
  assert.match(d[0].date.source_text, /2026年７月４日/, '元の表記（全角のまま）を保持');
  assert.equal(ev.venue.room.value, 'ホール');
  assert.deepEqual(ev.pricing.prices.items.map((p) => [p.category.value, p.amount.value]), [['一般', 3000], ['学生', 1500]]);
  assert.equal(ev.pricing.seating_type.value, '全席指定');
  assert.equal(ev.pricing.age_requirement.value, '未就学児のご入場はご遠慮ください');
  assert.equal(ev.tickets.sales_start.value, '2026-05-09');
  assert.equal(ev.organization.phone.value, '045-000-0000');
  assert.equal(ev.organization.organizer.value, 'さくらプラザ(架空)');
  assert.equal(ev.performers.items[0].name.value, '春風ことね');
  assert.equal(ev.performers.items[0].instrument.value, 'ピアノ');
  assert.equal(ev.performers.items[0].roman_name.value, 'Kotone Harukaze');
  assert.equal(ev.program.works.items.length, 3);
  assert.equal(ev.program.works.items[1].composer.value, 'ドビュッシー');
  assert.equal(ev.tickets.ticket_codes.items[0].code.value, 'Pコード 123-456');
});

test('抽出器は値を確認済みにしない・出典と確信度を付ける', () => {
  for (const name of ['01_classic', '03_family', '04_workshop', '06_exhibition', '07_recruit', '08_openday']) {
    const ev = run(name);
    walkFields(ev, (f) => {
      assert.equal(f.confirmed, false, `${name}: confirmed になっている値がある`);
      if (f.origin === 'extracted' && f.value !== null) {
        assert.ok(f.source_text, `${name}: source_text がない（${f.value}）`);
        assert.equal(typeof f.confidence, 'number');
      }
    });
  }
});

test('チラシにない項目は空のまま（推測で埋めない）', () => {
  const ev = run('01_classic');
  assert.equal(ev.basic.catchphrase.value, null);
  assert.equal(ev.schedule.dates.items[0].end_time.value, null);
  assert.equal(ev.accessibility.wheelchair.value, null);
  assert.equal(ev.organization.email.value, null);
  assert.equal(ev.participation.capacity.value, null);
});

test('3. 0歳から・2回公演：回ごとに分け、膝上鑑賞・年齢を取り出す', () => {
  const ev = run('03_family');
  assert.equal(ev.event_type.value, 'family_performance');
  const d = ev.schedule.dates.items;
  assert.equal(d.length, 2);
  assert.deepEqual(d.map((x) => [x.session_label.value, x.doors_open.value, x.start_time.value]), [['①', '10:30', '11:00'], ['②', '13:30', '14:00']]);
  assert.match(ev.pricing.lap_seating.value, /膝上鑑賞無料/);
  assert.match(ev.pricing.age_requirement.value, /0歳から/);
  assert.equal(ev.pricing.prices.items[1].category.value, 'こども(3歳〜高校生)');
  assert.ok(ev.accessibility.stroller.value);
  assert.deepEqual(ev.performers.items.map((p) => [p.name.value, p.instrument.value]).slice(1), [['鈴木みどり', 'うた'], ['佐藤たろう', 'ピアノ']]);
});

test('4. ワークショップ：対象・定員・申込期間・持ち物、年の推定を記録', () => {
  const r = extractEvent(rawFixture('04_workshop'), REF);
  const ev = r.event;
  assert.equal(ev.event_type.value, 'workshop');
  assert.equal(ev.schedule.dates.items[0].date.value, '2026-07-25');
  assert.equal(ev.schedule.dates.items[0].date.origin, 'inferred', '年がないので推定扱い');
  assert.ok(ev.schedule.dates.items[0].date.confidence < 0.9, '推定した日付は要確認（低確信度）');
  assert.ok(r.warnings.some((w) => /推定/.test(w)));
  assert.equal(ev.participation.target_age.value, '小学1年生〜6年生');
  assert.equal(ev.participation.application_start.value, '2026-06-01');
  assert.equal(ev.participation.application_deadline.value, '2026-06-20');
  assert.equal(ev.participation.belongings.value, '水筒、タオル');
  assert.equal(ev.participation.application_url.value, 'https://example.jp/ws-form');
  assert.equal(ev.performers.items[0].role.value, '講師');
});

test('展示：会期を期間として取り出し、日程は作らない', () => {
  const ev = run('06_exhibition');
  assert.equal(ev.event_type.value, 'exhibition');
  assert.equal(ev.schedule.dates.items.length, 0);
  assert.equal(ev.schedule.start_date.value, '2026-10-03');
  assert.equal(ev.schedule.end_date.value, '2026-10-12');
  assert.equal(ev.pricing.prices.items[0].amount.value, 0);
  assert.equal(ev.organization.co_organizer.value, 'さくらプラザ(架空)');
});

test('7. 参加者募集：応募期間・資格', () => {
  const ev = run('07_recruit');
  assert.equal(ev.event_type.value, 'recruitment');
  assert.equal(ev.participation.application_start.value, '2026-08-01');
  assert.equal(ev.participation.application_deadline.value, '2026-08-31');
  assert.match(ev.participation.eligibility.value, /中学生以上/);
  assert.equal(ev.tickets.ticket_channels.items.length, 0, '申込方法の「窓口」をチケット取扱と誤認しない');
});

test('8. オープンデー：小イベントを取り出す', () => {
  const ev = run('08_openday');
  assert.equal(ev.event_type.value, 'multi_event');
  assert.equal(ev.schedule.dates.items.length, 1);
  const s = ev.sub_events.items;
  assert.equal(s.length, 3);
  assert.equal(s[0].title.value, 'バックステージ見学ツアー');
  assert.equal(s[0].application.value, '要申込');
  assert.equal(s[1].place.value, 'ホール');
});

test('文字が取れない場合は警告を返す', () => {
  const r = extractEvent({ files: [{ name: 'flyer.jpg', pages: [{ page: 1, text: '' }] }] }, REF);
  assert.ok(r.warnings[0].includes('文字を取り出せませんでした'));
});

test('種別推定', () => {
  assert.equal(classify('0歳から入場できる親子コンサート 膝上').type, 'family_performance');
  assert.equal(classify('オープンデー 見学ツアー 同時開催').type, 'multi_event');
  assert.equal(classify('講座 全3回 受講料').type, 'lecture');
  assert.equal(classify('').confidence, 0.2);
});
