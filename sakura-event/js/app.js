// 画面の制御（5ステップ）。状態はこのファイルの state に集約する。
// 原稿・抽出結果・OCR結果はブラウザの永続ストレージ（localStorage・IndexedDB など）に自動保存しない。
// 保存は利用者の明示操作（event.json の保存ボタン）でのみ行う。
import { h, announce, download, storageGet, storageRemove } from './ui/dom.js';
import { createReviewForm, renderGateSummary } from './ui/form.js';
import { createPreview } from './ui/preview.js';
import { buildOutputs, renderStep4, renderStep5 } from './ui/outputs.js';
import { openPdf, renderPageForOcr, loadPdfjs } from './extract/pdf.js';
import { prepareOcr, terminateOcr, ocrCanvas, imageFileToCanvas, releaseCanvas, OCR_DPI_OPTIONS, DEFAULT_DPI } from './extract/ocr.js';
import { defaultMode, linesForExtraction, countChars, PAGE_MODES } from './extract/pagetext.js';
import { ADAPTERS, runWithAdapter } from './ai/adapter.js';
import { normalizeEvent, EVENT_TYPES, WORKFLOW_STATES } from './core/schema.js';
import { canFinalize, gateProgress } from './core/validate.js';
import { reviewState } from './core/field.js';
import { sha256Hex, sourceRecord, sameSources } from './core/hash.js';

// 以前の版が使っていた自動保存のキー（今の版は書き込まない。消去の案内だけに使う）
const LEGACY_STORAGE_KEY = 'sakura-event:draft:v1';
const $ = (id) => document.getElementById(id);

const state = {
  step: 1,
  // { file, name, kind: 'pdf'|'image', side, url, size, type, sha256, importedAt, pdf, pages: [page] }
  // page: { page, pdfLines, ocrLines, ocrStatus: 'none'|'running'|'done'|'error'|'cancelled', ocrMs, renderMs, error, mode }
  files: [],
  event: null,
  analysis: null,
  outputs: null,
  busy: false,
  cancelRequested: false,
  extractedFrom: null, // 抽出に使った資料の記録（source_files）
  dirtyPages: false, // ページの選び方を変えたが、まだ抽出をやり直していない
};

const SIDES = { front: '表面', back: '裏面', other: 'その他' };

// ---- ステップ表示 -------------------------------------------------------

function reachable(step) {
  if (step <= 2) return true;
  if (step <= 4) return !!state.event;
  return !!state.outputs;
}

function goto(step, { focus = true } = {}) {
  if (!reachable(step)) {
    announce(step >= 5 ? '先に STEP 4 で生成してください。' : '先に STEP 2 で解析するか、event.json を読み込んでください。');
    return;
  }
  state.step = step;
  for (let i = 1; i <= 5; i++) $(`step-${i}`).hidden = i !== step;
  updateStepper();
  if (step === 2) renderPages();
  if (step === 3) renderStep3();
  if (step === 4) renderStep4Gate();
  if (step === 5 && state.outputs) { renderWorkflow(); renderStep5($('step5-output'), state.outputs); }
  if (focus) {
    const hd = $(`step-${step}-h`);
    hd.setAttribute('tabindex', '-1');
    hd.focus();
    window.scrollTo({ top: 0 });
  }
  document.title = `STEP ${step}｜イベント広報生成｜戸塚区民文化センター さくらプラザ`;
}

function updateStepper() {
  for (const li of $('stepper').children) {
    const n = Number(li.dataset.step);
    const btn = li.querySelector('button');
    const st = li.querySelector('.step-state');
    li.classList.toggle('current', n === state.step);
    li.classList.toggle('done', n < state.step);
    if (n === state.step) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
    st.textContent = n === state.step ? '（現在）' : !reachable(n) ? '（まだ進めません）' : '';
    btn.setAttribute('aria-disabled', reachable(n) ? 'false' : 'true');
  }
  // 固定表示のステップ表示でフォーカスが隠れないように（WCAG 2.4.11）
  const hdr = document.querySelector('.app-header');
  document.documentElement.style.setProperty('--header-h', `${hdr.offsetHeight + 8}px`);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-goto]');
  if (b && !state.busy) goto(Number(b.dataset.goto));
  else if (b && state.busy) announce('文字の取得（OCR）の処理中です。終わるか、キャンセルしてから移動してください。');
});

/** 内容を変えた時刻だけを記録する（保存はしない） */
function touch() {
  if (state.event) state.event.meta.updated_at = new Date().toISOString();
}

// ---- 入力資料の記録（版の確認） -------------------------------------------------

function currentSourceRecords() {
  const recs = state.files.map((f) => sourceRecord({ name: f.name, type: f.type, size: f.size, sha256: f.sha256, importedAt: f.importedAt, pages: f.pages?.length ?? null }));
  return recs;
}

