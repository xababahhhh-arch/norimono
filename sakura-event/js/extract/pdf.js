// PDF.js によるページごとの文字抽出と画像化（ブラウザ内のみ。ファイルは外部へ送信しない）。
// 戻り値は raw extraction の1ファイル分：{ name, type, pages: [{ page, text, lines: [{ text, size, bbox }] }] }
const PDFJS_URL = new URL('../../vendor/pdfjs/pdf.min.mjs', import.meta.url).href;
const WORKER_URL = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
const CMAP_URL = new URL('../../vendor/pdfjs/cmaps/', import.meta.url).href;

let pdfjsPromise = null;
/** PDF.js を読み込む。Worker は1つ作って使い回す（読み込み後はネットワークを切っても動く） */
export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_URL).then((lib) => {
      if (typeof Worker !== 'undefined') {
        lib.GlobalWorkerOptions.workerPort = new Worker(WORKER_URL, { type: 'module' });
      } else {
        lib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      }
      return lib;
    });
    pdfjsPromise.catch(() => { pdfjsPromise = null; });
  }
  return pdfjsPromise;
}

/**
 * テキスト項目を行にまとめる（y座標が近いものを同じ行とし、x順に並べる）。
 * pageSize（scale 1 の幅・高さ）があれば、行の位置を 0〜1 で返す（上が 0）。
 */
export function itemsToLines(items, pageSize = null) {
  const rows = [];
  for (const it of items) {
    const str = it.str ?? '';
    if (!str.trim()) continue;
    const [a, b, , , x, y] = it.transform;
    const size = Math.round(Math.hypot(a, b) * 10) / 10 || it.height || 0;
    let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, size * 0.4));
    if (!row) rows.push((row = { y, parts: [] }));
    row.parts.push({ x, str, size, w: it.width ?? 0 });
  }
  rows.sort((p, q) => q.y - p.y);
  return rows.map((r) => {
    r.parts.sort((p, q) => p.x - q.x);
    let text = '';
    let lastEnd = null;
    for (const p of r.parts) {
      if (lastEnd !== null && p.x - lastEnd > p.size * 0.8) text += ' ';
      text += p.str;
      lastEnd = p.x + p.w;
    }
    const size = Math.max(...r.parts.map((p) => p.size));
    const line = { text: text.trim(), size };
    if (pageSize) {
      const x0 = Math.min(...r.parts.map((p) => p.x));
      const x1 = Math.max(...r.parts.map((p) => p.x + p.w));
      line.bbox = {
        x0: x0 / pageSize.width, x1: x1 / pageSize.width,
        y0: (pageSize.height - r.y - size) / pageSize.height, y1: (pageSize.height - r.y + size * 0.25) / pageSize.height,
      };
    }
    return line;
  });
}

/** PDF を開き、各ページの文字レイヤーを取り出す（OCR はしない） */
export async function openPdf(file, { onProgress, data } = {}) {
  const lib = await loadPdfjs();
  const bytes = data ?? new Uint8Array(await file.arrayBuffer());
  const doc = await lib.getDocument({ data: bytes, cMapUrl: CMAP_URL, cMapPacked: true, isEvalSupported: false }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const lines = itemsToLines(content.items, { width: vp.width, height: vp.height });
    pages.push({ page: i, text: lines.map((l) => l.text).join('\n'), lines, width: vp.width, height: vp.height });
    page.cleanup();
  }
  return { name: file.name, type: file.type || 'application/pdf', pages, pdf: doc };
}

/** 互換用：文字レイヤーだけを返す（旧 extractPdf） */
export async function extractPdf(file, opts = {}) {
  return openPdf(file, opts);
}

/** OCR 用に1ページを指定 dpi の白背景 canvas に描画する（呼び出し側で releaseCanvas すること） */
export async function renderPageForOcr(pdf, pageNumber, dpi = 300) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: dpi / 72 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return canvas;
}

/** プレビュー用に1ページを canvas に描画 */
export async function renderPdfPage(pdf, pageNumber, canvas, maxWidth = 800) {
  const page = await pdf.getPage(pageNumber);
  const v1 = page.getViewport({ scale: 1 });
  const scale = Math.min(2, maxWidth / v1.width) * (globalThis.devicePixelRatio || 1);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
}
