// STEP 3 左側：チラシのプレビュー（PDFはページごとに描画、画像はそのまま、貼り付けた文字は文字で表示）。
// 項目を選ぶと、取得元のページに移り、OCR・PDFの文字の位置情報があれば該当箇所を枠で強調する。
import { h, nextId } from './dom.js';
import { renderPdfPage } from '../extract/pdf.js';

export function createPreview(root, getSources) {
  let fileIndex = 0;
  let page = 1;
  let mark = null; // { bbox }
  let renderSeq = 0;

  async function render() {
    const seq = ++renderSeq;
    const sources = getSources();
    root.replaceChildren();
    if (!sources.length) {
      root.append(h('p', {}, 'チラシのファイルがありません。STEP 1 でアップロードするか、右側の項目に直接入力してください。'));
      return;
    }
    fileIndex = Math.min(fileIndex, sources.length - 1);
    const src = sources[fileIndex];
    const pages = src.pages?.length || 1;
    page = Math.min(Math.max(1, page), pages);

    const selId = nextId('pv');
    const sel = h('select', { id: selId }, sources.map((s, i) => h('option', { value: i, selected: i === fileIndex }, `${s.name}（${s.sideLabel ?? ''}${s.kind === 'pdf' ? `PDF・${s.pages.length}ページ` : s.kind === 'image' ? '画像' : '文字'}）`)));
    sel.addEventListener('change', () => { fileIndex = Number(sel.value); page = 1; mark = null; render(); });
    const nav = h('div', { class: 'pv-nav' },
      h('button', { type: 'button', class: 'btn-secondary', disabled: page <= 1, onclick: () => { page -= 1; mark = null; render(); } }, '前のページ'),
      h('span', {}, `${page} / ${pages} ページ`),
      h('button', { type: 'button', class: 'btn-secondary', disabled: page >= pages, onclick: () => { page += 1; mark = null; render(); } }, '次のページ'),
    );
    root.append(h('div', { class: 'fld' }, h('label', { for: selId }, '表示するファイル'), sel), nav);

    const stage = h('div', { class: 'pv-stage' });
    const figure = h('figure', { class: 'pv-figure' }, stage);
    const overlay = mark?.bbox ? h('div', { class: 'pv-mark', 'aria-hidden': 'true' }) : null;
    if (overlay) {
      const b = mark.bbox;
      const pad = 0.004;
      Object.assign(overlay.style, {
        left: `${Math.max(0, b.x0 - pad) * 100}%`, top: `${Math.max(0, b.y0 - pad) * 100}%`,
        width: `${Math.min(1, b.x1 - b.x0 + pad * 2) * 100}%`, height: `${Math.min(1, b.y1 - b.y0 + pad * 2) * 100}%`,
      });
    }
    if (src.kind === 'pdf' && src.pdf) {
      const canvas = h('canvas', { role: 'img', 'aria-label': `${src.name} の ${page}ページ目。取り出した文字は下の「取り出した文字」で確認できます。` });
      stage.append(canvas);
      if (overlay) stage.append(overlay);
      figure.append(h('figcaption', {}, `${src.name}　${page}ページ`));
      root.append(figure);
      try {
        await renderPdfPage(src.pdf, page, canvas, root.clientWidth || 600);
      } catch (e) {
        if (seq === renderSeq) figure.append(h('p', { class: 'err' }, `エラー：PDFを表示できませんでした（${e.message}）`));
      }
    } else if (src.kind === 'image' && src.url) {
      stage.append(h('img', { src: src.url, alt: `${src.name}（チラシの画像。右側の項目と見比べて確認してください）` }));
      if (overlay) stage.append(overlay);
      figure.append(h('figcaption', {}, src.name));
      root.append(figure);
    } else {
      root.append(h('p', { class: 'help' }, '貼り付けた文字から取り出しています。'));
    }
    if (mark) {
      root.append(h('p', { class: 'help', role: 'status' }, mark.bbox
        ? '枠で囲んだ部分が、選んだ項目の取得元（読み取った位置の目安）です。チラシの文字と照合してください。'
        : '選んだ項目は、このページから取り出しました（位置の情報はありません）。'));
    }

    const pg = src.pages?.[page - 1];
    const text = pg?.text ?? '';
    root.append(h('details', { class: 'pv-text', open: src.kind === 'text' },
      h('summary', {}, `取り出した文字（${page}ページ${pg?.mode ? `・${{ pdf: 'PDFの文字', ocr: 'OCR', merge: 'PDFの文字＋OCR' }[pg.mode]}` : ''}）`),
      text ? h('pre', { tabindex: '0' }, text) : h('p', {}, '文字を取り出せませんでした。'),
    ));
  }

  /** 取得元のファイル・ページに移り、位置があれば強調する */
  function highlight(fileName, pageNo, bbox) {
    const sources = getSources();
    const i = sources.findIndex((s) => s.name === fileName);
    if (i < 0) return;
    const changed = i !== fileIndex || (pageNo && pageNo !== page) || JSON.stringify(bbox ?? null) !== JSON.stringify(mark?.bbox ?? null);
    fileIndex = i;
    if (pageNo) page = pageNo;
    mark = { bbox: bbox ?? null };
    if (changed) render();
  }

  return { render, highlight };
}
