// HP用HTMLの生成。入力は event.json だけ。値のない項目は出力しない（推測で埋めない）。
import { esc, safeHref, langWrap, isLatin, yen, lines, priceText, performerLabel, str, has, val } from './util.js';
import { flyerAlt, performerPhotoAlt } from './alt.js';
import { formatDateJa, datetimeAttr, isIsoDate } from '../core/dates.js';
import { eventType, statusLabel, statusMark, STATUSES, CLOSED_STATUSES, TYPE_SETS, FACILITY_NAME, UPDATE_TYPES } from '../core/schema.js';
import { reviewState } from '../core/field.js';
import { glossaryFor, ABBREVIATIONS } from '../core/phrases.js';
import { canFinalize } from '../core/validate.js';

/** 7:1 以上になる配色（ACCESSIBILITY.md）。a11y チェックでも使う */
export const PALETTE = {
  '--ev-text': '#1a1a1a',
  '--ev-bg': '#ffffff',
  '--ev-link': '#0a3a80',
  '--ev-muted-bg': '#f3f3f0',
  '--ev-border': '#595959',
  '--ev-focus': '#0a3a80',
  '--ev-status-bg': '#fff6d6',
  '--ev-status-text': '#1a1a1a',
  '--ev-draft-bg': '#fde8e8',
  '--ev-draft-text': '#5c0000',
};
export const CONTRAST_PAIRS = [
  ['--ev-text', '--ev-bg', '本文'],
  ['--ev-link', '--ev-bg', 'リンク'],
  ['--ev-text', '--ev-muted-bg', '補足欄の文字'],
  ['--ev-link', '--ev-muted-bg', '補足欄のリンク'],
  ['--ev-status-text', '--ev-status-bg', '販売状況'],
  ['--ev-draft-text', '--ev-draft-bg', '下書き表示'],
  ['--ev-focus', '--ev-bg', 'フォーカス枠'],
];

export const PAGE_CSS = `
:root{${Object.entries(PALETTE).map(([k, v]) => `${k}:${v};`).join('')}}
*{box-sizing:border-box}
body{margin:0;background:var(--ev-bg);color:var(--ev-text);font-family:"Hiragino Sans","Noto Sans JP","Yu Gothic UI",sans-serif;font-size:1.0625rem;line-height:1.8}
.ev-skip{position:absolute;left:0;top:-100px;background:var(--ev-bg);color:var(--ev-link);padding:12px 16px;min-height:44px;z-index:10}
.ev-skip:focus{top:0}
header,main,footer,nav{max-width:48rem;margin:0 auto;padding:0 16px}
h1{font-size:1.75rem;line-height:1.4;margin:1.5rem 0 1rem}
h2{font-size:1.375rem;border-bottom:3px solid var(--ev-border);padding-bottom:.25rem;margin:2.5rem 0 1rem}
h3{font-size:1.125rem;margin:1.5rem 0 .5rem}
section{scroll-margin-top:16px}
a{color:var(--ev-link);text-decoration:underline;text-underline-offset:.2em}
a,button{display:inline-flex;align-items:center;min-height:44px;min-width:44px}
:focus-visible{outline:3px solid var(--ev-focus);outline-offset:3px}
img{max-width:100%;height:auto}
figure{margin:1rem 0}
figcaption{font-size:.9375rem}
dl{display:grid;grid-template-columns:max-content 1fr;gap:.25rem 1rem}
dt{font-weight:700}
dd{margin:0}
@media (max-width:30em){dl{grid-template-columns:1fr}dd{margin-bottom:.5rem}}
ul,ol{padding-left:1.5em}
.ev-status{background:var(--ev-status-bg);color:var(--ev-status-text);border:2px solid var(--ev-border);padding:.75rem 1rem;margin:1rem 0}
.ev-status h2{border:0;margin:0;font-size:1rem}
.ev-status-badge{font-size:1.25rem;font-weight:700;margin:.25rem 0}
.ev-draft{background:var(--ev-draft-bg);color:var(--ev-draft-text);border:3px solid var(--ev-draft-text);padding:.75rem 1rem;font-weight:700}
.ev-note{background:var(--ev-muted-bg);padding:.75rem 1rem}
.ev-review{font-weight:700}
`.trim();

