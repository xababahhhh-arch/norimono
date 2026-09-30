// ブラウザ内の OCR（Tesseract.js）。
// ・OCR の資材（本体・Worker・WASM・日本語/英語の学習データ）はすべて vendor/tesseract/ に同梱し、同じ配信元から読む。
//   外部 CDN には接続しない。学習データはブラウザのストレージ（IndexedDB）に保存しない（cacheMethod: 'none'）。
// ・画像・OCR 結果を外部へ送らない。
// ・Worker は一度読み込んだら使い回す（読み込み後はネットワークを切っても OCR できる）。クリア時に解放する。
import { ocrResultToLines } from './pagetext.js';

const BASE = new URL('../../vendor/tesseract/', import.meta.url).href;

export const OCR_AVAILABLE = true;
export const OCR_LANGS = ['jpn', 'eng'];

/** 解像度の選択肢（dpi）。300 が標準（実物チラシでの測定：REAL_DATA_TEST_UNPLUGGED.md 12章） */
export const OCR_DPI_OPTIONS = {
  200: '200 dpi（速い・メモリ少なめ。小さい文字は読み落としが増える）',
  300: '300 dpi（標準）',
  400: '400 dpi（小さい文字向け。時間とメモリが増える）',
};
export const DEFAULT_DPI = 300;
/** 白黒にするときの明るさの境目（0〜255）。灰色・色付きの文字を黒として読ませる */
export const DEFAULT_THRESHOLD = 200;

let workerPromise = null;
let progressHandler = null;

export function isOcrLoaded() {
  return workerPromise !== null;
}

/** OCR の資材を読み込み、Worker を用意する（2回目以降は同じ Worker を返す） */
export function prepareOcr(onProgress) {
  if (onProgress) progressHandler = onProgress;
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod = await import(`${BASE}tesseract.esm.min.js`);
      const createWorker = mod.createWorker ?? mod.default?.createWorker;
      const worker = await createWorker(OCR_LANGS, 1 /* LSTM のみ */, {
        workerPath: `${BASE}worker.min.js`,
        corePath: `${BASE}core`,
        langPath: `${BASE}lang`,
        gzip: true,
        cacheMethod: 'none',
        workerBlobURL: false,
        logger: (m) => progressHandler?.(m),
      });
      await worker.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '1' });
      return worker;
    })();
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

/** Worker を終了し、メモリを解放する */
export async function terminateOcr() {
  const p = workerPromise;
  workerPromise = null;
  progressHandler = null;
  if (!p) return;
  try { (await p).terminate(); } catch { /* 読み込みに失敗していた場合 */ }
}

/** 白黒にする（灰色・赤の文字も黒にする）。canvas を直接書き換える */
export function binarize(canvas, threshold = DEFAULT_THRESHOLD) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = y < threshold ? 0 : 255;
    d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * canvas を OCR する。戻り値の行は位置（0〜1）付き。
 * onPageProgress(0〜1) で認識の進み具合を返す。
 */
export async function ocrCanvas(canvas, { threshold = DEFAULT_THRESHOLD, onPageProgress } = {}) {
  const worker = await prepareOcr();
  binarize(canvas, threshold);
  const prev = progressHandler;
  progressHandler = (m) => {
    if (m.status === 'recognizing text') onPageProgress?.(m.progress);
    prev?.(m);
  };
  const t0 = performance.now();
  try {
    const r = await worker.recognize(canvas, {}, { text: true, blocks: true });
    return { lines: ocrResultToLines(r.data, canvas.width, canvas.height), ms: Math.round(performance.now() - t0) };
  } finally {
    progressHandler = prev;
  }
}

/** 画像ファイル（JPG・PNG）を、A4 を指定 dpi にした場合と同じくらいの大きさの canvas にする */
export async function imageFileToCanvas(file, dpi = DEFAULT_DPI) {
  const bmp = await createImageBitmap(file);
  const longSide = Math.round(11.69 * dpi);
  const scale = longSide / Math.max(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas;
}

/** 使い終わった canvas のメモリを解放する */
export function releaseCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}
