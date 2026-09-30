// プロフィールの原文照合・掲載しない判断・未確認の文章をHP/SNSに出さないこと、販売状況の初期値のテスト（架空データ）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractEvent } from '../js/extract/rules.js';
import { canFinalize, gateChecks } from '../js/core/validate.js';
import { confirmField, setValue } from '../js/core/field.js';
import { normalizeEvent } from '../js/core/schema.js';
import { generateHP } from '../js/generate/hp.js';
import { generateText } from '../js/generate/text.js';
import { generateAllSns } from '../js/generate/sns.js';
import { rawFixture } from './helpers.mjs';

const REF = { referenceDate: '2026-04-01', now: '2026-04-01T00:00:00+09:00' };
const NOW = '2026-04-02T00:00:00+09:00';
const v = (f) => f?.value ?? null;
const PROF_A = '架空の音楽家。サンプル音楽大学作曲科卒業。';

function walk(o, fn, path = '') {
  if (o && typeof o === 'object') {
    if ('value' in o && 'confirmed' in o) return fn(o, path);
    Object.entries(o).forEach(([k, x]) => walk(x, fn, path ? `${path}.${k}` : k));
  }
}
/** プロフィール以外をすべて確認し、販売状況を設定し、判断が必要な記載に対応した状態 */
function reviewAllButProfiles(status = 'on_sale') {
  const ev = extractEvent(rawFixture('09_paste_duo_layout'), REF).event;
  walk(ev, (f, p) => { if (!/\.profile$/.test(p)) confirmField(f, true, NOW); });
  ev.status.code = status;
  ev.meta.review_items.forEach((r) => { r.resolved = true; });
  return ev;
}
const allOutputs = (ev, draft) => [
  generateHP(ev, { draft }).html, generateText(ev, { draft }).text,
  ...generateAllSns(ev, { draft }).map((s) => s.text),
].join('\n');

test('抽出したプロフィールは2名分あり、確認済みではない（掲載の判断も未選択）', () => {
  const ev = extractEvent(rawFixture('09_paste_duo_layout'), REF).event;
  const ps = ev.performers.items;
  assert.equal(ps.length, 2);
  assert.ok(ps.every((p) => v(p.profile) && p.profile.confirmed === false && v(p.profile_use) === null));
});

test('プロフィールを照合していないと、ほかをすべて確認しても確定できない', () => {
  const ev = reviewAllButProfiles();
  const g = gateChecks(ev).find((c) => c.id === 'profiles');
  assert.equal(g.ok, false);
  assert.match(g.message, /2名分/);
  assert.equal(canFinalize(ev).ok, false);
});

test('照合して確認済み、または担当者が「掲載しない」を選べば確定できる', () => {
  const ev = reviewAllButProfiles();
  const [a, b] = ev.performers.items;
  confirmField(a.profile, true, NOW);
  setValue(b.profile_use, 'exclude');
  confirmField(b.profile_use, true, NOW);
  const g = gateChecks(ev).find((c) => c.id === 'profiles');
  assert.equal(g.ok, true, g.message);
  assert.match(g.message, /掲載1名・掲載しない1名/);
  assert.equal(canFinalize(ev).ok, true, JSON.stringify(canFinalize(ev).blockers));
});

test('確定版：照合したプロフィールだけが出て、掲載しないプロフィールはHP・テキスト・SNSのどれにも出ない', () => {
  const ev = reviewAllButProfiles();
  const [a, b] = ev.performers.items;
  confirmField(a.profile, true, NOW);
  setValue(b.profile_use, 'exclude');
  const out = allOutputs(ev, false);
  assert.ok(out.includes('サンプル音楽大学作曲科卒業'));
  assert.ok(!out.includes('サクソフォン奏者。サンプル市出身'), '掲載しないプロフィールが出力に含まれています');
  // 元の event.json の値は消さない（担当者の判断の記録として残す）
  assert.ok(v(b.profile).includes('サンプル市出身'));
});

test('確認後にプロフィールを直すと確認済みが外れ、再び照合するまで確定できない', () => {
  const ev = reviewAllButProfiles();
  ev.performers.items.forEach((p) => confirmField(p.profile, true, NOW));
  assert.equal(canFinalize(ev).ok, true);
  setValue(ev.performers.items[0].profile, `${PROF_A}国内外で演奏活動を行う（修正）。`);
  assert.equal(ev.performers.items[0].profile.confirmed, false);
  assert.equal(canFinalize(ev).ok, false);
});

test('下書き：未確認のプロフィールはSNSに出さない。HPの下書きには［要確認］と下書き表示つきで出る', () => {
  const ev = reviewAllButProfiles();
  const sns = generateAllSns(ev, { draft: true }).map((s) => s.text).join('\n');
  assert.ok(!sns.includes('サンプル音楽大学作曲科卒業'));
  assert.ok(!sns.includes('サクソフォン奏者'));
  const hp = generateHP(ev, { draft: true });
  assert.equal(hp.draft, true);
  assert.match(hp.html, /下書き/);
  assert.match(hp.html, /サンプル音楽大学作曲科卒業。<\/p>(?:<p>[^<]*<\/p>)*<p><strong class="ev-review">［要確認］/);
});

test('楽器・役割、チケット取扱、主催、サブタイトル、紹介文なども、値があれば確認するまで確定できない', () => {
  for (const [id, path] of [
    ['performer_details', (ev) => ev.performers.items[0].instrument],
    ['channels', (ev) => ev.tickets.ticket_channels.items[0].name],
    ['organizers', (ev) => ev.organization.organizer],
    ['subtitle', (ev) => ev.basic.subtitle],
    ['others', (ev) => ev.basic.description],
  ]) {
    const ev = reviewAllButProfiles();
    ev.performers.items.forEach((p) => confirmField(p.profile, true, NOW));
    const f = path(ev);
    assert.ok(v(f), `${id} の値がありません`);
    confirmField(f, false);
    assert.equal(gateChecks(ev).find((c) => c.id === id).ok, false, id);
    assert.equal(canFinalize(ev).ok, false, id);
  }
});

test('販売状況：抽出直後は「未確認」。開催日・発売日から「発売中」にしない（発売日を過ぎていても）', () => {
  const ev = extractEvent(rawFixture('09_paste_duo_layout'), { referenceDate: '2026-10-01', now: '2026-10-01T00:00:00+09:00' }).event;
  assert.equal(ev.status.code, 'unset');
  const g = gateChecks(ev).find((c) => c.id === 'status');
  assert.equal(g.ok, false);
  assert.equal(g.message, '未確認');
  const out = allOutputs(ev, true);
  assert.ok(!/発売中|販売中/.test(out), '未確認なのに発売中・販売中と出ています');
  assert.match(generateHP(ev, { draft: true }).html, /販売・受付状況は未確認です/);
});

test('販売状況：「完売」の表記があっても自動では設定しない（候補の案内だけ）', () => {
  const raw = { files: [{ name: 'fake.txt', type: 'text/plain', pages: [{ page: 1, text: '架空の演奏会\n2026年5月10日（日）14:00開演\n一般 3,000円（完売）' }] }] };
  const r = extractEvent(raw, REF);
  assert.equal(r.event.status.code, 'unset');
  assert.ok(r.suggestions.some((s) => s.status === 'sold_out'));
});

test('販売状況：保存した event.json に状況がない・不正な値のときは「未確認」に戻す', () => {
  assert.equal(normalizeEvent({ basic: { title: '架空' } }).status.code, 'unset');
  assert.equal(normalizeEvent({ status: { code: 'selling' } }).status.code, 'unset');
});
