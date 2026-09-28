// STEP 4（生成・プレビュー）と STEP 5（コピー・書き出し）
import { h, nextId, copyText, download } from './dom.js';
import { generateHP, PAGE_CSS } from '../generate/hp.js';
import { generateText } from '../generate/text.js';
import { generateAllSns, PLATFORMS, KINDS, X_LIMIT } from '../generate/sns.js';
import { allAlts } from '../generate/alt.js';
import { runA11yChecks, reportText, RESULT_LABEL } from '../a11y/check.js';
import { str } from '../core/field.js';

/** event.json からすべての出力を作る（同じ event.json から HP と SNS を作る） */
export function buildOutputs(ev, { draft }) {
  const title = str(ev.basic.title) || 'event';
  const base = ev.event_id || 'event';
  const page = generateHP(ev, { mode: 'page', draft });
  const frag = generateHP(ev, { mode: 'fragment', draft });
  const text = generateText(ev, { draft });
  const sns = generateAllSns(ev, { pageUrl: ev.meta?.page_url });
  const alts = allAlts(ev);
  const doc = new DOMParser().parseFromString(page.html, 'text/html');
  const report = runA11yChecks(doc, { mode: 'page', css: PAGE_CSS, draft, statusCode: ev.status?.code });
  const fragDoc = new DOMParser().parseFromString(`<!doctype html><html lang="ja"><body>${frag.html}</body></html>`, 'text/html');
  const fragReport = runA11yChecks(fragDoc, { mode: 'fragment', draft, statusCode: ev.status?.code });
  const reportTxt = [
    reportText(report, { title, mode: 'page' }),
    '',
    '――――――――――',
    '',
    reportText(fragReport, { title, mode: 'fragment' }),
  ].join('\n');
  const suffix = draft ? '-draft' : '';
  const items = [
    { id: 'json', label: 'event.json', filename: `${base}.json`, mime: 'application/json', content: JSON.stringify(ev, null, 2) },
    { id: 'hp-fragment', label: 'HP用HTML（CMSに貼り付ける部分）', filename: `${base}${suffix}-fragment.html`, mime: 'text/html', content: frag.html, warnings: frag.warnings },
    { id: 'hp-page', label: 'HP用HTML（確認用の完全なページ）', filename: `${base}${suffix}.html`, mime: 'text/html', content: page.html, warnings: page.warnings },
    { id: 'hp-text', label: 'HP用プレーンテキスト', filename: `${base}${suffix}.txt`, mime: 'text/plain', content: text.text },
    ...sns.map((s) => ({
      id: `sns-${s.platform}-${s.kind}`, label: `${PLATFORMS[s.platform]}：${s.kind}. ${KINDS[s.kind]}`,
      filename: `${base}${suffix}-${s.platform}-${s.kind}.txt`, mime: 'text/plain', content: s.text, message: s.message,
      warnings: draft && s.ok ? ['下書きです。未確認の項目を含んでいる可能性があります。', ...s.warnings] : s.warnings,
      meta: s.ok ? (s.platform === 'x' ? `文字数（Xの数え方）：${s.length} / ${X_LIMIT}` : `文字数：${s.length}`) : '',
    })),
    { id: 'alt', label: '画像の代替テキスト', filename: `${base}-alt.txt`, mime: 'text/plain', content: alts.map((a) => `■${a.target}\n${a.alt}`).join('\n\n') },
    { id: 'a11y', label: 'AAA対応チェック報告', filename: `${base}${suffix}-accessibility-report.txt`, mime: 'text/plain', content: reportTxt },
  ];
  return { items, page, frag, report, fragReport, draft };
}

