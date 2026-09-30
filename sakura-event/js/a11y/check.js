// AAA対応チェック（ACCESSIBILITY.md 3章）。
// 自動検査の結果と、人による確認が必要な項目を分けて返す。
// 「AAA適合」とは判定しない（システムだけでは適合を断定できないため）。
import { PALETTE, CONTRAST_PAIRS } from '../generate/hp.js';
import { VAGUE_LINK_TEXTS, ABBREVIATIONS, GLOSSARY, findUnsupportedPhrases } from '../core/phrases.js';
import { isLatin } from '../generate/util.js';

export const MANUAL_ITEMS = [
  ['M01', '代替テキストが画像の内容・目的を正しく伝えているか', '1.1.1'],
  ['M02', '見出しの文言がセクションの内容を表しているか', '2.4.6'],
  ['M03', 'CMSに貼り付けた後も、読み上げ順序が意味の順序として自然か', '1.3.2'],
  ['M04', 'CMSのヘッダー・メニューを含めてキーボードだけで操作でき、フォーカスが隠れないか', '2.1.3, 2.4.12'],
  ['M05', 'CMSのテンプレートの配色・文字サイズでもコントラスト（7:1）が保たれるか', '1.4.6'],
  ['M06', '紹介文・プロフィールが読みやすいか（難しい場合は補足を追加）', '3.1.5'],
  ['M07', '欧文として lang="en" を付けた部分が本当に英語か（独・仏・伊語などは lang を修正）', '3.1.2'],
  ['M08', 'チラシPDF自体のアクセシビリティ（タグ付きPDFか）と、HP本文に同じ情報があるか', '1.1.1'],
  ['M09', '動画がある場合、字幕・音声解説・手話の有無', '1.2.x'],
  ['M10', 'チラシ画像内の文字情報がすべて本文に書かれているか', '1.4.9'],
  ['M11', '「ことばの説明」が適切か、追加すべき語がないか', '3.1.3'],
  ['M12', '点滅・自動再生するコンテンツがないか', '2.3.2, 2.2.2'],
];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
}
function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrastRatio(fg, bg) {
  const a = luminance(hexToRgb(fg));
  const b = luminance(hexToRgb(bg));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** CSS の :root から --変数: #色 を読み取る */
export function parseCssVars(css) {
  const vars = {};
  for (const m of String(css ?? '').matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})/g)) vars[m[1]] = m[2];
  return vars;
}

/**
 * doc: 生成HTMLを解析した Document（ブラウザは DOMParser、テストは linkedom）
 * opts: { mode: 'page'|'fragment', css, draft, sourceText, statusCode }
 */