/** 読み込んだファイルと event.json の記録が一致するかを調べ、一致しなければ確定を止める */
function refreshSourceCheck() {
  if (!state.event) return;
  const recorded = (state.event.meta.source_files ?? []).filter((s) => s.sha256 && s.type !== 'text/plain');
  const loaded = currentSourceRecords();
  state.event.meta.source_mismatch = recorded.length > 0 && loaded.length > 0 && !sameSources(recorded, loaded);
}

// ---- STEP 1 ------------------------------------------------------------

for (const [v, label] of Object.entries(OCR_DPI_OPTIONS)) {
  $('ocr-dpi').append(h('option', { value: v, selected: Number(v) === DEFAULT_DPI }, label));
}

function fmtSize(n) {
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.ceil(n / 1024)}KB`;
}

function renderFileList() {
  const box = $('file-list');
  box.replaceChildren();
  if (!state.files.length) return;
  box.append(h('h2', { class: 'h-small' }, `選んだファイル（${state.files.length}件）`), h('ul', { class: 'file-list' }, state.files.map((f, i) => {
    const selId = `side-${i}`;
    const sel = h('select', { id: selId }, Object.entries(SIDES).map(([k, v]) => h('option', { value: k, selected: f.side === k }, v)));
    sel.addEventListener('change', () => { f.side = sel.value; });
    return h('li', {},
      h('span', {}, `${f.name}（${f.kind === 'pdf' ? 'PDF' : '画像'}、${fmtSize(f.size)}、取込：${new Date(f.importedAt).toLocaleString('ja-JP')}）`),
      h('span', { class: 'hash' }, 'SHA-256：', h('code', {}, f.sha256)),
      h('label', { for: selId }, ' 種類：'), sel,
      h('button', { type: 'button', class: 'btn-secondary', onclick: () => removeFile(i) }, `${f.name} を外す`));
  })));
}

function removeFile(i) {
  const f = state.files[i];
  releaseFile(f);
  state.files.splice(i, 1);
  refreshSourceCheck();
  renderFileList();
  announce(`${f.name} を外しました。`);
}

function releaseFile(f) {
  try { f.pdf?.destroy(); } catch { /* 何もしない */ }
  if (f.url) URL.revokeObjectURL(f.url);
  f.pdf = null;
  f.url = null;
  f.file = null;
}

$('file-input').addEventListener('change', async (e) => {
  const errors = [];
  const notes = [];
  for (const file of e.target.files) {
    const kind = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name) ? 'pdf' : /^image\/(jpeg|png)$/.test(file.type) || /\.(jpe?g|png)$/i.test(file.name) ? 'image' : null;
    if (!kind) { errors.push(`エラー：「${file.name}」は対応していない形式です。PDF・JPG・PNG を選んでください。`); continue; }
    const sha256 = await sha256Hex(await file.arrayBuffer());
    const dup = state.files.find((f) => f.sha256 === sha256);
    if (dup) {
      notes.push(`「${file.name}」は、すでに選んだ「${dup.name}」と同じファイルです（SHA-256 が一致）。新しい版としては扱いません。`);
      continue;
    }
    const side = state.files.length === 0 ? 'front' : state.files.length === 1 ? 'back' : 'other';
    state.files.push({
      file, name: file.name, kind, side, url: kind === 'image' ? URL.createObjectURL(file) : null,
      size: file.size, type: file.type || (kind === 'pdf' ? 'application/pdf' : ''), sha256, importedAt: new Date().toISOString(), pdf: null, pages: [],
    });
    if (state.event && !(state.event.meta.source_files ?? []).some((s) => s.sha256 === sha256)) {
      notes.push(`「${file.name}」は、今の解析結果の基になった資料と異なります。解析し直すと、前の確認結果・承認状態は引き継ぎません。`);
    }
  }
  e.target.value = '';
  $('step1-error').textContent = errors.join('\n');
  $('step1-error').hidden = !errors.length;
  refreshSourceCheck();
  renderFileList();
  if (notes.length) $('file-list').append(...notes.map((n) => h('p', { class: 'st st-needs_review' }, `！ ${n}`)));
  if (state.files.length) announce(`${state.files.length}件のファイルを選んでいます。${notes.join('')}`);
});

$('sample-select').addEventListener('change', async (e) => {
  const v = e.target.value;
  if (!v) return;
  try {
    const res = await fetch(`fixtures/raw/${v}.txt`);
    $('paste-text').value = await res.text();
    announce('サンプルの文字を貼り付け欄に入れました。「次へ：自動解析」を押してください。');
  } catch {
    announce('サンプルを読み込めませんでした。');
  }
});

$('json-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    // 保存済みの確認状態は Field 形式の confirmed をそのまま引き継ぐ
    state.event = normalizeEvent(data, { confirmed: false });
    state.analysis = null;
    state.outputs = null;
    refreshSourceCheck();
    announce(`${file.name} を読み込みました。STEP 3 で内容を確認してください。${state.event.meta.source_mismatch ? '読み込んだチラシのファイルが、この event.json の記録と一致しません。' : ''}`);
    goto(3);
  } catch (err) {
    $('step1-error').textContent = `エラー：event.json を読み込めませんでした（${err.message}）。ファイルが壊れていないか確認してください。`;
    $('step1-error').hidden = false;
  }
  e.target.value = '';
});

$('to-step2').addEventListener('click', () => {
  if (!state.files.length && !$('paste-text').value.trim()) {
    $('step1-error').textContent = 'エラー：チラシのファイルが選ばれていません。ファイルを選ぶか、チラシの文字を貼り付けてください。';
    $('step1-error').hidden = false;
    $('file-input').focus();
    return;
  }
  $('step1-error').hidden = true;
  goto(2);
});

$('ocr-prepare').addEventListener('click', async () => {
  const st = $('ocr-prepare-status');
  st.textContent = 'OCRの資材を読み込んでいます…';
  try {
    await Promise.all([loadPdfjs(), prepareOcr()]);
    st.textContent = 'OCRの資材を読み込みました。このページを開いている間は、ネットワークを切っても文字の読み取りができます（「すべてクリア」を押すと資材も解放します）。';
  } catch (err) {
    st.textContent = `エラー：OCRの資材を読み込めませんでした（${err.message}）。ページを読み込み直してください。`;
  }
});

/** すべてクリア：資料・解析結果・生成物・OCR の Worker・画像の参照を解放する */
async function clearAll() {
  if (state.busy) state.cancelRequested = true;
  for (const f of state.files) releaseFile(f);
  state.files = [];
  state.event = null;
  state.analysis = null;
  state.outputs = null;
  state.extractedFrom = null;
  state.dirtyPages = false;
  await terminateOcr();
  $('paste-text').value = '';
  $('file-list').replaceChildren();
  $('page-list').replaceChildren();
  $('pages-box').hidden = true;
  $('analyze-result').replaceChildren();
  $('preview').replaceChildren();
  $('review-form').replaceChildren();
  $('step4-output').replaceChildren();
  $('step5-output').replaceChildren();
  $('ocr-prepare-status').textContent = '';
  $('to-step3').disabled = true;
  $('to-step5').disabled = true;
  goto(1);
  announce('読み込んだ資料・解析結果・生成物を消去し、OCRの処理も終了しました。');
}

$('clear-btn').addEventListener('click', async () => {
  const ok = await confirmDialog('読み込んだ資料・解析結果・確認内容・生成物をすべて消去します。保存していない内容は元に戻せません。よろしいですか？');
  if (ok) await clearAll();
});

// 以前の版が自動保存した作業データ（今の版は自動保存しない）
if (storageGet(LEGACY_STORAGE_KEY)) $('legacy-notice').hidden = false;
$('legacy-clear').addEventListener('click', () => {
  storageRemove(LEGACY_STORAGE_KEY);
  $('legacy-notice').hidden = true;
  announce('以前の版の作業データを消去しました。');
});

// ---- STEP 2：文字の取得（PDFの文字 → 取れないページは OCR）と抽出 ----------------

for (const a of ADAPTERS) {
  $('adapter-select').append(h('option', { value: a.id, disabled: a.external && !a.enabled }, a.label));
}

function setProgress(text, ratio = null) {
  $('progress').hidden = false;
  $('progress-text').textContent = text;
  if (ratio !== null) $('progress-bar').value = Math.round(ratio * 100);
}

function setBusy(b) {
  state.busy = b;
  $('analyze-btn').disabled = b;
  $('cancel-btn').hidden = !b;
  $('cancel-btn').disabled = false;
  $('reextract-btn').disabled = b;
  $('to-step3').disabled = b || !state.event;
  for (const btn of $('page-list').querySelectorAll('button, select')) btn.disabled = b;
}

$('cancel-btn').addEventListener('click', () => {
  state.cancelRequested = true;
  $('cancel-btn').disabled = true;
  setProgress('キャンセルしています。処理中のページが終わったら止めます…');
});

/** 1ページを OCR する（PDF のページは画像化してから） */
async function ocrPage(f, pg, label) {
  const dpi = Number($('ocr-dpi').value) || DEFAULT_DPI;
  const threshold = Number($('ocr-threshold').value) || 200;
  pg.ocrStatus = 'running';
  pg.error = null;
  renderPages();
  let canvas = null;
  try {
    setProgress(`${label}：OCRの準備（資材の読み込み）…`, 0);
    await prepareOcr();
    const t0 = performance.now();
    setProgress(`${label}：画像にしています（${dpi} dpi）…`, 0);
    canvas = f.kind === 'pdf' ? await renderPageForOcr(f.pdf, pg.page, dpi) : await imageFileToCanvas(f.file, dpi);
    pg.renderMs = Math.round(performance.now() - t0);
    pg.ocrSize = `${canvas.width}×${canvas.height}`;
    const r = await ocrCanvas(canvas, { threshold, onPageProgress: (p) => setProgress(`${label}：OCR中 ${Math.round(p * 100)}%`, p) });
    pg.ocrLines = r.lines;
    pg.ocrMs = r.ms;
    pg.ocrDpi = dpi;
    pg.ocrStatus = 'done';
  } catch (err) {
    pg.ocrStatus = 'error';
    pg.error = err?.message ?? String(err);
  } finally {
    releaseCanvas(canvas);
  }
}

/** 文字の取得（ファイル → ページの順に1つずつ処理する） */
async function acquireText({ onlyPages = null } = {}) {
  state.cancelRequested = false;
  setBusy(true);
  try {
    for (const [fi, f] of state.files.entries()) {
      if (f.kind === 'pdf' && !f.pdf) {
        setProgress(`${f.name}：PDFを開いて文字を取り出しています…`, 0);
        const r = await openPdf(f.file);
        f.pdf = r.pdf;
        f.pages = r.pages.map((p) => ({ page: p.page, pdfLines: p.lines, ocrLines: null, ocrStatus: 'none', mode: null }));
        for (const pg of f.pages) pg.mode = defaultMode(pg);
      } else if (f.kind === 'image' && !f.pages.length) {
        f.pages = [{ page: 1, pdfLines: [], ocrLines: null, ocrStatus: 'none', mode: 'ocr' }];
      }
      for (const pg of f.pages) {
        const wanted = onlyPages ? onlyPages.some((x) => x.fi === fi && x.page === pg.page) : (pg.mode === 'ocr' && pg.ocrStatus !== 'done');
        if (!wanted) continue;
        if (state.cancelRequested) { if (pg.ocrStatus !== 'done') pg.ocrStatus = 'cancelled'; continue; }
        const label = `${f.name} ${pg.page}/${f.pages.length}ページ`;
        await ocrPage(f, pg, label);
        if (onlyPages && pg.ocrStatus === 'done' && countChars(pg.pdfLines) > 0) pg.mode = 'merge';
        if (pg.ocrStatus === 'done' && countChars(pg.pdfLines) === 0) pg.mode = 'ocr';
        renderPages();
      }
    }
  } finally {
    setBusy(false);
    const failed = state.files.flatMap((f) => f.pages.filter((p) => p.ocrStatus === 'error' || p.ocrStatus === 'cancelled').map((p) => `${f.name} ${p.page}ページ`));
    setProgress(state.cancelRequested ? `キャンセルしました。${failed.length ? `未処理：${failed.join('、')}` : ''}` : failed.length ? `OCRできなかったページがあります：${failed.join('、')}（ページの一覧から再実行できます）` : '文字の取得が終わりました。', 1);
    renderPages();
  }
}

function modeOptions(pg) {
  const hasPdf = countChars(pg.pdfLines) > 0;
  const hasOcr = pg.ocrStatus === 'done';
  return Object.entries(PAGE_MODES).filter(([k]) => (k === 'pdf' ? hasPdf : k === 'ocr' ? hasOcr : hasPdf && hasOcr));
}

function renderPages() {
  const list = $('page-list');
  list.replaceChildren();
  const all = state.files.flatMap((f, fi) => f.pages.map((pg) => ({ f, fi, pg })));
  $('pages-box').hidden = all.length === 0;
  for (const { f, fi, pg } of all) {
    const pdfChars = countChars(pg.pdfLines);
    const ocrChars = countChars(pg.ocrLines);
    const status = {
      none: pg.mode === 'ocr' ? 'OCR待ち' : 'OCRなし',
      running: 'OCR中…',
      done: `OCR済み（${ocrChars}文字、画像化 ${((pg.renderMs ?? 0) / 1000).toFixed(1)}秒＋OCR ${((pg.ocrMs ?? 0) / 1000).toFixed(1)}秒、${pg.ocrDpi} dpi）`,
      error: `エラー：OCRできませんでした（${pg.error}）`,
      cancelled: 'キャンセルしたため未処理',
    }[pg.ocrStatus];
    const selId = `mode-${fi}-${pg.page}`;
    const opts = modeOptions(pg);
    const sel = h('select', { id: selId, disabled: state.busy || opts.length < 2 }, opts.map(([k, v]) => h('option', { value: k, selected: pg.mode === k }, v)));
    sel.addEventListener('change', () => {
      pg.mode = sel.value;
      state.dirtyPages = true;
      renderPages();
      announce(`${f.name} ${pg.page}ページは「${PAGE_MODES[pg.mode]}」を使います。「この選び方で抽出をやり直す」を押してください。`);
    });
    const ocrBtn = h('button', {
      type: 'button', class: 'btn-secondary', disabled: state.busy,
      onclick: async () => {
        await acquireText({ onlyPages: [{ fi, page: pg.page }] });
        state.dirtyPages = true;
        renderPages();
      },
    }, pg.ocrStatus === 'done' ? `${pg.page}ページのOCRをやり直す` : pg.ocrStatus === 'error' || pg.ocrStatus === 'cancelled' ? `${pg.page}ページのOCRを再実行` : `${pg.page}ページをOCRする`);
    list.append(h('li', {},
      h('p', {}, h('strong', {}, `${f.name}　${pg.page}ページ`), `　PDFの文字：${pdfChars}文字　／　${status}`),
      pdfChars === 0 && f.kind === 'pdf' ? h('p', { class: 'help' }, 'このページには文字の情報がありません（文字が図形になっている可能性があります）。OCRで読み取ります。') : null,
      h('div', { class: 'fld inline' }, h('label', { for: selId }, '使う文字：'), sel, ocrBtn)));
  }
  $('reextract-btn').hidden = !(state.event && state.dirtyPages);
}

/** 抽出（ページごとに選んだ文字だけを使う） */
async function runExtraction() {
  const raw = { files: [] };
  for (const f of state.files) {
    raw.files.push({ name: f.name, type: f.type, pages: f.pages.map((pg) => ({ page: pg.page, lines: linesForExtraction(pg) })) });
  }
  const pasted = $('paste-text').value.trim();
  if (pasted) raw.files.push({ name: '貼り付けた文字', type: 'text/plain', method: 'paste', pages: [{ page: 1, text: pasted, method: 'paste' }] });
  const adapter = ADAPTERS.find((a) => a.id === $('adapter-select').value) ?? ADAPTERS[0];
  const result = await runWithAdapter(adapter, 'extract', [raw, {}], { files: raw.files.map((f) => f.name) }, confirmDialog);
  const ev = result.event;
  // 入力資料の記録（同一性の確認用。版が最新か・承認済みかは担当者が確認する）
  const recs = currentSourceRecords();
  if (pasted) recs.push(sourceRecord({ name: '貼り付けた文字', type: 'text/plain', size: pasted.length, sha256: await sha256Hex(pasted), importedAt: new Date().toISOString() }));
  const prevSources = state.event?.meta?.source_files ?? null;
  ev.meta.source_files = recs;
  // メディア（チラシのファイル名）を記録（値は要確認のまま）
  const front = state.files.find((f) => f.side === 'front');
  const back = state.files.find((f) => f.side === 'back');
  if (front) ev.media.flyer_front.value = front.name;
  if (back) ev.media.flyer_back.value = back.name;
  for (const k of ['flyer_front', 'flyer_back']) if (ev.media[k].value) Object.assign(ev.media[k], { origin: 'manual', confidence: 1, note: 'アップロードしたファイル名です。CMSにアップロードしたURLに置き換えてください。' });
  const changedSources = prevSources && !sameSources(prevSources, recs);
  state.event = ev;
  state.analysis = result;
  state.outputs = null;
  state.dirtyPages = false;
  return { result, changedSources };
}

function renderSummary(result, { changedSources, reextracted }) {
  const ev = state.event;
  let count = 0;
  const walk = (o) => {
    if (o && typeof o === 'object') {
      if ('value' in o && 'confirmed' in o) { if (o.origin === 'extracted' && o.value !== null && o.value !== '') count += 1; return; }
      Object.values(o).forEach(walk);
    }
  };
  walk(ev);
  const cls = result.classification;
  const ocrPages = state.files.flatMap((f) => f.pages.filter((p) => p.mode !== 'pdf' && p.ocrStatus === 'done')).length;
  $('analyze-result').replaceChildren(...[
    h('h2', { class: 'h-small' }, '解析の結果'),
    h('ul', {},
      h('li', {}, `取り出した項目：${count}件（すべて「要確認」です。OCRで読み取ったページ：${ocrPages}ページ）`),
      h('li', {}, `イベント種別の候補：${EVENT_TYPES[ev.event_type.value]}（推定の根拠：${cls?.reason ?? 'なし'}）　※STEP 3 で変更できます`),
      h('li', {}, `日程：${ev.schedule.dates.items.length}件、出演者：${ev.performers.items.length}名、料金：${ev.pricing.prices.items.length}件、販売方法ごとの発売日時：${ev.tickets.sales_schedule.items.length}件`),
      h('li', {}, `判断が必要な記載：${ev.meta.review_items.length}件（STEP 3 の一番上に原文つきで表示します）`),
      h('li', {}, '販売・受付状況はチラシからは決めません。STEP 3 で設定してください。')),
    reextracted || changedSources ? h('p', { class: 'st st-needs_review' }, `！ ${changedSources ? '入力資料が前回の解析と異なります。' : ''}抽出をやり直したため、前の確認結果・承認状態は引き継いでいません。`) : null,
    ocrPages ? h('p', { class: 'st st-needs_review' }, '！ OCRで読み取った文字は、人名・曲名・金額・日時などを読み誤ることがあります。STEP 3 でチラシと1項目ずつ照合してください（自動では直しません）。') : null,
    ...result.warnings.map((w) => h('p', { class: 'st st-needs_review' }, `！ ${w}`)),
    ...result.suggestions.map((s) => h('p', { class: 'st st-needs_review' }, `！ ${s.message}（販売・受付状況は STEP 3 で設定してください）`)),
  ].filter(Boolean));
  $('to-step3').disabled = false;
  announce(`解析が終わりました。${count}件の項目を取り出しました。`);
}

async function analyze({ reextract = false } = {}) {
  const hadConfirmations = state.event && JSON.stringify(state.event).includes('"confirmed":true');
  if (hadConfirmations) {
    const ok = await confirmDialog('抽出をやり直すと、STEP 3 で確認済みにした内容・承認の記録はすべて取り消されます。よろしいですか？');
    if (!ok) return;
  }
  try {
    if (!reextract) await acquireText();
    if (state.cancelRequested) {
      $('analyze-result').replaceChildren(h('p', { class: 'st st-needs_review' }, '！ キャンセルしたため、抽出はしていません。未処理のページを再実行するか、もう一度「解析を始める」を押してください。'));
      return;
    }
    setProgress('取り出した文字から項目を抽出しています…');
    const { result, changedSources } = await runExtraction();
    renderSummary(result, { changedSources, reextracted: reextract || hadConfirmations });
    setProgress('解析が終わりました。', 1);
    renderPages();
  } catch (err) {
    $('analyze-result').replaceChildren(h('p', { class: 'err' }, `エラー：解析できませんでした（${err.message}）。もう一度「解析を始める」を押すか、ファイルを選び直してください。`));
    announce('解析できませんでした。');
  }
}

$('analyze-btn').addEventListener('click', () => analyze());
$('reextract-btn').addEventListener('click', () => analyze({ reextract: true }));
$('to-step3').addEventListener('click', () => goto(3));

// ---- STEP 3 ------------------------------------------------------------

function previewSources() {
  const out = state.files.map((f) => ({
    name: f.name, kind: f.kind, pdf: f.pdf, url: f.url, sideLabel: `${SIDES[f.side]}・`,
    pages: f.pages.map((pg) => ({ page: pg.page, text: linesForExtraction(pg).map((l) => l.text).join('\n'), mode: pg.mode })),
  }));
  const pasted = $('paste-text').value.trim();
  if (pasted) out.push({ name: '貼り付けた文字', kind: 'text', pages: [{ page: 1, text: pasted }] });
  return out;
}

const preview = createPreview($('preview'), previewSources);
const form = createReviewForm($('review-form'), () => state.event, onFormChange, {
  onFocusField: (f) => { if (f?.source_file) preview.highlight(f.source_file, f.source_page, f.source_bbox); },
});

function renderSourceReview() {
  const box = $('source-review');
  const ev = state.event;
  const recs = ev.meta.source_files ?? [];
  if (!recs.length) { box.replaceChildren(); box.hidden = true; return; }
  box.hidden = false;
  const sr = ev.meta.source_review ?? { confirmed: false };
  box.replaceChildren(
    h('h3', { id: 'source-review-h' }, '入力資料（版）の確認'),
    h('ul', {}, recs.map((r) => h('li', {}, `${r.name}（${r.size ? fmtSize(r.size) : ''}${r.pages ? `、${r.pages}ページ` : ''}、取込：${r.imported_at ? new Date(r.imported_at).toLocaleString('ja-JP') : '不明'}）`, h('br'), 'SHA-256：', h('code', {}, r.sha256 ?? '')))),
    h('p', { class: 'help' }, 'SHA-256 は同じファイルかどうかの確認だけに使います。この資料が最新版か、公開が承認された版かは、システムでは判定しません。担当者が確認してください。'),
    ev.meta.source_mismatch ? h('p', { class: 'err' }, 'エラー：読み込んだチラシのファイルが、この event.json の記録と一致しません。別の資料に差し替えた場合は、STEP 2 で解析し直してください（前の確認結果は引き継ぎません）。') : null,
    h('p', { class: `st ${sr.confirmed ? 'st-confirmed' : 'st-needs_review'}` }, sr.confirmed ? `✓ 版を確認済み（${sr.confirmed_at ? new Date(sr.confirmed_at).toLocaleString('ja-JP') : ''}）` : '！ 版の確認：未確認'),
    h('div', { class: 'fld-actions' }, h('button', {
      type: 'button', class: 'btn-confirm',
      onclick: () => {
        ev.meta.source_review = sr.confirmed ? { confirmed: false, confirmed_at: null, note: '' } : { confirmed: true, confirmed_at: new Date().toISOString(), note: '' };
        onFormChange({ structural: false });
        renderSourceReview();
        announce(ev.meta.source_review.confirmed ? '入力資料の版を確認済みにしました。' : '入力資料の版の確認を取り消しました。');
      },
    }, sr.confirmed ? '版の確認を取り消す' : 'この資料が原稿の基にする版であることを確認した')),
  );
}

function onFormChange({ structural, focusPath }) {
  state.outputs = null;
  $('to-step5').disabled = true;
  if (state.event.meta.finalized) {
    state.event.meta.finalized = false;
    state.event.meta.finalized_at = null;
  }
  // 生成・承認の後に内容を変えたら、記録を取り消す（承認した内容と公開する内容を一致させるため）
  const wf = state.event.meta.workflow;
  if (wf && wf.state !== 'draft') {
    state.event.meta.workflow = { state: 'draft', generated_at: null, approved_by: '', approved_at: null, published_at: null, published_url: '' };
    announce('内容を変更したため、生成・承認の記録を取り消しました。もう一度生成し、承認を受けてください。');
  }
  touch();
  if (structural) form.render(focusPath);
  else form.refreshAll();
  renderGateSummary($('gate-summary'), state.event, (p) => form.focusField(p));
  updateStepper();
}

function renderStep3() {
  refreshSourceCheck();
  preview.render();
  renderSourceReview();
  form.render();
  renderGateSummary($('gate-summary'), state.event, (p) => form.focusField(p));
}

$('save-json-btn').addEventListener('click', () => {
  if (!state.event) return;
  download(`${state.event.event_id || 'event'}-work.json`, JSON.stringify(state.event, null, 2), 'application/json');
});

// ---- STEP 4 ------------------------------------------------------------

function renderStep4Gate() {
  refreshSourceCheck();
  $('page-url').value = state.event.meta.page_url ?? '';
  const r = canFinalize(state.event);
  const box = $('gate-final');
  const p = gateProgress(state.event);
  if (r.ok) {
    box.replaceChildren(h('p', { class: 'st st-confirmed' }, `✓ 必須項目はすべて確認済みです（${p.done}/${p.total}）。「確認済みの内容で生成する」を押せます。生成しても公開はされません。`));
  } else {
    box.replaceChildren(
      h('p', { class: 'st st-needs_review' }, `！ まだ確定できません。必須確認 ${p.total} 項目中 ${p.done} 項目が確認済みです。下書きとしてなら生成できます。`),
      h('ul', {}, r.blockers.map((b) => h('li', {}, `${b.label}：${b.message}`))),
      h('button', { type: 'button', class: 'btn-link', 'data-goto': '3' }, '確認画面（STEP 3）に戻る'),
    );
  }
  $('gen-final').disabled = !r.ok;
  $('gen-final').setAttribute('aria-describedby', 'gate-final');
}

$('page-url').addEventListener('change', (e) => {
  state.event.meta.page_url = e.target.value.trim();
  state.outputs = null;
  touch();
});

function generate(draft) {
  if (!draft) {
    state.event.meta.workflow = { state: 'generated', generated_at: new Date().toISOString(), approved_by: '', approved_at: null, published_at: null, published_url: '' };
    touch();
  }
  state.outputs = buildOutputs(state.event, { draft });
  renderStep4($('step4-output'), state.outputs);
  $('to-step5').disabled = false;
  updateStepper();
  announce(draft ? '下書きを生成しました。' : '生成が完了しました。まだ公開されていません。公開前に上長の承認を受けてください。');
  $('step4-output').querySelector('h3')?.setAttribute('tabindex', '-1');
  $('step4-output').querySelector('h3')?.focus();
}

$('gen-draft').addEventListener('click', () => generate(true));
$('gen-final').addEventListener('click', async () => {
  refreshSourceCheck();
  const r = canFinalize(state.event);
  if (!r.ok) { renderStep4Gate(); return; }
  // 必須でない項目の未確認数
  let unconfirmed = 0;
  const walk = (o) => {
    if (o && typeof o === 'object') {
      if ('value' in o && 'confirmed' in o) { if (reviewState(o) === 'needs_review') unconfirmed += 1; return; }
      Object.values(o).forEach(walk);
    }
  };
  walk(state.event);
  const ok = await confirmDialog(unconfirmed
    ? `必須項目はすべて確認済みです。ただし、必須でない項目のうち ${unconfirmed} 件が「要確認」のままです。これらもHP・SNSに表示されます。生成しますか？\n（生成しても公開はされません。公開前に上長の承認が必要です）`
    : '確認済みの内容で生成します。よろしいですか？\n（生成しても公開はされません。公開前に上長の承認が必要です）');
  if (!ok) return;
  state.event.meta.finalized = true;
  state.event.meta.finalized_at = new Date().toISOString();
  touch();
  generate(false);
});

$('to-step5').addEventListener('click', () => goto(5));

// ---- STEP 5：承認・公開の記録（このシステムは公開しない。記録だけを残す） ----

function renderWorkflow() {
  const box = $('workflow-panel');
  const ev = state.event;
  const wf = ev.meta.workflow ?? { state: 'draft' };
  const draftOut = state.outputs?.draft;
  const stateText = draftOut ? '下書き（確定前のため、承認・公開の対象ではありません）' : WORKFLOW_STATES[wf.state] ?? wf.state;
  const rows = [
    h('p', { class: `st ${wf.state === 'published' ? 'st-confirmed' : 'st-needs_review'}` }, `現在の状態：${stateText}`),
    h('p', { class: 'help' }, 'このシステムはHP・SNSへの公開を行いません。生成が完了しても公開されたことにはなりません。上長の承認を受けてから、担当者がCMS・各SNSで公開し、ここに記録を残してください。'),
  ];
  if (!draftOut && wf.generated_at) rows.push(h('p', {}, `生成日時：${wf.generated_at}`));
  if (!draftOut && wf.state === 'generated') {
    const nId = 'wf-approver';
    const dId = 'wf-approved-at';
    const name = h('input', { id: nId, type: 'text', autocomplete: 'name' });
    const date = h('input', { id: dId, type: 'text', placeholder: '例：2026-10-01' });
    const err = h('p', { class: 'err', hidden: true });
    rows.push(h('div', { class: 'fld' }, h('label', { for: nId }, '承認した人（上長）の名前'), name),
      h('div', { class: 'fld' }, h('label', { for: dId }, '承認日'), date), err,
      h('div', { class: 'fld-actions' }, h('button', {
        type: 'button', class: 'btn-primary',
        onclick: () => {
          if (!name.value.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.value.trim())) {
            err.textContent = 'エラー：承認した人の名前と承認日（例：2026-10-01）を入力してください。';
            err.hidden = false;
            name.focus();
            return;
          }
          Object.assign(ev.meta.workflow, { state: 'approved', approved_by: name.value.trim(), approved_at: date.value.trim() });
          afterWorkflowChange('承認を記録しました。公開は担当者がCMS・各SNSで行ってください。');
        },
      }, '承認を記録する')));
  }
  if (!draftOut && wf.state === 'approved') {
    rows.push(h('p', {}, `承認：${wf.approved_by}（${wf.approved_at}）`));
    const dId = 'wf-published-at';
    const uId = 'wf-published-url';
    const date = h('input', { id: dId, type: 'text', placeholder: '例：2026-10-02' });
    const url = h('input', { id: uId, type: 'url', placeholder: 'https://' });
    const err = h('p', { class: 'err', hidden: true });
    rows.push(h('div', { class: 'fld' }, h('label', { for: dId }, '公開日（CMSで公開した日）'), date),
      h('div', { class: 'fld' }, h('label', { for: uId }, '公開したページのURL'), url), err,
      h('div', { class: 'fld-actions' }, h('button', {
        type: 'button', class: 'btn-primary',
        onclick: () => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value.trim())) {
            err.textContent = 'エラー：公開日（例：2026-10-02）を入力してください。';
            err.hidden = false;
            date.focus();
            return;
          }
          Object.assign(ev.meta.workflow, { state: 'published', published_at: date.value.trim(), published_url: url.value.trim() });
          afterWorkflowChange('公開の記録を残しました。');
        },
      }, '公開を記録する')));
  }
  if (!draftOut && wf.state === 'published') {
    rows.push(h('p', {}, `承認：${wf.approved_by}（${wf.approved_at}）　公開：${wf.published_at}${wf.published_url ? `　${wf.published_url}` : ''}`));
  }
  box.replaceChildren(...rows);
}

function afterWorkflowChange(msg) {
  touch();
  state.outputs = buildOutputs(state.event, { draft: false }); // event.json の出力に記録を反映
  renderWorkflow();
  renderStep5($('step5-output'), state.outputs);
  announce(msg);
}

// ---- 確認ダイアログ ------------------------------------------------------

function confirmDialog(message) {
  const dlg = $('confirm-dialog');
  $('confirm-dialog-body').replaceChildren(...String(message).split('\n').map((l) => h('p', {}, l)));
  return new Promise((resolve) => {
    const done = (v) => {
      dlg.close();
      $('confirm-ok').removeEventListener('click', onOk);
      $('confirm-cancel').removeEventListener('click', onCancel);
      dlg.removeEventListener('cancel', onCancel);
      resolve(v);
    };
    const onOk = () => done(true);
    const onCancel = () => done(false);
    $('confirm-ok').addEventListener('click', onOk);
    $('confirm-cancel').addEventListener('click', onCancel);
    dlg.addEventListener('cancel', onCancel);
    dlg.showModal();
    $('confirm-cancel').focus();
  });
}

// ---- 起動 --------------------------------------------------------------

goto(1, { focus: false });
// ページを閉じるときに OCR の Worker を終了する
window.addEventListener('pagehide', () => { terminateOcr(); });
window.addEventListener('resize', updateStepper);
