// ページごとの文字（PDFの文字レイヤー／OCR）の整形と、重複させない組み合わせ。
// DOM に依存しない（Node.js でテストできる）。
//
// 方針
// ・OCR の結果は「文字の間の空白」を除く以外は直さない（人名・曲名・金額などを推測で補正しない）。
// ・PDF の文字と OCR の結果は無条件に連結しない。どちらを使うかをページごとに選ぶ。
//   「PDFの文字＋OCRにしかない行」を選んだ場合も、PDF の文字と同じ内容の OCR 行は除く。

/** ページの文字の取り方 */
export const PAGE_MODES = {
  pdf: 'PDFの文字',
  ocr: 'OCR',
  merge: 'PDFの文字＋OCRにしかない行',
};

/** PDF の文字がこの文字数（空白を除く）未満なら「文字がないページ」とみなして OCR する */
export const MIN_TEXT_CHARS = 30;

const CJK = '\\u3000-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff01-\\uff60・ー々〆〇';
const CJK_GAP = new RegExp(`(?<=[${CJK}])[ \\t]+(?=[${CJK}])`, 'g');

/** Tesseract（jpn）が日本語の文字の間に入れる空白を除く。英数字の前後の空白は残す。 */
export function tidyOcrText(s) {
  return String(s ?? '').replace(/\s+\n/g, '\n').replace(CJK_GAP, '').replace(/[ \t]{2,}/g, ' ').trim();
}

export function countChars(lines) {
  return (lines ?? []).reduce((n, l) => n + String(l.text ?? '').replace(/\s/g, '').length, 0);
}

export function hasUsableText(lines) {
  return countChars(lines) >= MIN_TEXT_CHARS;
}

const normKey = (s) => String(s ?? '').normalize('NFKC').replace(/\s+/g, '');

function bigrams(s) {
  const out = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

/** 2つの文字列の似ている度合い（0〜1、文字の2つ組の一致率） */
export function similarity(a, b) {
  const x = normKey(a);
  const y = normKey(b);
  if (!x.length || !y.length) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const bx = bigrams(x);
  const by = bigrams(y);
  let inter = 0;
  for (const [g, n] of bx) inter += Math.min(n, by.get(g) ?? 0);
  return (2 * inter) / (x.length - 1 + y.length - 1);
}

/**
 * OCR の行のうち、PDF の文字にすでにある内容を除いたものを返す。
 * 同じ内容の判定：OCR 行（空白除去）が PDF のページ全文に含まれる、または PDF のどれかの行と 0.75 以上似ている。
 */
export function ocrOnlyLines(pdfLines, ocrLines, threshold = 0.75) {
  const pdfAll = normKey((pdfLines ?? []).map((l) => l.text).join(''));
  return (ocrLines ?? []).filter((o) => {
    const k = normKey(o.text);
    if (k.length < 2) return false;
    if (pdfAll.includes(k)) return false;
    return !(pdfLines ?? []).some((p) => similarity(p.text, o.text) >= threshold);
  });
}

/** ページの状態から、抽出に渡す行を作る（mode に従う。無条件に連結しない） */
export function linesForExtraction(page) {
  const pdf = (page.pdfLines ?? []).map((l) => ({ ...l, method: 'pdf_text' }));
  const ocr = (page.ocrLines ?? []).map((l) => ({ ...l, method: 'ocr' }));
  switch (page.mode) {
    case 'ocr': return ocr;
    case 'merge': {
      // 位置（上から順）で並べる。位置がない行は後ろ
      const extra = ocrOnlyLines(pdf, ocr);
      return [...pdf, ...extra].sort((a, b) => (a.bbox?.y0 ?? 2) - (b.bbox?.y0 ?? 2));
    }
    case 'pdf':
    default: return pdf;
  }
}

/** 初期の mode：PDF の文字が十分あれば pdf、なければ ocr */
export function defaultMode(page) {
  if (hasUsableText(page.pdfLines)) return 'pdf';
  return 'ocr';
}

/**
 * Tesseract の結果（blocks → paragraphs → lines → words）を、ページ上の位置（0〜1）付きの行にする。
 * width/height は OCR した画像の大きさ。
 */
export function ocrResultToLines(data, width, height, { lowWordConf = 60 } = {}) {
  const lines = [];
  for (const b of data?.blocks ?? []) {
    for (const p of b.paragraphs ?? []) {
      for (const l of p.lines ?? []) {
        const text = tidyOcrText(l.text);
        if (!text || !/[\p{L}\p{N}]/u.test(text)) continue;
        const low = (l.words ?? []).filter((w) => w.confidence < lowWordConf && String(w.text).trim()).map((w) => tidyOcrText(w.text));
        lines.push({
          text,
          size: l.bbox ? (l.bbox.y1 - l.bbox.y0) / height : null,
          conf: Math.round(l.confidence ?? 0),
          lowWords: low,
          bbox: l.bbox ? { x0: l.bbox.x0 / width, y0: l.bbox.y0 / height, x1: l.bbox.x1 / width, y1: l.bbox.y1 / height } : null,
        });
      }
    }
  }
  return lines;
}
