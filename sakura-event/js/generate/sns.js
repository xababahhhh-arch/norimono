// SNS投稿の生成（SNS_RULES.md）。X / Facebook / Instagram × A（お知らせ）B（アーティスト）C（プログラム）。
// 入力は event.json だけ。足りない情報はAIで補わず、メッセージを返す。
import { lines, priceText, performerLabel, str, has } from './util.js';
import { formatDateJa, formatDateShort, isIsoDate } from '../core/dates.js';
import { eventType, statusLabel, CLOSED_STATUSES, TYPE_SETS } from '../core/schema.js';
import { findUnsupportedPhrases } from '../core/phrases.js';

export const PLATFORMS = { x: 'X', facebook: 'Facebook', instagram: 'Instagram' };
export const KINDS = { A: '公演のお知らせ', B: 'アーティストの魅力', C: 'プログラム内容について' };

export const MSG_NO_PROFILE = '出演者プロフィール情報を追加してください';
export const MSG_NO_PROGRAM = 'プログラム情報が登録されていません';
export const MSG_NO_BASIC = 'タイトルと開催日を確認してください';
export const URL_PLACEHOLDER = '［HPページのURL］';
export const X_LIMIT = 280;

const FIXED_TAGS = ['さくらプラザ', '戸塚区民文化センター', '戸塚'];

/** X の重み付き文字数（全角2・半角1・URLは23） */
export function xLength(text) {
  let n = 0;
  const withoutUrls = text.replace(/https?:\/\/\S+/g, () => { n += 23; return ''; });
  for (const ch of withoutUrls) {
    const cp = ch.codePointAt(0);
    const light = (cp <= 4351) || (cp >= 8192 && cp <= 8205) || (cp >= 8208 && cp <= 8223) || (cp >= 8242 && cp <= 8247);
    n += light ? 1 : 2;
  }
  return n;
}