const OVERVIEW_LABEL = {
  performance: '公演概要', family_performance: '公演概要', workshop: 'ワークショップの内容', lecture: '講座の内容',
  exhibition: '展示の概要', recruitment: '募集の概要', multi_event: 'イベントの概要',
};

function performerHeading(type, ev) {
  if (['workshop', 'lecture'].includes(type)) return '講師';
  const roles = ev.performers.items.map((p) => str(p.role));
  if (roles.includes('講師')) return '出演・講師';
  return '出演・プロフィール';
}

/**
 * opts.mode: 'page'（確認用の完全なページ） / 'fragment'（CMSに貼り付ける断片）
 * opts.headingStart: タイトルの見出しレベル（page は 1、fragment は 2 が既定）
 * opts.draft: true なら未確認の項目に［要確認］を付け、下書き表示を入れる。
 *             省略時は確定ゲートを通過していなければ下書き。
 */
export function generateHP(ev, opts = {}) {
  const mode = opts.mode ?? 'fragment';
  const H = opts.headingStart ?? (mode === 'page' ? 1 : 2);
  const gate = canFinalize(ev);
  const draft = opts.draft ?? !gate.ok;
  const type = eventType(ev);
  const warnings = [];
  const sections = [];
  const hx = (lv, id, text) => `<h${Math.min(lv, 6)}${id ? ` id="${id}"` : ''}>${text}</h${Math.min(lv, 6)}>`;

  // 表示用：下書きなら未確認の値に［要確認］を付ける
  const mark = (f) => (draft && has(f) && reviewState(f) === 'needs_review' ? ' <strong class="ev-review">［要確認］</strong>' : '');
  const t = (f) => `${esc(str(f))}${mark(f)}`;
  const tl = (f) => `${langWrap(str(f))}${mark(f)}`;
  const missing = (label) => (draft ? `<p><strong class="ev-review">${esc(label)}：情報なし（要確認）</strong></p>` : '');
  const paras = (f) => lines(str(f)).map((x) => `<p>${esc(x)}</p>`).join('') + (mark(f) ? `<p>${mark(f).trim()}</p>` : '');
  const dl = (rows) => {
    const r = rows.filter(([, f]) => has(f));
    return r.length ? `<dl>${r.map(([k, f, fmt]) => `<dt>${esc(k)}</dt><dd>${fmt ? fmt(f) : t(f)}</dd>`).join('')}</dl>` : '';
  };
  const section = (id, title, body) => {
    if (!body || !body.trim()) return;
    sections.push({ id, title });
    return `<section id="${id}" aria-labelledby="${id}-h">${hx(H + 1, `${id}-h`, esc(title))}${body}</section>`;
  };
  const timeEl = (iso, time, text) => {
    const dt = datetimeAttr(iso, time);
    return dt ? `<time datetime="${dt}">${esc(text)}</time>` : esc(text);
  };
  const dateEl = (f, withYear = true) => {
    const iso = str(f);
    return isIsoDate(iso) ? `${timeEl(iso, null, formatDateJa(iso, { year: withYear }))}${mark(f)}` : t(f);
  };
  const link = (url, text, { external = true } = {}) => {
    const href = safeHref(url);
    if (!href) return esc(text);
    const ext = external && /^https?:/i.test(href);
    return `<a href="${esc(href)}">${esc(text)}${ext ? '（外部サイト）' : ''}</a>`;
  };
  const tel = (f, prefix = '電話') => {
    const n = str(f);
    return n ? `<a href="tel:${esc(n.replace(/[^\d+]/g, ''))}">${esc(prefix)} ${esc(n)}</a>${mark(f)}` : '';
  };
  const abbr = (s) => {
    let out = esc(s);
    for (const [k, title] of Object.entries(ABBREVIATIONS)) {
      if (/^[A-Za-z]+$/.test(k)) continue; // 楽器略号は本文中で誤置換しやすいので対象外
      out = out.replace(new RegExp(k, 'g'), `<abbr title="${esc(title)}">${k}</abbr>`);
    }
    return out;
  };

  const parts = [];
  const title = str(ev.basic.title);

  // 1. ページタイトル
  if (draft) parts.push('<p class="ev-draft" role="note">下書き：確認が済んでいない項目があります。このまま公開しないでください。</p>');
  parts.push(hx(H, 'ev-title', title ? `${esc(title)}${mark(ev.basic.title)}` : '<strong class="ev-review">タイトル：情報なし（要確認）</strong>'));
  if (has(ev.basic.subtitle)) parts.push(`<p class="ev-subtitle">${tl(ev.basic.subtitle)}</p>`);
  // 出演者の一覧（ページ冒頭のお知らせ部分）
  {
    const ps = ev.performers.items.filter((p) => has(p.name));
    if (ps.length && type !== 'recruitment') {
      const word = ['workshop', 'lecture'].includes(type) ? '講師' : '出演';
      parts.push(`<p class="ev-lead-performers">${word}：${ps.map((p) => `${esc(str(p.name))}${performerLabel(p) ? `（${esc(performerLabel(p))}）` : ''}${mark(p.name)}`).join('、')}</p>`);
    }
  }

  // 2. イベント状態
  {
    const code = ev.status?.code ?? 'unset';
    const lbl = code === 'unset' ? '販売・受付状況は未設定です（要確認）' : statusLabel(ev.status);
    const body = [];
    body.push(`<p class="ev-status-badge"><span aria-hidden="true">${esc(statusMark(code))}</span> ${esc(lbl)}</p>`);
    const perSession = ev.schedule.dates.items.filter((d) => d.status && STATUSES[d.status]);
    if (perSession.length) {
      body.push(`<ul>${perSession.map((d) => `<li>${dateEl(d.date)}${has(d.start_time) ? ` ${esc(str(d.start_time))}の回` : ''}${has(d.session_label) ? `（${t(d.session_label)}）` : ''}：<span aria-hidden="true">${esc(statusMark(d.status))}</span> ${esc(STATUSES[d.status].label)}</li>`).join('')}</ul>`);
    }
    const important = [...ev.updates.items].filter((u) => ['performer_change', 'schedule_change', 'program_change'].includes(u.type) || (u.type === 'status' && ['cancelled', 'postponed'].includes(code)))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    if (important.length) {
      body.push(`<ul>${important.map((u) => `<li>${isIsoDate(u.date) ? `${timeEl(u.date, null, formatDateJa(u.date, { year: true }))} ` : ''}【${esc(UPDATE_TYPES[u.type])}】${esc(u.text)}</li>`).join('')}</ul>`);
    }
    sections.push({ id: 'ev-status', title: '販売・受付状況' });
    parts.push(`<section id="ev-status" class="ev-status" aria-labelledby="ev-status-h">${hx(H + 1, 'ev-status-h', '販売・受付状況')}${body.join('')}</section>`);
  }

  // 3. メイン画像
  {
    const img = ev.media.images.items.find((i) => has(i.src));
    const flyerImg = [ev.media.flyer_front, ev.media.flyer].map(str).find((s) => /\.(jpe?g|png|webp|gif)$/i.test(s));
    if (img) {
      const alt = str(img.alt);
      if (!alt) warnings.push('メイン画像の代替テキストが未入力です。');
      const cap = [str(img.caption), has(img.credit) ? `撮影・提供：${str(img.credit)}` : ''].filter(Boolean).join('　');
      parts.push(`<figure class="ev-main-image"><img src="${esc(safeHref(str(img.src)))}" alt="${esc(alt || flyerAlt(ev, 'front'))}">${cap ? `<figcaption>${esc(cap)}</figcaption>` : `<figcaption>${esc(title)}</figcaption>`}</figure>`);
    } else if (flyerImg) {
      parts.push(`<figure class="ev-main-image"><img src="${esc(safeHref(flyerImg))}" alt="${esc(flyerAlt(ev, 'front'))}"><figcaption>チラシ表面（内容は本文に記載しています）</figcaption></figure>`);
    }
  }

  // 4. チラシへのリンク
  {
    const items = [['チラシ', ev.media.flyer], ['チラシ表面', ev.media.flyer_front], ['チラシ裏面', ev.media.flyer_back]]
      .filter(([, f]) => has(f))
      .map(([label, f]) => {
        const s = str(f);
        const kind = /\.pdf$/i.test(s) ? 'PDF' : /\.(jpe?g|png|webp|gif)$/i.test(s) ? '画像' : 'ファイル';
        if (!/^https?:/.test(s)) warnings.push(`「${label}」はファイル名です（${s}）。CMSにアップロードしたURLに置き換えてください。`);
        return `<li>${link(s, `${label}（${kind}）を開く`, { external: false })}</li>`;
      });
    if (items.length) parts.push(`<nav class="ev-flyers" aria-label="チラシ"><ul>${items.join('')}</ul></nav>`);
  }

  // 5. 概要
  {
    const b = [];
    if (has(ev.basic.catchphrase)) b.push(`<p class="ev-catch">${tl(ev.basic.catchphrase)}</p>`);
    if (has(ev.basic.description)) b.push(paras(ev.basic.description));
    parts.push(section('ev-overview', OVERVIEW_LABEL[type], b.join('')));
  }

  // 6. 出演・プロフィール
  if (!['recruitment'].includes(type)) {
    const ps = ev.performers.items.filter((p) => has(p.name));
    const b = ps.map((p) => {
      const name = str(p.name);
      const nameHtml = has(p.reading) ? `<ruby>${esc(name)}<rp>（</rp><rt>${esc(str(p.reading))}</rt><rp>）</rp></ruby>` : esc(name);
      const label = performerLabel(p);
      const head = `${nameHtml}${label ? `（${esc(label)}）` : ''}${mark(p.name)}`;
      const roman = has(p.roman_name) ? `<p class="ev-roman"><span lang="en">${esc(str(p.roman_name))}</span></p>` : '';
      const photo = has(p.photo)
        ? `<figure><img src="${esc(safeHref(str(p.photo)))}" alt="${esc(performerPhotoAlt(p))}"><figcaption>${esc(name)}${has(p.photo_credit) ? `　撮影：${esc(str(p.photo_credit))}` : ''}</figcaption></figure>`
        : '';
      const prof = has(p.profile) ? paras(p.profile) : '';
      return `<li>${hx(H + 2, null, head)}${roman}${photo}${prof}</li>`;
    });
    if (!b.length && draft && !ev.performers.none_confirmed && !['exhibition'].includes(type)) parts.push(section('ev-performers', performerHeading(type, ev), missing('出演者')));
    else if (b.length) parts.push(section('ev-performers', performerHeading(type, ev), `<ul class="ev-performers">${b.join('')}</ul>`));
  }

  // 7. プログラム
  if (TYPE_SETS.PERF.includes(type) || ['lecture', 'multi_event'].includes(type)) {
    const works = ev.program.works.items.filter((w) => has(w.work) || has(w.composer));
    const groups = [];
    for (const w of works) {
      const sec = str(w.section);
      let g = groups.find((x) => x.sec === sec);
      if (!g) groups.push((g = { sec, items: [] }));
      g.items.push(w);
    }
    const li = (w) => {
      const comp = has(w.composer) ? `${langWrap(str(w.composer))}：` : '';
      const work = has(w.work) ? `<cite>${langWrap(str(w.work))}</cite>` : '';
      const note = has(w.notes) ? `（${esc(str(w.notes))}）` : '';
      return `<li>${comp}${work}${note}${mark(w.work) || mark(w.composer)}</li>`;
    };
    let b = groups.map((g) => (g.sec ? `${hx(H + 2, null, esc(g.sec))}<ul>${g.items.map(li).join('')}</ul>` : `<ul>${g.items.map(li).join('')}</ul>`)).join('');
    if (has(ev.program.notes)) b += `<div class="ev-note">${paras(ev.program.notes)}</div>`;
    // 複合イベントの小イベント
    const subs = ev.sub_events.items.filter((s) => has(s.title));
    if (subs.length) {
      const firstDate = str(ev.schedule.dates.items[0]?.date);
      b += `<ul class="ev-sub-events">${subs.map((s) => {
        const time = has(s.start_time) ? `${timeEl(firstDate, str(s.start_time), str(s.start_time))}${has(s.end_time) ? `〜${timeEl(firstDate, str(s.end_time), str(s.end_time))}` : '〜'} ` : '';
        const extra = [has(s.place) ? `場所：${esc(str(s.place))}` : '', has(s.target) ? `対象：${esc(str(s.target))}` : '', has(s.fee) ? `料金：${esc(str(s.fee))}` : '', has(s.application) ? `申込：${esc(str(s.application))}` : ''].filter(Boolean).join('、');
        return `<li>${time}<strong>${t(s.title)}</strong>${extra ? `（${extra}）` : ''}${has(s.description) ? `<br>${esc(str(s.description))}` : ''}</li>`;
      }).join('')}</ul>`;
    }
    parts.push(section('ev-program', type === 'multi_event' ? '催しの内容' : type === 'lecture' ? '講座の内容・プログラム' : 'プログラム', b));
  }

  // 8. 日時
  {
    const b = [];
    const ds = ev.schedule.dates.items.filter((d) => has(d.date));
    if (ds.length) {
      b.push(`<ul class="ev-dates">${ds.map((d) => {
        const iso = str(d.date);
        const seg = [];
        if (has(d.session_label)) seg.push(`【${t(d.session_label)}】`);
        const times = [];
        if (has(d.doors_open)) times.push(`開場 ${timeEl(iso, str(d.doors_open), str(d.doors_open))}${mark(d.doors_open)}`);
        if (has(d.start_time)) times.push(`${TYPE_SETS.PERF.includes(type) ? '開演' : '開始'} ${timeEl(iso, str(d.start_time), str(d.start_time))}${mark(d.start_time)}`);
        if (has(d.end_time)) times.push(`${TYPE_SETS.PERF.includes(type) ? '終演予定' : '終了'} ${timeEl(iso, str(d.end_time), str(d.end_time))}${mark(d.end_time)}`);
        return `<li>${dateEl(d.date)}${mark(d.weekday_on_flyer)} ${seg.join('')}${times.join('／')}${d.status && STATUSES[d.status] ? `（<span aria-hidden="true">${esc(statusMark(d.status))}</span> ${esc(STATUSES[d.status].label)}）` : ''}</li>`;
      }).join('')}</ul>`);
    }
    if (has(ev.schedule.start_date)) {
      b.push(`<p>${type === 'exhibition' ? '会期' : '期間'}：${dateEl(ev.schedule.start_date)}${has(ev.schedule.end_date) ? `〜${dateEl(ev.schedule.end_date)}` : ''}</p>`);
    }
    if (!ds.length && !has(ev.schedule.start_date)) b.push(missing('開催日'));
    b.push(dl([['開館時間', ev.schedule.open_hours], ['休館日', ev.schedule.closed_days], ['上演・所要時間', ev.schedule.duration], ['休憩', ev.schedule.intermission]]));
    if (has(ev.schedule.schedule_notes)) b.push(paras(ev.schedule.schedule_notes));
    parts.push(section('ev-datetime', type === 'exhibition' ? '会期・時間' : '日時', b.join('')));
  }

  // 9. 会場
  {
    const v = str(ev.venue.venue);
    const r = str(ev.venue.room);
    const f = str(ev.venue.floor);
    const text = [v, r && !v.includes(r) ? r : '', f && !v.includes(f) ? `（${f}）` : ''].filter(Boolean).join(' ');
    parts.push(section('ev-venue', '会場', `${v ? '' : missing('会場')}${text ? `<p>${esc(text)}${mark(ev.venue.venue)}</p>` : ''}`));
  }

  // 10. 料金
  {
    const b = [];
    if (has(ev.pricing.seating_type)) b.push(`<p>${abbr(str(ev.pricing.seating_type))}${mark(ev.pricing.seating_type)}${has(ev.pricing.tax_included) ? `（${esc(str(ev.pricing.tax_included))}）` : ''}</p>`);
    const pr = ev.pricing.prices.items.filter((p) => has(p.amount) || has(p.label));
    if (pr.length) {
      b.push(`<dl class="ev-prices">${pr.map((p) => `<dt>${esc(str(p.category) || '料金')}</dt><dd>${esc(priceText(p))}${has(p.note) ? `（${esc(str(p.note))}）` : ''}${mark(p.amount) || mark(p.label) || mark(p.category)}</dd>`).join('')}</dl>`);
    } else if (!ev.pricing.prices.none_confirmed) b.push(missing('料金'));
    if (!has(ev.pricing.seating_type) && has(ev.pricing.tax_included) && pr.length) b.push(`<p>${t(ev.pricing.tax_included)}</p>`);
    b.push(dl([['学生券', ev.pricing.student_requirements]]));
    if (has(ev.pricing.price_notes)) b.push(paras(ev.pricing.price_notes));
    parts.push(section('ev-price', type === 'workshop' || type === 'recruitment' ? '参加費' : type === 'lecture' ? '受講料' : '料金', b.join('')));
  }

  // 11. 対象・年齢条件
  parts.push(section('ev-target', '対象・年齢', dl([
    ['年齢', ev.pricing.age_requirement], ['膝上鑑賞', ev.pricing.lap_seating], ['対象', ev.participation.target_age],
    ['定員', ev.participation.capacity], ['応募資格', ev.participation.eligibility],
  ])));

  // 12. アクセシビリティ
  parts.push(section('ev-accessibility', 'アクセシビリティ・ご来場の配慮', dl([
    ['車いす', ev.accessibility.wheelchair], ['多目的トイレ', ev.accessibility.accessible_toilet], ['ベビーカー', ev.accessibility.stroller],
    ['託児', ev.accessibility.childcare], ['聞こえのサポート', ev.accessibility.hearing_support], ['年齢に関する配慮', ev.accessibility.age_accessibility],
    ['その他', ev.accessibility.accessibility_notes],
  ])));

  // 13. 注意事項
  if (has(ev.notes)) parts.push(section('ev-notes', '注意事項', `<ul>${lines(str(ev.notes)).map((x) => `<li>${esc(x.replace(/^[※*・]\s*/, ''))}</li>`).join('')}</ul>${mark(ev.notes) ? `<p>${mark(ev.notes)}</p>` : ''}`));

  // 14. チケット発売日 / 申込
  const closed = CLOSED_STATUSES.includes(ev.status?.code);
  if (TYPE_SETS.TICKETED.includes(type)) {
    const sched = (ev.tickets.sales_schedule?.items ?? []).filter((x) => has(x.date) || has(x.method));
    if (sched.length) {
      // 販売方法ごとに発売日時を並べる（チラシの販売方法の文言をそのまま使う）
      parts.push(section('ev-sales', 'チケット発売日', `<ul class="ev-sales-schedule">${sched.map((x) => {
        const iso = str(x.date);
        const when = `${dateEl(x.date)}${has(x.time) ? ` ${timeEl(iso, str(x.time), str(x.time))}〜${mark(x.time)}` : ''}`;
        return `<li>${esc(str(x.method) || '発売')}${mark(x.method)}：${when}${has(x.note) ? `（${esc(str(x.note))}）` : ''}</li>`;
      }).join('')}</ul>`));
    } else {
      parts.push(section('ev-sales', 'チケット発売日', dl([
        ['先行発売', ev.tickets.presale], ['一般発売', ev.tickets.sales_start, dateEl], ['電話予約', ev.tickets.advance_phone_start, dateEl],
        ['窓口', ev.tickets.boxoffice_start, dateEl], ['WEB', ev.tickets.online_start, dateEl],
      ])));
    }
  }
  if (TYPE_SETS.PART.includes(type) || type === 'multi_event') {
    const p = ev.participation;
    let b = dl([
      ['参加費', p.participation_fee], ['持ち物', p.belongings], ['申込開始', p.application_start, dateEl], ['申込締切', p.application_deadline, dateEl],
      ['抽選', p.lottery], ['結果通知', p.notification_date],
    ]);
    if (has(p.application_method)) b = `<div>${paras(p.application_method)}</div>${b}`;
    if (has(p.application_url)) b += `<p>${link(str(p.application_url), `「${title}」の申込フォームを開く`)}${mark(p.application_url)}</p>`;
    if (closed && b) b = `<p><strong>受付は終了しました。</strong></p>${b}`;
    parts.push(section('ev-application', type === 'recruitment' ? '応募方法' : '申込方法', b));
  }

  // 15. チケット取扱
  if (TYPE_SETS.TICKETED.includes(type)) {
    const ch = ev.tickets.ticket_channels.items.filter((c) => has(c.name));
    let b = '';
    if (ch.length) {
      b += `<ul>${ch.map((c) => {
        const segs = [`<strong>${t(c.name)}</strong>`];
        if (has(c.phone)) segs.push(tel(c.phone));
        if (has(c.hours)) segs.push(`受付時間 ${esc(str(c.hours))}`);
        if (has(c.url)) segs.push(link(str(c.url), `${str(c.name)}のチケット購入ページ`) + mark(c.url));
        if (has(c.detail)) segs.push(esc(str(c.detail)));
        const notes = has(c.notes) ? `<ul class="ev-channel-notes">${lines(str(c.notes)).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${mark(c.notes)}` : '';
        return `<li>${segs.join('　')}${notes}</li>`;
      }).join('')}</ul>`;
    }
    const codes = ev.tickets.ticket_codes.items.filter((k) => has(k.code));
    if (codes.length) b += `<ul>${codes.map((k) => `<li>${esc(str(k.provider))}：${abbr(str(k.code))}${mark(k.code)}</li>`).join('')}</ul>`;
    b += dl([['支払方法', ev.tickets.payment_methods], ['手数料', ev.tickets.fees]]);
    if (has(ev.tickets.ticket_notes)) b += paras(ev.tickets.ticket_notes);
    if (closed && b) b = `<p><strong>${esc(statusLabel(ev.status))}のため、チケットの販売は行っていません。</strong></p>${b}`;
    parts.push(section('ev-tickets', 'チケット取扱', b));
  }

  // 16. 主催等
  const o = ev.organization;
  parts.push(section('ev-organizer', '主催・共催など', dl([
    ['主催', o.organizer], ['共催', o.co_organizer], ['後援', o.supporter], ['協賛', o.sponsor], ['助成', o.grant], ['協力', o.cooperation],
  ])));

  // 17. 問い合わせ
  {
    const b = [];
    if (has(o.contact)) b.push(`<p>${t(o.contact)}</p>`);
    const li = [];
    if (has(o.phone)) li.push(`<li>${tel(o.phone)}</li>`);
    if (has(o.email)) li.push(`<li><a href="mailto:${esc(str(o.email))}">メール ${esc(str(o.email))}</a>${mark(o.email)}</li>`);
    if (has(o.contact_hours)) li.push(`<li>受付時間 ${t(o.contact_hours)}</li>`);
    if (li.length) b.push(`<ul>${li.join('')}</ul>`);
    if (!has(o.phone) && !o.phone.confirmed) b.push(missing('電話番号'));
    parts.push(section('ev-contact', 'お問い合わせ', b.join('')));
  }

  // 関連リンク
  {
    const ls = ev.links.items.filter((l) => has(l.url));
    const b = ls.map((l) => `<li>${link(str(l.url), str(l.label) || str(l.url))}${mark(l.url) || mark(l.label)}</li>`).join('');
    if (ls.some((l) => !has(l.label))) warnings.push('リンクの説明が未入力のため、URLをリンク文字にしています。行き先がわかる説明を入力してください。');
    if (has(ev.media.video)) {
      parts.push(section('ev-links', '関連リンク', `<ul>${b}<li>${link(str(ev.media.video), `「${title}」の紹介動画`)}</li></ul>`));
    } else if (b) parts.push(section('ev-links', '関連リンク', `<ul>${b}</ul>`));
  }

  // 18. 更新履歴
  if (ev.updates.items.length) {
    const ups = [...ev.updates.items].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    parts.push(section('ev-updates', '更新履歴', `<ul>${ups.map((u) => `<li>${isIsoDate(u.date) ? timeEl(u.date, null, formatDateJa(u.date, { year: true })) : esc(u.date)}　${esc(u.text)}</li>`).join('')}</ul>`));
  }

  // ことばの説明（WCAG 3.1.3）
  const bodySoFar = parts.filter(Boolean).join('');
  const plain = bodySoFar.replace(/<[^>]+>/g, '');
  const terms = glossaryFor(plain);
  if (terms.length) {
    parts.push(section('ev-glossary', 'ことばの説明', `<dl>${terms.map(([k, v]) => `<dt><dfn>${esc(k)}</dfn></dt><dd>${esc(v)}</dd>`).join('')}</dl>`));
  }

  const article = `<article class="sakura-event" aria-labelledby="ev-title">${parts.filter(Boolean).join('\n')}</article>`;

  if (mode !== 'page') return { html: article, draft, warnings, sections, gate };

  const toc = sections.filter((s) => s.id !== 'ev-status');
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title || 'イベント')}｜${esc(FACILITY_NAME)}${draft ? '（下書き）' : ''}</title>
<style>
${PAGE_CSS}
</style>
</head>
<body>
<a class="ev-skip" href="#main">本文へ移動</a>
<header><p>${esc(FACILITY_NAME)}　イベント情報</p></header>
<nav aria-label="このページの目次"><ol>${toc.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')}</ol></nav>
<main id="main" tabindex="-1">
${article}
</main>
<footer><p>${esc(FACILITY_NAME)}</p></footer>
</body>
</html>`;
  return { html, draft, warnings, sections, gate };
}