function outputCard(item, { preview = true } = {}) {
  const hid = nextId('out');
  const card = h('section', { class: 'out-card', 'aria-labelledby': hid }, h('h3', { id: hid }, item.label));
  if (item.message) {
    card.append(h('p', { class: 'st st-missing msg' }, `－ ${item.message}`));
    return card;
  }
  if (item.meta) card.append(h('p', { class: 'help' }, item.meta));
  for (const w of item.warnings ?? []) card.append(h('p', { class: 'st st-needs_review' }, `！ ${w}`));
  if (preview) {
    const taId = nextId('ta');
    const ta = h('textarea', { id: taId, readonly: true, rows: item.id.startsWith('sns') ? 10 : 8, class: 'out-text' });
    ta.value = item.content;
    card.append(h('label', { for: taId, class: 'visually-hidden' }, `${item.label}の内容`), ta);
  }
  card.append(h('div', { class: 'fld-actions' },
    h('button', { type: 'button', class: 'btn-primary', onclick: () => copyText(item.content, item.label) }, `${item.label}をコピー`),
    h('button', { type: 'button', class: 'btn-secondary', onclick: () => download(item.filename, item.content, item.mime) }, `${item.filename} を保存`),
  ));
  return card;
}

/** STEP 4：プレビュー */
export function renderStep4(root, out) {
  root.replaceChildren();
  // HPプレビュー
  const hpId = nextId('h');
  const iframe = h('iframe', { title: 'HPページのプレビュー', sandbox: '', class: 'hp-frame' });
  iframe.srcdoc = out.page.html;
  root.append(h('section', { class: 'group', 'aria-labelledby': hpId }, h('h3', { id: hpId }, 'HPページのプレビュー'),
    out.draft ? h('p', { class: 'st st-needs_review' }, '！ 下書きです。未確認の項目に［要確認］が付いています。') : h('p', { class: 'st st-confirmed' }, '✓ 確定版です。'),
    ...out.page.warnings.map((w) => h('p', { class: 'st st-needs_review' }, `！ ${w}`)),
    iframe));

  // SNS
  const snsId = nextId('h');
  const grid = h('div', { class: 'sns-grid' });
  for (const item of out.items.filter((i) => i.id.startsWith('sns-'))) grid.append(outputCard(item));
  root.append(h('section', { class: 'group', 'aria-labelledby': snsId }, h('h3', { id: snsId }, 'SNS投稿（下書き）'),
    h('p', { class: 'help' }, '投稿前に必ず読み直してください。足りない情報は自動で補いません。'), grid));

  // 代替テキスト
  root.append(outputCard(out.items.find((i) => i.id === 'alt')));

  // AAA対応チェック
  const aId = nextId('h');
  const rep = out.report;
  const autoList = h('ul', { class: 'a11y-list' }, rep.auto.map((r) => h('li', { class: `a11y-${r.result}` },
    h('strong', {}, RESULT_LABEL[r.result]), `　${r.id} ${r.label}（SC ${r.sc}）`, r.detail ? h('span', { class: 'help' }, `　${r.detail}`) : null)));
  const manualList = h('ul', { class: 'a11y-manual' }, rep.manual.map((m) => {
    const cid = nextId('m');
    return h('li', {}, h('input', { type: 'checkbox', id: cid }), h('label', { for: cid }, ` ${m.id} ${m.label}（SC ${m.sc}）`));
  }));
  root.append(h('section', { class: 'group', 'aria-labelledby': aId }, h('h3', { id: aId }, 'AAA対応チェック（WCAG 2.2）'),
    h('p', { class: 'help' }, 'システムによる確認の結果です。「AAA適合」を示すものではありません。CMSに掲載した後のページ全体を、人が確認して判断してください。'),
    h('h4', {}, `自動検査（合格 ${rep.summary.pass}／不合格 ${rep.summary.fail}／注意 ${rep.summary.warn}／該当なし ${rep.summary.na}）`), autoList,
    h('h4', {}, '人による確認が必要な項目'), manualList));
}

/** STEP 5：コピー・書き出し */
export function renderStep5(root, out) {
  root.replaceChildren();
  if (out.draft) root.append(h('p', { class: 'st st-needs_review' }, '！ 下書きの出力です。ファイル名に「-draft」が付きます。公開用には STEP 4 で確定してください。'));
  for (const item of out.items) root.append(outputCard(item));
}