function tag(s) {
  const t = String(s ?? '').replace(/[\s・,，、.。()（）'’"「」『』\-–—:：/／!！?？&＆]/g, '');
  return t && t.length <= 30 ? `#${t}` : null;
}

function facts(ev, opts) {
  const type = eventType(ev);
  const title = str(ev.basic.title);
  const dates = ev.schedule.dates.items.filter((d) => isIsoDate(str(d.date)));
  const uniqDates = [...new Set(dates.map((d) => str(d.date)))];
  const perf = TYPE_SETS.PERF.includes(type);
  const startWord = perf ? '開演' : '開始';
  const code = ev.status?.code ?? 'scheduled';
  const closed = CLOSED_STATUSES.includes(code);
  const url = str(opts.pageUrl ?? ev.meta?.page_url) || URL_PLACEHOLDER;
  const venue = [str(ev.venue.venue), str(ev.venue.room) && !str(ev.venue.venue).includes(str(ev.venue.room)) ? str(ev.venue.room) : ''].filter(Boolean).join(' ');
  const venueShort = venue.replace(/戸塚区民文化センター\s*/, '');

  // 日時（X用の短い表記）
  let dateShort = '';
  if (uniqDates.length) {
    dateShort = uniqDates.map((iso) => {
      const ts = dates.filter((d) => str(d.date) === iso && has(d.start_time)).map((d) => str(d.start_time));
      return `${formatDateShort(iso)}${ts.length ? `${ts.join('/')}${startWord}` : ''}`;
    }).join('、');
  } else if (has(ev.schedule.start_date)) {
    dateShort = `${formatDateShort(str(ev.schedule.start_date))}${has(ev.schedule.end_date) ? `〜${formatDateShort(str(ev.schedule.end_date))}` : ''}`;
  }
  // 日時（詳しい表記、行の配列）
  const dateLong = [];
  for (const iso of uniqDates) {
    const ss = dates.filter((d) => str(d.date) === iso);
    const t = ss.map((d) => {
      const lab = has(d.session_label) ? `${str(d.session_label)} ` : '';
      const st = has(d.start_time) ? `${str(d.start_time)}${startWord}` : '';
      const op = has(d.doors_open) ? `（${str(d.doors_open)}開場）` : '';
      const en = has(d.end_time) && !perf ? `〜${str(d.end_time)}` : '';
      return `${lab}${st}${en}${op}`.trim();
    }).filter(Boolean);
    dateLong.push({ date: formatDateJa(iso), times: t });
  }
  if (!uniqDates.length && has(ev.schedule.start_date)) {
    dateLong.push({ date: `${formatDateJa(str(ev.schedule.start_date))}${has(ev.schedule.end_date) ? `〜${formatDateJa(str(ev.schedule.end_date))}` : ''}`, times: has(ev.schedule.open_hours) ? [str(ev.schedule.open_hours)] : [] });
  }

  const prices = ev.pricing.prices.items.filter((p) => has(p.amount) || has(p.label));
  const priceSummary = prices.map((p) => `${str(p.category) ? `${str(p.category)} ` : ''}${priceText(p)}`).join('／');
  const performers = ev.performers.items.filter((p) => has(p.name));
  const works = ev.program.works.items.filter((w) => has(w.work) || has(w.composer));
  const subs = ev.sub_events.items.filter((s) => has(s.title));

  let sales = '';
  if (!closed) {
    if (TYPE_SETS.PART.includes(type)) {
      const p = ev.participation;
      if (has(p.application_deadline)) sales = `申込締切 ${formatDateJa(str(p.application_deadline))}`;
      else if (has(p.application_start)) sales = `申込開始 ${formatDateJa(str(p.application_start))}`;
    } else if (has(ev.tickets.sales_start)) {
      sales = code === 'scheduled' ? `一般発売 ${formatDateJa(str(ev.tickets.sales_start))}` : '';
    }
  }
  const statusText = ['on_sale', 'registration_open'].includes(code) || code === 'scheduled' ? '' : statusLabel(ev.status);
  const statusMsg = {
    sold_out: 'チケットは完売しました。', registration_closed: '受付は終了しました。', cancelled: 'この催しは中止になりました。',
    postponed: 'この催しは延期になりました。', finished: 'この催しは終了しました。', waiting_list: 'キャンセル待ちを受け付けています。', few_tickets: 'チケットは残りわずかです。',
  }[code] ?? '';
  const performerChange = ev.updates.items.filter((u) => u.type === 'performer_change').sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const changeNote = performerChange ? `※出演者が変更になりました（${isIsoDate(performerChange.date) ? performerChange.date.slice(5).split('-').map(Number).join('月') + '日' : performerChange.date}更新）` : '';
  const age = str(ev.pricing.age_requirement) || str(ev.participation.target_age);

  const tags = new Set(FIXED_TAGS.map((t) => `#${t}`));
  const genre = str(ev.genre);
  if (genre) tags.add(tag(genre));
  if (type === 'workshop') tags.add('#ワークショップ');
  if (type === 'lecture') tags.add('#講座');
  if (type === 'exhibition') tags.add('#展示');
  if (/0歳/.test(`${age} ${str(ev.basic.title)}`)) tags.add('#0歳からのコンサート');
  const instTags = [...new Set(performers.map((p) => tag(str(p.instrument))).filter(Boolean))];
  const nameTags = performers.map((p) => tag(str(p.name))).filter(Boolean);
  const composerTags = [...new Set(works.map((w) => tag(str(w.composer))).filter(Boolean))];
  tags.delete(null);

  const sourceText = [
    str(ev.basic.title), str(ev.basic.subtitle), str(ev.basic.catchphrase), str(ev.basic.description), str(ev.notes), str(ev.program.notes),
    ...performers.map((p) => str(p.profile)), ...works.map((w) => `${str(w.work)} ${str(w.notes)}`),
  ].join('\n');

  return {
    type, title, subtitle: str(ev.basic.subtitle), url, venue, venueShort, dateShort, dateLong, prices, priceSummary, performers, works, subs,
    sales, closed, code, statusText, statusMsg, changeNote, age, tags: [...tags], instTags, nameTags, composerTags, sourceText,
    catchphrase: str(ev.basic.catchphrase), description: str(ev.basic.description),
    seating: str(ev.pricing.seating_type), taxIncluded: str(ev.pricing.tax_included),
    hasDates: dateLong.length > 0,
  };
}

/** 文単位で先頭から取り出す（文の途中で切らない） */
export function firstSentences(text, maxChars, maxSentences = 3) {
  const sents = String(text ?? '').replace(/\n+/g, '').match(/[^。！？!?]+[。！？!?]?/g) ?? [];
  const out = [];
  let n = 0;
  for (const s of sents) {
    if (out.length >= maxSentences) break;
    if (n + s.length > maxChars) break;
    out.push(s.trim());
    n += s.length;
  }
  return out;
}

function perfName(p) {
  const l = performerLabel(p);
  return `${str(p.name)}${l ? `（${l}）` : ''}`;
}

function fitX(required, optional, tail) {
  // required と tail は必ず残し、optional を後ろから削る
  const opt = [...optional];
  const build = () => [...required, ...opt, ...tail].filter((x) => x !== null && x !== '').join('\n');
  let text = build();
  while (xLength(text) > X_LIMIT && opt.length) {
    opt.pop();
    text = build();
  }
  return text;
}

// ---- A. お知らせ -------------------------------------------------------

function xA(f) {
  const head = `${f.statusText ? `【${f.statusText}】` : ''}${f.title}`;
  const required = [head, `${f.dateShort}｜${f.venueShort}`];
  const optional = [];
  if (f.closed) optional.push(f.statusMsg);
  else {
    if (f.priceSummary) optional.push(f.priceSummary);
    if (f.sales) optional.push(f.sales);
    if (f.age && /0歳|未就学|歳/.test(f.age)) optional.push(f.age);
  }
  if (f.changeNote) required.splice(1, 0, f.changeNote);
  return fitX(required, optional, [`詳細 ${f.url}`, f.tags.slice(0, 2).join(' ')]);
}

function fbA(f, ev) {
  const out = [`【${KINDS.A}】${f.title}${f.subtitle ? `　${f.subtitle}` : ''}`];
  if (f.statusMsg) out.push('', f.statusMsg);
  if (f.changeNote) out.push('', f.changeNote);
  if (f.description) out.push('', ...lines(f.description));
  out.push('', '■日時', ...f.dateLong.map((d) => `${d.date}${d.times.length ? `　${d.times.join('／')}` : ''}`));
  out.push('■会場', f.venue);
  if (f.performers.length) out.push(`■${['workshop', 'lecture'].includes(f.type) ? '講師' : '出演'}`, f.performers.map(perfName).join('、'));
  if (f.prices.length) out.push('■料金', `${f.seating ? `${f.seating}${f.taxIncluded ? `（${f.taxIncluded}）` : ''}　` : ''}${f.priceSummary}`);
  if (f.age) out.push('■対象・年齢', f.age);
  if (!f.closed) {
    if (TYPE_SETS.PART.includes(f.type)) {
      const p = ev.participation;
      const rows = [str(p.application_method), has(p.application_start) ? `申込開始：${formatDateJa(str(p.application_start))}` : '', has(p.application_deadline) ? `申込締切：${formatDateJa(str(p.application_deadline))}` : '', str(p.lottery)].filter(Boolean);
      if (rows.length) out.push('■申込', ...rows);
    } else {
      const ch = ev.tickets.ticket_channels.items.filter((c) => has(c.name)).map((c) => `${str(c.name)}${has(c.phone) ? ` TEL ${str(c.phone)}` : ''}`);
      const rows = [f.sales, ...ch].filter(Boolean);
      if (rows.length) out.push('■チケット', ...rows);
    }
  }
  const o = ev.organization;
  if (has(o.contact) || has(o.phone)) out.push('■お問い合わせ', [str(o.contact), has(o.phone) ? `TEL ${str(o.phone)}` : ''].filter(Boolean).join(' '));
  out.push('', `詳細・最新情報はさくらプラザHPをご覧ください。`, f.url);
  return out.join('\n');
}

function igA(f) {
  const hook = f.catchphrase || (f.dateLong[0] ? `${f.dateLong[0].date.split('〜')[0]}、さくらプラザで開催します。` : `さくらプラザで開催します。`);
  const out = [hook, ''];
  if (f.statusMsg) out.push(f.statusMsg, '');
  if (f.changeNote) out.push(f.changeNote, '');
  out.push(`「${f.title}」`, '');
  for (const d of f.dateLong) {
    out.push(`📅 ${d.date}`);
    for (const t of d.times) out.push(`　 ${t}`);
  }
  out.push(`📍 ${f.venueShort}`);
  if (f.prices.length) out.push(`🎫 ${f.priceSummary}`);
  if (f.age) out.push(`ℹ️ ${f.age}`);
  out.push('');
  if (!f.closed && f.sales) out.push(f.sales, '');
  out.push('詳しくはプロフィールのリンクから', `（${f.url}）`, '', [...f.tags, ...f.instTags, ...f.nameTags].slice(0, 10).join(' '));
  return out.join('\n');
}

// ---- B. アーティスト -----------------------------------------------------

function xB(f) {
  const withProf = f.performers.filter((p) => has(p.profile));
  const required = [`${f.title}　出演者紹介`];
  const optional = [];
  for (const p of withProf) {
    optional.push(perfName(p));
    const s = firstSentences(str(p.profile), 70, 1);
    if (s.length) optional.push(s[0]);
  }
  if (f.changeNote) required.push(f.changeNote);
  // 1人目の名前は必ず残す
  required.push(optional.shift());
  return fitX(required, optional, [`${f.dateShort}｜${f.venueShort}`, `プロフィール全文 ${f.url}`]);
}

function fbB(f) {
  const withProf = f.performers.filter((p) => has(p.profile));
  const out = [`【${KINDS.B}】${f.title}`, ''];
  if (f.changeNote) out.push(f.changeNote, '');
  out.push(`${f.title}に出演する${withProf.length > 1 ? '皆さん' : str(withProf[0].name)}のプロフィールをご紹介します。`, '');
  for (const p of withProf) {
    out.push(`■${perfName(p)}`);
    if (has(p.roman_name)) out.push(str(p.roman_name));
    out.push(...lines(str(p.profile)), '');
  }
  const noProf = f.performers.filter((p) => !has(p.profile));
  if (noProf.length) out.push(`ほかの出演：${noProf.map(perfName).join('、')}`, '');
  out.push(`■日時　${f.dateLong.map((d) => `${d.date}${d.times.length ? ` ${d.times.join('／')}` : ''}`).join('、')}`, `■会場　${f.venue}`, '', '詳細はさくらプラザHPをご覧ください。', f.url);
  return out.join('\n');
}

function igB(f) {
  const withProf = f.performers.filter((p) => has(p.profile));
  const out = [`「${f.title}」の出演者をご紹介します。`, ''];
  if (f.changeNote) out.push(f.changeNote, '');
  for (const p of withProf) {
    out.push(`🎵 ${str(p.name)}`);
    const l = performerLabel(p);
    if (l) out.push(l);
    out.push('');
    for (const s of firstSentences(str(p.profile), 160, 3)) out.push(s);
    out.push('');
  }
  out.push(`📅 ${f.dateLong.map((d) => d.date).join('、')}`, `📍 ${f.venueShort}`, '', 'プロフィール全文はプロフィールのリンクから', `（${f.url}）`, '', [...f.tags.slice(0, 3), ...f.nameTags, ...f.instTags].slice(0, 10).join(' '));
  return out.join('\n');
}

// ---- C. プログラム -------------------------------------------------------

function workLine(w) {
  return `${has(w.composer) ? `${str(w.composer)}：` : ''}${str(w.work)}`;
}

function xC(f) {
  const required = [`${f.title}　${f.type === 'multi_event' ? '当日の催し' : 'プログラム'}`];
  const items = f.works.length ? f.works.map((w) => `・${workLine(w)}`) : f.subs.map((s) => `・${has(s.start_time) ? `${str(s.start_time)} ` : ''}${str(s.title)}`);
  const total = items.length;
  const optional = [...items];
  const tail = [`${f.dateShort}｜${f.venueShort}`, `詳細 ${f.url}`];
  let text = fitX(required, optional, tail);
  const shown = text.split('\n').filter((l) => l.startsWith('・')).length;
  if (shown < total) {
    // 載せきれない場合は「ほか」と件数を明記（事実のみ）
    const opt2 = items.slice(0, Math.max(1, shown - 1));
    text = [...required, ...opt2, `ほか（全${total}${f.works.length ? '曲' : '件'}）`, ...tail].join('\n');
  }
  return text;
}

function fbC(f, ev) {
  const out = [`【${KINDS.C}】${f.title}`, ''];
  if (f.works.length) {
    out.push(`${f.title}で予定しているプログラムをご紹介します。`, '');
    let cur = null;
    for (const w of f.works) {
      if (str(w.section) && str(w.section) !== cur) { cur = str(w.section); out.push('', `〈${cur}〉`); }
      out.push(`・${workLine(w)}${has(w.notes) ? `（${str(w.notes)}）` : ''}`);
    }
    if (has(ev.program.notes)) out.push('', ...lines(str(ev.program.notes)).map((x) => `※${x.replace(/^※/, '')}`));
  } else {
    out.push('当日の催しをご紹介します。', '');
    for (const s of f.subs) {
      out.push(`・${has(s.start_time) ? `${str(s.start_time)}〜${str(s.end_time)} ` : ''}${str(s.title)}${[str(s.place), str(s.application)].filter(Boolean).map((x) => `（${x}）`).join('')}`);
      if (has(s.description)) out.push(`　${str(s.description)}`);
    }
  }
  out.push('', `■日時　${f.dateLong.map((d) => `${d.date}${d.times.length ? ` ${d.times.join('／')}` : ''}`).join('、')}`, `■会場　${f.venue}`, '', '詳細はさくらプラザHPをご覧ください。', f.url);
  return out.join('\n');
}

function igC(f, ev) {
  const out = [f.works.length ? `「${f.title}」のプログラムです。` : `「${f.title}」当日の催しです。`, ''];
  if (f.works.length) {
    let cur = null;
    for (const w of f.works) {
      if (str(w.section) && str(w.section) !== cur) { cur = str(w.section); out.push('', `〈${cur}〉`); }
      if (has(w.composer)) out.push(`🎼 ${str(w.composer)}`, `　 ${str(w.work)}`);
      else out.push(`🎼 ${str(w.work)}`);
    }
    if (has(ev.program.notes)) out.push('', ...lines(str(ev.program.notes)).map((x) => `※${x.replace(/^※/, '')}`));
  } else {
    for (const s of f.subs) out.push(`⏰ ${has(s.start_time) ? `${str(s.start_time)}〜 ` : ''}${str(s.title)}`, ...(has(s.place) ? [`　 ${str(s.place)}`] : []));
  }
  out.push('', `📅 ${f.dateLong.map((d) => d.date).join('、')}`, `📍 ${f.venueShort}`, '', '詳しくはプロフィールのリンクから', `（${f.url}）`, '', [...f.tags.slice(0, 3), ...f.composerTags, ...f.instTags].slice(0, 10).join(' '));
  return out.join('\n');
}

const BUILDERS = {
  x: { A: xA, B: xB, C: xC },
  facebook: { A: fbA, B: fbB, C: fbC },
  instagram: { A: igA, B: igB, C: igC },
};

/**
 * 1投稿を生成する。
 * 戻り値 { platform, kind, ok, text, message, warnings, length }
 */
export function generateSns(ev, platform, kind, opts = {}) {
  const f = facts(ev, opts);
  const base = { platform, kind, ok: false, text: '', message: '', warnings: [], length: 0 };
  if (!f.title || !f.hasDates) return { ...base, message: MSG_NO_BASIC };
  if (kind === 'B' && !f.performers.some((p) => has(p.profile))) return { ...base, message: MSG_NO_PROFILE };
  if (kind === 'C' && !f.works.length && !(f.type === 'multi_event' && f.subs.length)) return { ...base, message: MSG_NO_PROGRAM };
  const text = BUILDERS[platform][kind](f, ev).replace(/\n{3,}/g, '\n\n').trim();
  const warnings = [];
  if (f.url === URL_PLACEHOLDER) warnings.push('HPページのURLが未入力です。「［HPページのURL］」を実際のURLに置き換えてください。');
  const bad = findUnsupportedPhrases(text, f.sourceText, f.code);
  if (bad.length) warnings.push(`資料で裏付けられない表現が含まれています：${bad.join('、')}`);
  const length = platform === 'x' ? xLength(text) : [...text].length;
  if (platform === 'x' && length > X_LIMIT) warnings.push(`Xの文字数（${length}）が上限（${X_LIMIT}）を超えています。タイトル等を短くしてください。`);
  if (platform === 'instagram' && length > 2200) warnings.push('Instagramの文字数上限（2,200字）を超えています。');
  return { ...base, ok: true, text, warnings, length };
}

export function generateAllSns(ev, opts = {}) {
  const out = [];
  for (const p of Object.keys(PLATFORMS)) for (const k of Object.keys(KINDS)) out.push(generateSns(ev, p, k, opts));
  return out;
}