export function runA11yChecks(doc, opts = {}) {
  const mode = opts.mode ?? 'page';
  const page = mode === 'page';
  const results = [];
  const add = (id, label, sc, result, detail = '') => results.push({ id, label, sc, result, detail });
  const all = (sel) => [...doc.querySelectorAll(sel)];
  const text = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  const root = doc.querySelector('article.sakura-event') ?? doc.body ?? doc.documentElement;

  // A01 lang
  if (page) {
    const lang = doc.documentElement.getAttribute('lang');
    add('A01', 'html要素に lang="ja" がある', '3.1.1', lang === 'ja' ? 'pass' : 'fail', lang ? `lang="${lang}"` : 'lang属性がありません');
  } else add('A01', 'html要素に lang="ja" がある', '3.1.1', 'na', 'CMSのページ側で設定（人による確認）');

  // A02 Language of Parts
  {
    const candidates = all('li, p, dd, cite, h3, h4').filter((el) => el.children.length === 0 && isLatin(text(el)) && !el.closest('[lang]:not(html)'));
    const spans = all('[lang="en"]').length;
    add('A02', '欧文（ラテン文字だけの名前・曲名）に lang 属性がある', '3.1.2', candidates.length ? 'fail' : 'pass',
      candidates.length ? `lang のない欧文：${candidates.slice(0, 3).map(text).join('、')}` : `lang="en" の箇所：${spans}`);
  }

  // A03 h1
  const headings = all('h1,h2,h3,h4,h5,h6');
  if (page) {
    const h1 = all('h1').length;
    add('A03', 'h1 が1つだけある', '1.3.1', h1 === 1 ? 'pass' : 'fail', `h1 の数：${h1}`);
  } else add('A03', 'h1 が1つだけある', '1.3.1', 'na', 'CMSのページタイトルが h1 になる想定（人による確認）');

  // A04 見出しの飛び越し
  {
    let prev = null;
    const skips = [];
    for (const h of headings) {
      const lv = Number(h.tagName[1]);
      if (prev !== null && lv > prev + 1) skips.push(`${h.tagName}「${text(h).slice(0, 20)}」`);
      prev = lv;
    }
    add('A04', '見出しレベルの飛び越しがない', '1.3.1', skips.length ? 'fail' : 'pass', skips.length ? `飛び越し：${skips.join('、')}` : `見出し数：${headings.length}`);
  }

  // A05 空の見出し
  {
    const empty = headings.filter((h) => !text(h));
    add('A05', '空の見出しがない', '2.4.6', empty.length ? 'fail' : 'pass', empty.length ? `${empty.length}件` : '');
  }

  // A06 main
  if (page) add('A06', 'main ランドマークがある', '1.3.1', all('main').length === 1 ? 'pass' : 'fail', `main の数：${all('main').length}`);
  else add('A06', 'main ランドマークがある', '1.3.1', 'na', 'CMSのテンプレートで確認（人による確認）');

  // A07 スキップリンク
  if (page) {
    const skip = all('a[href^="#"]')[0];
    const target = skip ? doc.getElementById(skip.getAttribute('href').slice(1)) : null;
    add('A07', 'スキップリンクがあり、移動先が存在する', '2.4.1', skip && target && /本文|skip/i.test(text(skip)) ? 'pass' : 'fail', skip ? `「${text(skip)}」→ #${target?.id ?? '（移動先なし）'}` : 'スキップリンクがありません');
  } else add('A07', 'スキップリンクがあり、移動先が存在する', '2.4.1', 'na', 'CMSのテンプレートで確認');

  // A08 alt
  {
    const imgs = all('img');
    const bad = imgs.filter((i) => {
      const alt = i.getAttribute('alt');
      if (alt === null) return true;
      return /\.(jpe?g|png|gif|webp|pdf)$/i.test(alt.trim()) || /^(画像|写真|image|photo|img)$/i.test(alt.trim());
    });
    add('A08', 'すべての画像に適切な alt がある', '1.1.1', imgs.length === 0 ? 'na' : bad.length ? 'fail' : 'pass',
      imgs.length === 0 ? '画像なし' : bad.length ? `不適切な alt：${bad.length}件` : `画像：${imgs.length}件`);
  }

  // A09 figcaption
  {
    const figs = all('figure');
    const bad = figs.filter((f) => !f.querySelector('figcaption') || !text(f.querySelector('figcaption')));
    add('A09', 'figure に figcaption がある', '1.3.1', figs.length === 0 ? 'na' : bad.length ? 'fail' : 'pass', figs.length ? `figure：${figs.length}件` : 'figureなし');
  }

  // A10 time
  {
    const times = all('time');
    const re = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(\+09:00)?)?$/;
    const bad = times.filter((t) => !re.test(t.getAttribute('datetime') ?? ''));
    add('A10', 'time 要素の datetime が有効', '1.3.1', times.length === 0 ? 'fail' : bad.length ? 'fail' : 'pass',
      times.length === 0 ? '日付に time 要素がありません' : bad.length ? `無効：${bad.length}件` : `time：${times.length}件`);
  }

  // A11 リンクテキスト
  const links = all('a[href]').filter((a) => !a.classList.contains('ev-skip'));
  {
    const bad = links.filter((a) => {
      const t = text(a).replace(/（外部サイト）$/, '');
      return !t || VAGUE_LINK_TEXTS.includes(t.toLowerCase()) || /^https?:\/\//.test(t);
    });
    add('A11', 'リンクテキストで行き先がわかる（「こちら」やURLだけではない）', '2.4.4, 2.4.9', links.length === 0 ? 'na' : bad.length ? 'fail' : 'pass',
      bad.length ? `不十分：${bad.map((a) => `「${text(a)}」`).slice(0, 3).join('、')}` : `リンク：${links.length}件`);
  }

  // A12 同じテキストで行き先が違うリンク
  {
    const map = new Map();
    for (const a of links) {
      const t = text(a);
      const h = a.getAttribute('href');
      if (!map.has(t)) map.set(t, new Set());
      map.get(t).add(h);
    }
    const dup = [...map.entries()].filter(([, s]) => s.size > 1).map(([t]) => t);
    add('A12', '同じリンクテキストで行き先が違うリンクがない', '2.4.9', dup.length ? 'fail' : links.length ? 'pass' : 'na', dup.length ? dup.join('、') : '');
  }

  // A13 table
  {
    const tables = all('table');
    const bad = tables.filter((t) => !t.querySelector('caption') || !t.querySelector('th'));
    add('A13', 'レイアウト目的の table がない', '1.3.1', bad.length ? 'fail' : 'pass', tables.length ? `table：${tables.length}件` : 'table なし');
  }

  // A14 id重複
  {
    const ids = all('[id]').map((e) => e.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    add('A14', 'id が重複していない', '4.1.1', dup.length ? 'fail' : 'pass', dup.length ? [...new Set(dup)].join('、') : '');
  }

  // A15 状態表示に文字
  {
    const badge = root.querySelector('.ev-status-badge');
    const t = badge ? text(badge).replace(/[◇●▲✕！－]/g, '').trim() : '';
    add('A15', '販売・受付状況が文字で書かれている（色だけでない）', '1.4.1', badge && t ? 'pass' : 'fail', badge ? `「${text(badge)}」` : '状況表示がありません');
  }

  // A16 コントラスト
  if (page) {
    const vars = opts.css === undefined ? PALETTE : parseCssVars(opts.css);
    const low = [];
    const rows = [];
    for (const [fg, bg, label] of CONTRAST_PAIRS) {
      if (!vars[fg] || !vars[bg]) { low.push(`${label}（色が未定義）`); continue; }
      const r = contrastRatio(vars[fg], vars[bg]);
      rows.push(`${label} ${r.toFixed(1)}:1`);
      if (r < 7) low.push(`${label} ${r.toFixed(2)}:1`);
    }
    add('A16', '文字と背景のコントラストが 7:1 以上', '1.4.6', low.length ? 'fail' : 'pass', low.length ? `不足：${low.join('、')}` : rows.join('、'));
  } else add('A16', '文字と背景のコントラストが 7:1 以上', '1.4.6', 'na', 'CMSのCSSに依存（人による確認 M05）');

  // A17 ターゲットサイズ
  if (page) {
    const css = opts.css ?? '';
    const m = css.match(/min-height\s*:\s*(\d+)px/);
    const ok = m && Number(m[1]) >= 44;
    add('A17', 'リンク・ボタンの最小サイズが 44px 以上', '2.5.5', ok ? 'pass' : 'fail', m ? `min-height:${m[1]}px` : '指定がありません');
  } else add('A17', 'リンク・ボタンの最小サイズが 44px 以上', '2.5.5', 'na', 'CMSのCSSに依存');

  // A18 フォーカス
  if (page) {
    const css = opts.css ?? '';
    const m = css.match(/:focus-visible\s*\{[^}]*outline\s*:\s*(\d+)px/);
    add('A18', 'フォーカスが見える（3px 以上の枠）', '2.4.7, 2.4.13', m && Number(m[1]) >= 3 ? 'pass' : 'fail', m ? `outline ${m[1]}px` : ':focus-visible の指定がありません');
  } else add('A18', 'フォーカスが見える（3px 以上の枠）', '2.4.7, 2.4.13', 'na', 'CMSのCSSに依存');

  // A19 略語
  {
    const plain = text(root);
    const used = Object.keys(ABBREVIATIONS).filter((k) => !/^[A-Za-z]+$/.test(k) && plain.includes(k));
    const missing = used.filter((k) => !all('abbr[title]').some((a) => text(a) === k));
    add('A19', '略語（Pコード等）に説明（abbr title）がある', '3.1.4', used.length === 0 ? 'na' : missing.length ? 'fail' : 'pass', used.length ? `略語：${used.join('、')}${missing.length ? `（説明なし：${missing.join('、')}）` : ''}` : '略語なし');
  }

  // A20 見慣れない語
  {
    const glossary = root.querySelector('#ev-glossary');
    const body = [...root.children].filter((c) => c.id !== 'ev-glossary').map(text).join(' ');
    const used = Object.keys(GLOSSARY).filter((k) => body.includes(k));
    const explained = glossary ? [...glossary.querySelectorAll('dfn')].map(text) : [];
    const missing = used.filter((k) => !explained.includes(k));
    add('A20', '見慣れない語に「ことばの説明」がある', '3.1.3', used.length === 0 ? 'na' : missing.length ? 'fail' : 'pass', used.length ? `説明している語：${explained.join('、')}` : '該当する語なし');
  }

  // A21 情報なし・要確認が残っていない
  {
    const plain = text(root);
    const left = /(情報なし|要確認|［HPページのURL］)/.test(plain);
    add('A21', '「情報なし」「要確認」が残っていない（確定版）', '―', left ? (opts.draft ? 'warn' : 'fail') : 'pass', left ? '下書きの表示が残っています' : '');
  }

  // A22 禁止表現
  {
    const bad = findUnsupportedPhrases(text(root), opts.sourceText ?? text(root), opts.statusCode);
    add('A22', '資料で裏付けられない誇張表現がない', '―', bad.length ? 'fail' : 'pass', bad.length ? bad.join('、') : '');
  }

  // A23 外部リンクの明示
  {
    const ext = links.filter((a) => /^https?:/i.test(a.getAttribute('href') ?? ''));
    const bad = ext.filter((a) => !/外部サイト/.test(text(a)));
    add('A23', '外部サイトへのリンクであることが書かれている', '3.2.5', ext.length === 0 ? 'na' : bad.length ? 'fail' : 'pass', ext.length ? `外部リンク：${ext.length}件` : '外部リンクなし');
  }

  const summary = {
    pass: results.filter((r) => r.result === 'pass').length,
    fail: results.filter((r) => r.result === 'fail').length,
    warn: results.filter((r) => r.result === 'warn').length,
    na: results.filter((r) => r.result === 'na').length,
  };
  return {
    auto: results,
    manual: MANUAL_ITEMS.map(([id, label, sc]) => ({ id, label, sc })),
    summary,
  };
}

