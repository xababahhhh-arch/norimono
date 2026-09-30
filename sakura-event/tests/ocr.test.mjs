// OCR（ブラウザ内）まわりの回帰テスト。入力はすべて架空の内容。
// Tesseract・PDF.js 自体は動かさず、OCR の結果の形（行・位置・信頼度）を模したデータで検証する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tidyOcrText, similarity, ocrOnlyLines, linesForExtraction, defaultMode, hasUsableText, ocrResultToLines,
} from '../js/extract/pagetext.js';
import { sha256Hex, sourceRecord, sameSources } from '../js/core/hash.js';
import { extractEvent, flattenRaw } from '../js/extract/rules.js';
import { gateChecks } from '../js/core/validate.js';
import { confirmField, methodLabel } from '../js/core/field.js';

const REF = { referenceDate: '2026-04-01', now: '2026-04-01T00:00:00+09:00' };
const v = (f) => f?.value ?? null;

/** 架空のOCR行（上から順に並べ、位置を付ける） */
function ocrPage(texts, { page = 1, method = 'ocr', gapAfter = [] } = {}) {
  let y = 0.05;
  const lines = texts.map((text, i) => {
    const ln = { text, size: 0.012, conf: 85, lowWords: [], method, bbox: { x0: 0.1, x1: 0.8, y0: y, y1: y + 0.012 } };
    y += gapAfter.includes(i) ? 0.06 : 0.016;
    return ln;
  });
  return { page, text: texts.join('\n'), lines };
}
const rawOf = (...pages) => ({ files: [{ name: 'fake_flyer.pdf', type: 'application/pdf', pages }] });

test('OCR の日本語の文字の間の空白だけを除く（英数字の間は残す）', () => {
  assert.equal(tidyOcrText('架 空 の 演 奏 会'), '架空の演奏会');
  assert.equal(tidyOcrText('Taro  Kaku ピ ア ノ'), 'Taro Kaku ピアノ');
  assert.equal(tidyOcrText('全 席 指 定 3,000 円'), '全席指定 3,000 円');
});

test('PDF の文字と OCR を無条件に連結しない（merge は OCR にしかない行だけ足す）', () => {
  const pdfLines = [{ text: '架空アンサンブル演奏会', bbox: { y0: 0.1 } }, { text: '2026年5月10日（日）14:00開演', bbox: { y0: 0.3 } }];
  const ocrLines = [
    { text: '架空アンサンブル演奏会', bbox: { y0: 0.1 } },
    { text: '2026年5月10日（日）14:00開演', bbox: { y0: 0.3 } },
    { text: '主催：架空文化協会', bbox: { y0: 0.9 } },
  ];
  assert.deepEqual(ocrOnlyLines(pdfLines, ocrLines).map((l) => l.text), ['主催：架空文化協会']);
  const page = { pdfLines, ocrLines };
  assert.equal(linesForExtraction({ ...page, mode: 'pdf' }).length, 2);
  assert.equal(linesForExtraction({ ...page, mode: 'ocr' }).length, 3);
  const merged = linesForExtraction({ ...page, mode: 'merge' });
  assert.deepEqual(merged.map((l) => [l.text, l.method]), [
    ['架空アンサンブル演奏会', 'pdf_text'], ['2026年5月10日（日）14:00開演', 'pdf_text'], ['主催：架空文化協会', 'ocr'],
  ]);
  // OCR の誤読が少し混じった同じ行も重複とみなす
  assert.ok(similarity('架空アンサンブル演奏会', '架空アンサンプル演奏会') >= 0.75);
});

test('文字のないページ（アウトライン化）は OCR を既定にする', () => {
  assert.equal(defaultMode({ pdfLines: [] }), 'ocr');
  assert.equal(defaultMode({ pdfLines: [{ text: 'ア' }] }), 'ocr');
  const many = [{ text: '架空の演奏会のご案内。2026年5月10日（日）14:00開演、会場は架空ホールです。' }];
  assert.equal(hasUsableText(many), true);
  assert.equal(defaultMode({ pdfLines: many }), 'pdf');
});

