// 出典つきの値（Field）と、繰り返し項目（List）の基本操作。
// DOM に依存しない（Node.js でもテストできる）。

export function field(value = null, src = {}) {
  return {
    value: value === undefined ? null : value,
    source_file: src.file ?? src.source_file ?? null,
    source_page: src.page ?? src.source_page ?? null,
    source_text: src.text ?? src.source_text ?? null,
    // 取得方法：pdf_text（PDFの文字）/ ocr（OCR）/ paste（貼り付けた文字）/ mixed。担当者が直した値は origin が manual
    source_method: src.method ?? src.source_method ?? null,
    // 取得元のページ上の位置（0〜1。上が 0）。プレビューで強調表示に使う
    source_bbox: src.bbox ?? src.source_bbox ?? null,
    confidence: src.confidence ?? null,
    origin: src.origin ?? (isEmpty(value) ? null : 'manual'),
    confirmed: src.confirmed ?? false,
    confirmed_at: src.confirmed_at ?? null,
    note: src.note ?? '',
    // 抽出根拠（どの書き方・どの見出しから取り出したか）と、確認が必要な理由。
    // 確信度（confidence）は内部の優先順位にだけ使い、正しさの保証として表示しない。
    basis: src.basis ?? '',
    reasons: Array.isArray(src.reasons) ? [...src.reasons] : [],
  };
}

/** 確認が必要な理由を追加する（重複は追加しない） */
export function addReason(f, reason) {
  if (!isField(f) || !reason) return;
  if (!Array.isArray(f.reasons)) f.reasons = [];
  if (!f.reasons.includes(reason)) f.reasons.push(reason);
}

export function list(items = []) {
  return { items, none_confirmed: false };
}

export function isField(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x) && 'value' in x && 'confirmed' in x;
}

export function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Field でも素の値でも値を返す。 */
export function val(f) {
  if (isField(f)) return f.value;
  return f ?? null;
}

/** 値があるか（空文字・null は false。0 と false は true）。 */
export function has(f) {
  return !isEmpty(val(f));
}

/** 文字列として取り出す（空なら ''）。 */
export function str(f) {
  const v = val(f);
  return isEmpty(v) ? '' : String(v).trim();
}

/** 確認状態：confirmed / confirmed_empty / needs_review / missing */
export function reviewState(f) {
  if (!isField(f)) return has(f) ? 'needs_review' : 'missing';
  if (f.confirmed) return has(f) ? 'confirmed' : 'confirmed_empty';
  return has(f) ? 'needs_review' : 'missing';
}

export const REVIEW_LABELS = {
  confirmed: { mark: '✓', label: '確認済み' },
  confirmed_empty: { mark: '✓', label: '確認済み（該当なし）' },
  needs_review: { mark: '！', label: '要確認' },
  missing: { mark: '－', label: '情報なし' },
};

export const LOW_CONFIDENCE = 0.9;

/** 取得方法の表示（担当者が修正した値を区別する） */
export function methodLabel(f) {
  if (!isField(f)) return '';
  if (f.origin === 'manual') return has(f) ? '担当者が入力・修正' : '';
  return { pdf_text: 'PDFの文字から取得', ocr: 'OCRで取得', paste: '貼り付けた文字から取得', mixed: 'PDFの文字とOCRから取得' }[f.source_method] ?? '';
}

/** @deprecated 確信度の数値で「低い」と表示しない方針（REAL_DATA_TEST_UNPLUGGED.md）。互換のため残す。 */
export function isLowConfidence(f) {
  return isField(f) && has(f) && typeof f.confidence === 'number' && f.confidence < LOW_CONFIDENCE && !f.confirmed;
}

/** 人が値を変更する。値が変わったら確認済みを取り消す。 */
export function setValue(f, value, now = new Date().toISOString()) {
  const v = typeof value === 'string' ? value : value;
  if (sameValue(f.value, v)) return false;
  f.value = v;
  f.origin = 'manual';
  f.confidence = 1;
  f.confirmed = false;
  f.confirmed_at = null;
  f.basis = '担当者が入力・修正した値';
  f.reasons = [];
  f._edited_at = now;
  return true;
}

export function confirmField(f, confirmed = true, now = new Date().toISOString()) {
  f.confirmed = confirmed;
  f.confirmed_at = confirmed ? now : null;
}

function sameValue(a, b) {
  if (isEmpty(a) && isEmpty(b)) return true;
  return a === b;
}

// ---- パス操作 ---------------------------------------------------------

export function getPath(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

let idCounter = 0;
export function newId(prefix = 'x') {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}`;
}
