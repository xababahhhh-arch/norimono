// PDF.js によるページごとの文字抽出（ブラウザ内のみ。ファイルは外部へ送信しない）。
// 戻り値は raw extraction の1ファイル分：{ name, type, pages: [{ page, text, lines: [{ text, size }] }] }
const PDFJS_URL = new URL('../../vendor/pdfjs/pdf.min.mjs', import.meta.url).href;
const WORKER_URL = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
const CMAP_URL = new URL('../../vendor/pdfjs/cmaps/', import.meta.url).href;

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_URL).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      return lib;
    });
  }
  return pdfjsPromise;
}

/** テキスト項目を行にまとめる（y座標が近いものを同じ行とし、x順に並べる） */
export function itemsToLines(items) {
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
    return { text: text.trim(), size: Math.max(...r.parts.map((p) => p.size)) };
  });
}

export async function extractPdf(file, { onProgress } = {}) {
  const lib = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await lib.getDocument({ data, cMapUrl: CMAP_URL, cMapPacked: true, isEvalSupported: false }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const lines = itemsToLines(content.items);
    pages.push({ page: i, text: lines.map((l) => l.text).join('\n'), lines });
  }
  return { name: file.name, type: file.type || 'application/pdf', pages, pdf: doc };
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