test('Tesseract の結果を位置（0〜1）付きの行にし、信頼度の低い語を残す', () => {
  const data = { blocks: [{ paragraphs: [{ lines: [
    { text: '架 空 ホ ー ル\n', confidence: 91.2, bbox: { x0: 100, y0: 200, x1: 500, y1: 240 }, words: [{ text: '架空', confidence: 95 }, { text: 'ホール', confidence: 40 }] },
    { text: '● ', confidence: 20, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }, words: [] },
  ] }] }] };
  const lines = ocrResultToLines(data, 1000, 2000);
  assert.equal(lines.length, 1); // 記号だけの行は捨てる
  assert.equal(lines[0].text, '架空ホール');
  assert.deepEqual(lines[0].bbox, { x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.12 });
  assert.deepEqual(lines[0].lowWords, ['ホール']);
  assert.equal(lines[0].conf, 91);
});

test('SHA-256：同じ内容は同じ値、資料の組は名前・順番に関係なく比べる', async () => {
  const a = await sha256Hex(new TextEncoder().encode('架空のチラシ'));
  const b = await sha256Hex(new TextEncoder().encode('架空のチラシ'));
  const c = await sha256Hex(new TextEncoder().encode('架空のチラシ（差し替え）'));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, b);
  assert.notEqual(a, c);
  const r1 = sourceRecord({ name: 'omote.pdf', sha256: a, importedAt: '2026-04-01T10:00:00+09:00' });
  const r2 = sourceRecord({ name: '別名.pdf', sha256: a, importedAt: '2026-04-02T10:00:00+09:00' });
  const r3 = sourceRecord({ name: 'omote.pdf', sha256: c, importedAt: '2026-04-01T10:00:00+09:00' });
  assert.equal(sameSources([r1], [r2]), true);
  assert.equal(sameSources([r1], [r3]), false);
  assert.equal(sameSources([], []), false); // 記録がなければ「同じ」とはしない
  assert.equal('latest' in r1 || 'approved' in r1, false); // 最新版・承認済みの印は付けない
});

test('OCR で取った項目は取得方法・位置を持ち、照合を求める理由が付く（確認済みにはしない）', () => {
  const raw = rawOf(ocrPage([
    '架空室内楽の夕べ',
    '2026年5月10日（日）14:00開演（13:30開場）',
    '会場：架空市民ホール',
    '全席指定 一般3,000円',
  ]));
  const { event } = extractEvent(raw, REF);
  assert.equal(v(event.basic.title), '架空室内楽の夕べ');
  const d = event.schedule.dates.items[0];
  assert.equal(v(d.date), '2026-05-10');
  assert.equal(v(d.start_time), '14:00');
  assert.equal(v(d.doors_open), '13:30');
  for (const f of [event.basic.title, d.date, d.start_time]) {
    assert.equal(f.source_method, 'ocr');
    assert.equal(f.confirmed, false);
    assert.ok(f.source_bbox && f.source_bbox.y0 >= 0 && f.source_bbox.y1 <= 1);
    assert.ok(f.reasons.some((r) => /OCR/.test(r)));
    assert.equal(methodLabel(f), 'OCRで取得');
  }
  const p = event.pricing.prices.items[0];
  assert.equal(v(p.amount), 3000);
  assert.equal(p.amount.source_method, 'ocr');
});

test('PDF の文字から取った項目と、担当者が修正した項目を区別する', () => {
  const raw = rawOf(ocrPage(['架空室内楽の夕べ', '2026年5月10日（日）14:00開演'], { method: 'pdf_text' }));
  const { event } = extractEvent(raw, REF);
  assert.equal(methodLabel(event.basic.title), 'PDFの文字から取得');
  assert.equal(event.basic.title.reasons.some((r) => /OCR/.test(r)), false);
});