const RESULT_LABEL = { pass: '✓ 合格', fail: '✕ 不合格', warn: '！ 注意', na: '－ 該当なし' };

export function reportText(report, { title = '', mode = 'page', generatedAt = new Date().toISOString() } = {}) {
  const out = [
    'AAA対応チェック報告（WCAG 2.2）',
    `対象：${title || '（タイトル未入力）'}　出力形式：${mode === 'page' ? '確認用ページ' : 'CMS貼り付け用HTML'}`,
    `作成日時：${generatedAt}`,
    '',
    '※この報告はシステムによる確認の結果です。「AAA適合」を示すものではありません。',
    '　適合はCMSのテンプレートや画像の内容を含むページ全体で、人が確認して判断してください。',
    '',
    `■自動検査　合格 ${report.summary.pass}／不合格 ${report.summary.fail}／注意 ${report.summary.warn}／該当なし ${report.summary.na}`,
    ...report.auto.map((r) => `${RESULT_LABEL[r.result]}　${r.id} ${r.label}（SC ${r.sc}）${r.detail ? `　${r.detail}` : ''}`),
    '',
    '■人による確認が必要な項目（未確認）',
    ...report.manual.map((m) => `□ ${m.id} ${m.label}（SC ${m.sc}）`),
  ];
  return out.join('\n');
}

export { RESULT_LABEL };
