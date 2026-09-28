// STEP 3 左側：チラシのプレビュー（PDFはページごとに描画、画像はそのまま、貼り付けた文字は文字で表示）
import { h, nextId } from './dom.js';
import { renderPdfPage } from '../extract/pdf.js';

export function createPreview(root, getSources) {
  let fileIndex = 0;
  let page = 1;

  async function render() {
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
    sel.addEventListener('change', () => { fileIndex = Number(sel.value); page = 1; render(); });
    const nav = h('div', { class: 'pv-nav' },
      h('button', { type: 'button', class: 'btn-secondary', disabled: page <= 1, onclick: () => { page -= 1; render(); } }, '前のページ'),
      h('span', { 'aria-live': 'polite' }, `${page} / ${pages} ページ`),
      h('button', { type: 'button', class: 'btn-secondary', disabled: page >= pages, onclick: () => { page += 1; render(); } }, '次のページ'),
    );
    root.append(h('div', { class: 'fld' }, h('label', { for: selId }, '表示するファイル'), sel), nav);

    const figure = h('figure', { class: 'pv-figure' });
    if (src.kind === 'pdf' && src.pdf) {
      const canvas = h('canvas', { role: 'img', 'aria-label': `${src.name} の ${page}ページ目。取り出した文字は下の「取り出した文字」で確認できます。` });
      figure.append(canvas, h('figcaption', {}, `${src.name}　${page}ページ`));
      root.append(figure);
      try {
        await renderPdfPage(src.pdf, page, canvas, root.clientWidth || 600);
      } catch (e) {
        figure.append(h('p', { class: 'err' }, `エラー：PDFを表示できませんでした（${e.message}）`));
      }
    } else if (src.kind === 'image' && src.url) {
      figure.append(h('img', { src: src.url, alt: `${src.name}（チラシの画像。文字の読み取りは準備中のため、右側の項目と見比べて確認してください）` }), h('figcaption', {}, src.name));
      root.append(figure);
    } else {
      root.append(h('p', { class: 'help' }, '貼り付けた文字から取り出しています。'));
    }

    const text = src.pages?.[page - 1]?.text ?? '';
    root.append(h('details', { class: 'pv-text', open: src.kind === 'text' },
      h('summary', {}, `取り出した文字（${page}ページ）`),
      text ? h('pre', { tabindex: '0' }, text) : h('p', {}, '文字を取り出せませんでした。'),
    ));
  }

  return { render };
}