test('OCR の「2.500円」は料金に入れず、要確認（確定を止める）にする', () => {
  const raw = rawOf(ocrPage(['架空室内楽の夕べ', '2026年5月10日（日）14:00開演', '全席指定 一般2.500円 学生1.000円']));
  const { event } = extractEvent(raw, REF);
  assert.equal(event.pricing.prices.items.length, 0);
  const r = event.meta.review_items.find((x) => x.topic === '金額の読み取り');
  assert.ok(r);
  assert.equal(r.blocking, true);
  assert.equal(r.method, 'ocr');
  assert.ok(r.bbox);
});

test('OCR で曜日が読めない（枠囲みの誤読）ときは曜日を推測せず理由を付ける', () => {
  const raw = rawOf(ocrPage(['架空室内楽の夕べ', '2026年5月10日回14:00開演']));
  const d = extractEvent(raw, REF).event.schedule.dates.items[0];
  assert.equal(v(d.date), '2026-05-10');
  assert.equal(v(d.weekday_on_flyer), null);
  assert.ok(d.weekday_on_flyer.reasons.some((x) => /曜日/.test(x)));
});

test('日付らしいが読み取れない OCR 行は要確認に回す（電話番号は除く）', () => {
  const raw = rawOf(ocrPage(['架空室内楽の夕べ', '2026年5月1O日（日）14:00開演', 'TEL 045-000-0000']));
  const { event } = extractEvent(raw, REF);
  const items = event.meta.review_items.filter((x) => x.topic === '日付の読み取り');
  assert.equal(items.length, 1);
  assert.match(items[0].text, /1O日/);
});

test('位置情報の大きな行間は区切り（空行）として扱う', () => {
  const lines = flattenRaw(rawOf(ocrPage(['見出しA', '本文A', '見出しB'], { gapAfter: [1] })));
  assert.deepEqual(lines.map((l) => l.blankBefore), [true, false, true]);
});

test('確定ゲート：版の確認と、資料の不一致', () => {
  const raw = rawOf(ocrPage(['架空室内楽の夕べ', '2026年5月10日（日）14:00開演', 'お問い合わせ 架空文化協会 045-000-0000']));
  const { event } = extractEvent(raw, REF);
  event.meta.source_files = [sourceRecord({ name: 'fake_flyer.pdf', sha256: 'a'.repeat(64), importedAt: REF.now })];
  let g = gateChecks(event);
  assert.equal(g.find((c) => c.id === 'source_version').ok, false);
  event.meta.source_review = { confirmed: true };
  g = gateChecks(event);
  assert.equal(g.find((c) => c.id === 'source_version').ok, true);
  event.meta.source_mismatch = true;
  assert.equal(gateChecks(event).find((c) => c.id === 'source_mismatch').ok, false);
});

test('確定ゲート：問い合わせ先は値があれば確認必須', () => {
  const raw = rawOf(ocrPage(['架空室内楽の夕べ', '2026年5月10日（日）14:00開演', 'お問い合わせ 架空文化協会 045-000-0000']));
  const { event } = extractEvent(raw, REF);
  const c = event.organization.contact;
  if (c?.value) {
    assert.equal(gateChecks(event).find((x) => x.id === 'contact').ok, false);
    confirmField(c, true, REF.now);
    assert.equal(gateChecks(event).find((x) => x.id === 'contact').ok, true);
  } else {
    assert.equal(gateChecks(event).find((x) => x.id === 'contact').na, true);
  }
});

test('SHA-256：安全でない接続（crypto.subtle がない）でも同じ値を自前の計算で求める', async () => {
  const { sha256Bytes } = await import('../js/core/hash.js');
  const { createHash } = await import('node:crypto');
  for (const n of [0, 1, 55, 56, 63, 64, 65, 1000, 70000]) {
    const data = new Uint8Array(n).map((_, i) => (i * 31 + n) & 255);
    const hex = Buffer.from(sha256Bytes(data)).toString('hex');
    assert.equal(hex, createHash('sha256').update(data).digest('hex'), `長さ ${n}`);
  }
});
