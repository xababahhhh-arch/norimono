// 曜日照合・形式チェック・確定ゲート
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekdayCheck, gateChecks, canFinalize, formatIssues } from '../js/core/validate.js';
import { weekdayOf } from '../js/core/dates.js';
import { field, setValue, confirmField, reviewState } from '../js/core/field.js';
import { createEmptyEvent, normalizeEvent } from '../js/core/schema.js';
import { extractEvent } from '../js/extract/rules.js';
import { loadFixture, rawFixture, fixtureNames } from './helpers.mjs';

test('曜日の計算', () => {
  assert.equal(weekdayOf('2026-07-04'), '土');
  assert.equal(weekdayOf('2026-11-03'), '火');
  assert.equal(weekdayOf('2024-02-29'), '木');
  assert.equal(weekdayOf('2026-02-30'), null);
});

test('曜日照合：一致／不一致／表記なし', () => {
  const item = (date, wd) => ({ date: field(date), weekday_on_flyer: field(wd) });
  assert.equal(weekdayCheck(item('2026-07-04', '土')).status, 'ok');
  assert.equal(weekdayCheck(item('2026-07-04', '土・祝')).status, 'ok');
  const bad = weekdayCheck(item('2026-07-04', '金'));
  assert.equal(bad.status, 'mismatch');
  assert.equal(bad.message, 'エラー：曜日が一致しません（チラシ：金／日付から計算：土）', '色ではなく文字で示す');
  assert.match(bad.suggestion, /土曜日です/);
  assert.equal(weekdayCheck(item('2026-07-04', null)).status, 'no_flyer_weekday');
  assert.equal(weekdayCheck(item('2026-13-01', '土')).status, 'invalid_date');
});

test('曜日が一致しないと確定できない', () => {
  const ev = loadFixture('01_classic_recital');
  ev.schedule.dates.items[0].weekday_on_flyer = field('金', { confirmed: true });
  const r = canFinalize(ev);
  assert.equal(r.ok, false);
  assert.ok(r.blockers.some((b) => b.message.startsWith('エラー：曜日が一致しません')));
});

test('抽出直後（未確認）は確定できない', () => {
  const ev = extractEvent(rawFixture('01_classic'), { referenceDate: '2026-04-01' }).event;
  const r = canFinalize(ev);
  assert.equal(r.ok, false);
  const labels = r.gate.filter((c) => !c.ok).map((c) => c.label);
  for (const l of ['タイトル', '開催日', '曜日', '開場', '開演・開始', '会場', '出演者', '料金', '年齢制限', 'チケット発売情報', '電話番号']) {
    assert.ok(labels.includes(l), `${l} が未確認として挙がっていない`);
  }
});

test('必須項目を1つずつ確認すると確定できる', () => {
  const ev = extractEvent(rawFixture('01_classic'), { referenceDate: '2026-04-01' }).event;
  const confirmAll = (o) => {
    if (o && typeof o === 'object') {
      if ('value' in o && 'confirmed' in o) { confirmField(o); return; }
      Object.values(o).forEach(confirmAll);
    }
  };
  confirmAll(ev);
  assert.equal(canFinalize(ev).ok, true, JSON.stringify(canFinalize(ev).blockers));
});

test('確認後に値を変えると「要確認」に戻る', () => {
  const f = field('2026-07-04', { confirmed: true });
  assert.equal(reviewState(f), 'confirmed');
  setValue(f, '2026-07-05');
  assert.equal(reviewState(f), 'needs_review');
  assert.equal(f.origin, 'manual');
  setValue(f, '');
  assert.equal(reviewState(f), 'missing');
  confirmField(f);
  assert.equal(reviewState(f), 'confirmed_empty');
});

test('空のタイトル・会場は「該当なし」で確認できない', () => {
  const ev = loadFixture('01_classic_recital');
  ev.basic.title = field(null, { confirmed: true });
  ev.venue.venue = field('', { confirmed: true });
  const g = gateChecks(ev);
  assert.equal(g.find((c) => c.id === 'title').ok, false);
  assert.equal(g.find((c) => c.id === 'venue').ok, false);
});

test('外部URLは確認済み・https のみ', () => {
  const ev = loadFixture('01_classic_recital');
  ev.links.items[0].url = field('javascript:alert(1)', { confirmed: true });
  assert.equal(gateChecks(ev).find((c) => c.id === 'urls').ok, false);
  ev.links.items[0].url = field('https://example.jp/', { confirmed: false });
  assert.equal(gateChecks(ev).find((c) => c.id === 'urls').ok, false);
});

test('形式チェック：電話・時刻・開場と開演の前後', () => {
  const ev = loadFixture('01_classic_recital');
  ev.organization.phone = field('0450000000', { confirmed: true });
  ev.schedule.dates.items[0].doors_open = field('14:30', { confirmed: true });
  const msgs = formatIssues(ev).map((i) => i.message);
  assert.ok(msgs.some((m) => m.includes('電話番号の形式ではありません')));
  assert.ok(msgs.some((m) => m.includes('開場（14:30）が開演（14:00）より後')));
});

test('種別に関係のない項目は「該当なし」扱い（WSの開場・発売日）', () => {
  const ev = loadFixture('04_workshop');
  const g = gateChecks(ev);
  assert.equal(g.find((c) => c.id === 'doors_open0').na, true);
  assert.equal(g.find((c) => c.id === 'sales').label, '申込情報（方法・開始日）');
});

test('すべての fixture は確認済みとして確定できる', () => {
  for (const n of fixtureNames()) {
    const r = canFinalize(loadFixture(n));
    assert.equal(r.ok, true, `${n}: ${JSON.stringify(r.blockers)}`);
  }
});

test('読み込み時は既定で確認済みにしない', () => {
  const ev = normalizeEvent({ basic: { title: 'X' } });
  assert.equal(ev.basic.title.confirmed, false);
  assert.equal(createEmptyEvent().event_type.value, 'performance');
});
