// raw extraction（ページごとの文字）から event.json の下書きを作るルールベース抽出。
// ・値には必ず出典（ファイル・ページ・元の行）と確信度を付ける。
// ・確認済み（confirmed）には絶対にしない。
// ・見つからない項目は空のまま（推測で埋めない）。
import { field } from '../core/field.js';
import { createEmptyEvent, VENUE_ROOMS, FACILITY_NAME } from '../core/schema.js';
import { normalizeText, toIso, isIsoDate, weekdayOf, normTime, reiwaToYear, todayIso } from '../core/dates.js';
import { classify } from '../core/classify.js';

export const EXTRACTOR_VERSION = 'rules-1.0';

// ---- 前処理 -----------------------------------------------------------

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

/** NFKC の前に丸数字を保護する（NFKC で ① が 1 になり時刻とくっつくのを防ぐ） */
export function prepLine(s) {
  const protectedText = String(s ?? '').replace(/[①-⑳]/g, (c) => ` 〈${CIRCLED.indexOf(c) + 1}〉 `);
  return normalizeText(protectedText).replace(/[ \t]+/g, ' ').trim();
}

/**
 * raw = { files: [{ name, type, pages: [{ page, text, lines?: [{ text, size }] }] }] }
 * → 行の配列
 */
export function flattenRaw(raw) {
  const lines = [];
  for (const file of raw.files ?? []) {
    for (const pg of file.pages ?? []) {
      const srcLines = pg.lines?.length
        ? pg.lines
        : String(pg.text ?? '').split(/\r?\n/).map((t) => ({ text: t, size: null }));
      for (const ln of srcLines) {
        const text = String(ln.text ?? '').trim();
        if (!text) continue;
        lines.push({ file: file.name, page: pg.page ?? 1, text, norm: prepLine(text), size: ln.size ?? null, idx: lines.length });
      }
    }
  }
  return lines;
}

// ---- 見出し（ラベル）の判定 ---------------------------------------------

const LABELS = [
  ['organizer', '主催'], ['co_organizer', '共催'], ['supporter', '後援'], ['sponsor', '協賛'],
  ['grant', '助成'], ['cooperation', '協力'], ['planning', '企画(?:制作)?'],
  ['contact', 'お?問い?合わ?せ先?|お?問合せ先?|お問合せ・お申込み|お申込み・お問合せ|お問い合わせ・お申し込み'],
  ['venue', '会場|場所'],
  ['performers', '出演者?|講師|ナビゲーター|キャスト|指揮|ゲスト|お話'],
  ['program', '予定曲目|曲目|演目|プログラム|PROGRAM'],
  ['profile', 'プロフィール|PROFILE|Profile'],
  ['sales', 'チケット発売日?|一般発売日?|発売日?'],
  ['tickets', 'チケット取扱い?|チケット取り扱い|チケットのお求め|チケット販売|プレイガイド'],
  ['price', 'チケット料金|料金|入場料|入場券|参加費|受講料'],
  ['eligibility', '応募資格|参加資格'],
  ['deadline', '申込締切|応募締切|締切|〆切'],
  ['application_period', '申込期間|申し込み期間|応募期間|募集期間|受付期間'],
  ['notification', '結果通知|結果発表|通知'],
  ['application', '申込方法|申し込み方法|申込み方法|応募方法|お申し?込み|申込み?|応募'],
  ['target', '対象'], ['capacity', '定員'], ['belongings', '持ち?物'],
  ['closed_days', '休館日'], ['open_hours', '開館時間'],
  ['schedule', '日時|開催日時?|会期|期間|日程'],
  ['notes', '注意事項|ご注意|ご案内'],
  ['description', '内容|概要'],
  ['accessibility', 'バリアフリー|アクセシビリティ'],
];
const LABEL_RE = new RegExp(
  `^[【■●◆◇▶▼◎○・\\[［<〈(（]*\\s*(${LABELS.map(([, p]) => p).join('|')})\\s*(?:[】］\\]>〉)）]\\s*[:：]?|[:：]|\\s|$)\\s*(.*)$`,
);

export function matchLabel(norm) {
  const m = norm.match(LABEL_RE);
  if (!m) return null;
  const word = m[1];
  const found = LABELS.find(([, p]) => new RegExp(`^(?:${p})$`).test(word));
  if (!found) return null;
  // 「出演者変更」など、見出しでない行を除外（ラベルの直後に文字が続き、区切りがない）
  return { key: found[0], word, rest: (m[2] ?? '').trim() };
}

function sectionize(lines) {
  let current = null;
  let currentWord = null;
  for (const ln of lines) {
    const lab = matchLabel(ln.norm);
    if (lab) {
      current = lab.key;
      currentWord = lab.word;
      ln.label = lab;
      ln.section = current;
      ln.sectionWord = currentWord;
      ln.content = lab.rest;
    } else {
      ln.section = current;
      ln.sectionWord = currentWord;
      ln.content = ln.norm;
    }
  }
  return lines;
}

// ---- 日付 --------------------------------------------------------------

const WD = '日月火水木金土';
const DATE_RE = /(?<![\d,.])(?:(令和)\s*(\d{1,2}|元)\s*年\s*|(\d{4})\s*([年./-])\s*)?(\d{1,2})\s*([月./])\s*(\d{1,2})\s*(日)?(?:\s*[(\[［（]\s*([日月火水木金土])[^)\]］）]{0,4}[)\]］）])?/g;
const RANGE_TAIL_RE = /^\s*[〜-]\s*(?:(\d{4})\s*[年./]\s*)?(?:(\d{1,2})\s*[月./]\s*)?(\d{1,2})\s*日?(?:\s*[(\[（]\s*([日月火水木金土])[^)\]）]{0,4}[)\]）])?/;

export function findDates(norm) {
  const out = [];
  DATE_RE.lastIndex = 0;
  let m;
  while ((m = DATE_RE.exec(norm))) {
    const [raw, reiwa, reiwaN, y4, ysep, mo, msep, d, dayMark, wd] = m;
    let year = null;
    if (reiwa) year = reiwaToYear(reiwaN === '元' ? 1 : reiwaN);
    else if (y4) year = Number(y4);
    const month = Number(mo);
    const day = Number(d);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    if (msep === '月' && !dayMark) continue; // 「7月4」は不採用
    if (msep !== '月' && !year && !wd) continue; // 「3.5」「1/2」などの誤検出を避ける
    if (y4 && ysep === '-' && msep !== '-' && msep !== '.' && msep !== '/') continue;
    if (year && (year < 2000 || year > 2100)) continue;
    const item = { raw, year, month, day, weekday: wd ?? null, index: m.index, end: m.index + raw.length };
    const tail = norm.slice(item.end).match(RANGE_TAIL_RE);
    if (tail && (tail[2] || /日/.test(tail[0]) || tail[4])) {
      item.rangeEnd = {
        year: tail[1] ? Number(tail[1]) : null,
        month: tail[2] ? Number(tail[2]) : month,
        day: Number(tail[3]),
        weekday: tail[4] ?? null,
        raw: tail[0],
      };
      item.end += tail[0].length;
      DATE_RE.lastIndex = item.end;
    }
    out.push(item);
  }
  return out;
}

/** 年の省略された日付の年を決める。曜日があれば曜日が合う年を優先。 */
function resolveYear(dt, ctx) {
  if (dt.year) {
    const iso = toIso(dt.year, dt.month, dt.day);
    return isIsoDate(iso) ? { iso, inferred: false } : null;
  }
  const base = ctx.modeYear ?? Number(ctx.referenceDate.slice(0, 4));
  const candidates = [base, base + 1, base - 1, base + 2];
  if (dt.weekday) {
    for (const y of candidates) {
      const iso = toIso(y, dt.month, dt.day);
      if (isIsoDate(iso) && weekdayOf(iso) === dt.weekday) return { iso, inferred: true, byWeekday: true };
    }
  }
  let y = base;
  let iso = toIso(y, dt.month, dt.day);
  if (!ctx.modeYear && isIsoDate(iso) && iso < shiftDays(ctx.referenceDate, -90)) {
    y += 1;
    iso = toIso(y, dt.month, dt.day);
  }
  return isIsoDate(iso) ? { iso, inferred: true } : null;
}

function shiftDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// 日付がどの意味で書かれているか（行の文脈）
function dateContext(ln) {
  const t = ln.norm;
  if (ln.section === 'application_period' || (/期間/.test(t) && /(申込|応募|募集|受付)/.test(t))) return 'application';
  if (ln.section === 'notification') return 'notification';
  if (ln.section === 'deadline' || /(締切|〆切|締め切り|必着|まで(?:に)?(?:申|応|お申))/.test(t)) return 'deadline';
  if (/(結果|当選|通知|発表)/.test(t) && !/(公演|開演)/.test(t)) return 'notification';
  if (/(発売|先行|前売|予約開始|販売開始)/.test(t) || ln.section === 'sales') return 'sales';
  if (/(申込|申し込み|応募|受付開始|募集期間|受付期間)/.test(t) || ln.section === 'application') return 'application';
  if (/(休館|閉館)/.test(t)) return 'other';
  return 'event';
}

// ---- 時刻 --------------------------------------------------------------

const TIME_RE = /(午前|午後|AM|PM)?\s*(\d{1,2})\s*(?::(\d{2})|時(?!間)\s*(半|\d{1,2}\s*分)?)/g;
const TIME_KW = [
  ['doors_open', /(開場|OPEN|open)/],
  ['start_time', /(開演|開始|START|start|スタート)/],
  ['end_time', /(終演|終了|閉演|閉場)/],
  ['reception', /(受付)/],
];

export function findTimes(norm) {
  const out = [];
  TIME_RE.lastIndex = 0;
  let m;
  while ((m = TIME_RE.exec(norm))) {
    const [raw, ampm, hRaw, mColon, mJa] = m;
    let h = Number(hRaw);
    let mi = 0;
    if (mColon) mi = Number(mColon);
    else if (mJa === '半') mi = 30;
    else if (mJa) mi = Number(mJa.replace(/\D/g, ''));
    if ((ampm === '午後' || ampm === 'PM') && h < 12) h += 12;
    if (h > 23 || mi > 59) continue;
    // 電話番号・日付の一部を除外
    const before = norm[m.index - 1];
    if (before && /[\d\-/.]/.test(before)) continue;
    out.push({ time: normTime(h, mi), index: m.index, end: m.index + raw.length, raw });
  }
  // キーワードの向き（「開場13:30」か「13:30開場」か）を行ごとに判定
  const kwAt = (s, where) => {
    const t = where === 'before' ? s.replace(/[\s(（/／]+$/, '') : s.replace(/^[\s)）]+/, '');
    for (const [key, re] of TIME_KW) {
      const mm = t.match(where === 'before' ? new RegExp(`${re.source}$`) : new RegExp(`^${re.source}`));
      if (mm) return key;
    }
    return null;
  };
  const segBefore = (i) => norm.slice(i === 0 ? 0 : out[i - 1].end, out[i].index);
  const segAfter = (i) => norm.slice(out[i].end, i + 1 < out.length ? out[i + 1].index : norm.length);
  const convention = out.length && kwAt(segBefore(0), 'before') ? 'before' : 'after';
  out.forEach((t, i) => {
    const a = kwAt(segAfter(i), 'after');
    const b = kwAt(segBefore(i), 'before');
    t.kind = convention === 'before' ? (b ?? a) : (a ?? b);
    // 「10:00〜12:00」
    if (!t.kind && i + 1 < out.length && /^\s*〜\s*$/.test(segAfter(i))) { t.kind = 'start_time'; out[i + 1].kind = out[i + 1].kind ?? 'end_time'; t.range = true; }
    if (!t.kind && /^\s*〜/.test(segAfter(i))) t.kind = 'start_time';
    if (!t.kind && i > 0 && out[i - 1].range) t.kind = 'end_time';
  });
  return out;
}

// ---- 楽器・役割 ----------------------------------------------------------

const INSTRUMENTS = [
  'ピアノ', 'ヴァイオリン', 'バイオリン', 'ヴィオラ', 'ビオラ', 'チェロ', 'コントラバス', 'フルート', 'オーボエ',
  'クラリネット', 'ファゴット', 'サクソフォン', 'サックス', 'トランペット', 'ホルン', 'トロンボーン', 'チューバ',
  'ハープ', 'ギター', 'パーカッション', '打楽器', 'マリンバ', 'ソプラノ', 'メゾソプラノ', 'アルト', 'テノール',
  'バリトン', 'バス', 'ヴォーカル', 'ボーカル', '歌', 'オルガン', 'チェンバロ', '箏', '尺八', '三味線', '和太鼓',
  'ドラムス', 'ドラム', 'ベース', 'ダンス', 'うた', '歌のおねえさん', '歌のおにいさん', '朗読', '語り', 'ナレーション',
  'Pf', 'Pf.', 'Vn', 'Vn.', 'Va', 'Va.', 'Vc', 'Vc.', 'Fl', 'Fl.', 'Cl', 'Cl.', 'Sop', 'Ten', 'Bar', 'Gt', 'Ds', 'Ba', 'Sax', 'Tp',
];
const ROLES = ['指揮', 'ナビゲーター', '司会', 'お話', '講師', 'ゲスト', 'MC', '演出', '構成', '作曲', '編曲'];
const INSTR_RE = new RegExp(`^(?:${[...INSTRUMENTS, ...ROLES].map((x) => x.replace('.', '\\.')).sort((a, b) => b.length - a.length).join('|')})`);

const PAIR_SPLIT_RE = new RegExp(`\\s+(?=(?:${[...INSTRUMENTS, ...ROLES].map((x) => x.replace('.', '\\.')).join('|')})\\s*[:：/／])`);

function isInstrumentOrRole(s) {
  const t = s.trim();
  return INSTR_RE.test(t) || /(奏者|伴奏)$/.test(t);
}

/** 対応の取れていない末尾の括弧を除く */
export function tidy(s) {
  let t = String(s ?? '').trim();
  const open = (t.match(/[(（]/g) || []).length;
  const close = (t.match(/[)）]/g) || []).length;
  if (close > open) t = t.replace(/[)）]\s*$/, '');
  if (open > close && /^[(（]/.test(t)) t = t.slice(1);
  return t.trim();
}

const KANA_ONLY = /^[ぁ-ゖァ-ヺー・\s]+$/;
const LATIN_ONLY = /^[A-Za-zÀ-ÿ.'’\-\s]+$/;

// ---- 本体 --------------------------------------------------------------

export function extractEvent(raw, opts = {}) {
  const referenceDate = opts.referenceDate ?? todayIso();
  const now = opts.now ?? new Date().toISOString();
  const lines = sectionize(flattenRaw(raw));
  const ev = createEmptyEvent(now);
  const log = [];
  const warnings = [];
  const suggestions = [];
  const allText = lines.map((l) => l.norm).join('\n');
  const consumed = new Set(); // 行全体を別の項目の値として使った行（注意事項に重複させない）

  const src = (ln, confidence, extra = {}) => ({ file: ln.file, page: ln.page, text: ln.text, confidence, origin: 'extracted', ...extra });
  const setF = (obj, key, value, ln, confidence, extra) => {
    if (value === null || value === undefined || value === '') return false;
    const cur = obj[key];
    if (cur && cur.value !== null && cur.value !== '' && (cur.confidence ?? 0) >= confidence) return false;
    obj[key] = field(value, src(ln, confidence, extra));
    log.push({ key, value, page: ln.page, file: ln.file, confidence });
    return true;
  };

  ev.meta.source_files = (raw.files ?? []).map((f) => ({ name: f.name, type: f.type ?? '', pages: f.pages?.length ?? 0 }));
  ev.meta.extractor = EXTRACTOR_VERSION;

  if (!lines.length) {
    warnings.push('チラシから文字を取り出せませんでした。画像のチラシや画像だけのPDFの場合は、チラシの文字を貼り付けるか、確認画面で直接入力してください。');
    return { event: ev, log, warnings, suggestions, lines };
  }

  // 種別
  const cls = classify(allText);
  ev.event_type = field(cls.type, { confidence: cls.confidence, origin: 'inferred', text: cls.reason });

  // 年の最頻値
  const years = [];
  for (const ln of lines) for (const d of findDates(ln.norm)) if (d.year) years.push(d.year);
  const modeYear = years.length ? Number(Object.entries(years.reduce((a, y) => ((a[y] = (a[y] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0][0]) : null;
  const yctx = { modeYear, referenceDate };

  // ---- 日程 ----
  const sessions = [];
  let lastSession = null;
  let lastSessionLine = -99;
  const sessionKey = (s) => `${s.date.value}|${s.start_time.value ?? ''}`;
  const newSession = (iso, dt, ln, conf, inferred) => ({
    id: `d${sessions.length + 1}`,
    date: field(iso, src(ln, conf, inferred ? { origin: 'inferred', note: '年はチラシに書かれていないため推定しました' } : {})),
    weekday_on_flyer: dt.weekday ? field(dt.weekday, src(ln, 0.95)) : field(null),
    session_label: field(null),
    doors_open: field(null),
    start_time: field(null),
    end_time: field(null),
    status: null,
  });
  const applyTimes = (s, times, ln, labelText) => {
    for (const t of times) {
      if (!t.kind || t.kind === 'reception') continue;
      if (!s[t.kind].value) s[t.kind] = field(t.time, src(ln, t.kind && t.raw ? 0.9 : 0.6));
    }
    const untagged = times.filter((t) => !t.kind);
    if (!s.start_time.value && untagged.length === 1) s.start_time = field(untagged[0].time, src(ln, 0.55));
    if (labelText && !s.session_label.value) s.session_label = field(labelText, src(ln, 0.8));
  };
  const labelOf = (norm) => {
    const m = norm.match(/〈(\d+)〉/) || null;
    if (m) return CIRCLED[Number(m[1]) - 1];
    const m2 = norm.match(/(第\s*\d+\s*(?:回|部)|\d+\s*回目|午前の部|午後の部|昼の部|夜の部|[A-Z]公演)/);
    return m2 ? m2[1].replace(/\s/g, '') : null;
  };

  const periodSet = { start: false };
  lines.forEach((ln, i) => {
    const ctx = dateContext(ln);
    const dates = findDates(ln.norm);
    if (dates.length && ctx !== 'event') {
      const r = resolveYear(dates[0], yctx);
      if (!r) return;
      const conf = r.inferred ? 0.6 : 0.8;
      if (ctx === 'sales') {
        const t = ln.norm;
        if (/先行/.test(t)) {
          setF(ev.tickets, 'presale', ln.content || ln.norm, ln, 0.7);
        } else if (/窓口/.test(t) && !/(電話|WEB|ウェブ|インターネット|オンライン)/.test(t)) {
          setF(ev.tickets, 'boxoffice_start', r.iso, ln, conf);
        } else if (/(WEB|ウェブ|インターネット|オンライン)/.test(t) && !/(電話|窓口)/.test(t)) {
          setF(ev.tickets, 'online_start', r.iso, ln, conf);
        } else if (/電話/.test(t) && !/(窓口|WEB|ウェブ)/.test(t)) {
          setF(ev.tickets, 'advance_phone_start', r.iso, ln, conf);
        } else {
          setF(ev.tickets, 'sales_start', r.iso, ln, conf);
        }
      } else if (ctx === 'application') {
        setF(ev.participation, 'application_start', r.iso, ln, conf);
        if (dates[0].rangeEnd) {
          const re = dates[0].rangeEnd;
          const r2 = resolveYear({ year: re.year ?? Number(r.iso.slice(0, 4)), month: re.month, day: re.day, weekday: re.weekday }, yctx);
          if (r2) setF(ev.participation, 'application_deadline', r2.iso, ln, conf);
        } else if (dates[1]) {
          const r2 = resolveYear(dates[1], yctx);
          if (r2) setF(ev.participation, 'application_deadline', r2.iso, ln, conf);
        }
      } else if (ctx === 'deadline') {
        setF(ev.participation, 'application_deadline', r.iso, ln, conf);
      } else if (ctx === 'notification') {
        setF(ev.participation, 'notification_date', ln.content || ln.norm, ln, 0.6);
      }
      return;
    }
    if (dates.length && ctx === 'other') return;
    const eventish = ctx === 'event';

    const times = findTimes(ln.norm).filter((t) => !/受付時間|営業|窓口/.test(ln.norm));
    if (dates.length && eventish) {
      for (const dt of dates) {
        const r = resolveYear(dt, yctx);
        if (!r) continue;
        if (dt.rangeEnd) {
          const re = dt.rangeEnd;
          const r2 = resolveYear({ year: re.year ?? Number(r.iso.slice(0, 4)), month: re.month, day: re.day, weekday: re.weekday }, yctx);
          if (!periodSet.start) {
            ev.schedule.start_date = field(r.iso, src(ln, r.inferred ? 0.6 : 0.85));
            if (r2) ev.schedule.end_date = field(r2.iso, src(ln, r2.inferred ? 0.6 : 0.85));
            periodSet.start = true;
          }
          continue;
        }
        const s = newSession(r.iso, dt, ln, r.inferred ? 0.6 : 0.9, r.inferred);
        if (dates.length === 1) applyTimes(s, times, ln, labelOf(ln.norm));
        const dup = sessions.find((x) => sessionKey(x) === sessionKey(s) || (x.date.value === s.date.value && (!x.start_time.value || !s.start_time.value)));
        if (dup) {
          for (const k of ['weekday_on_flyer', 'doors_open', 'start_time', 'end_time', 'session_label']) {
            if (!dup[k].value && s[k].value) dup[k] = s[k];
          }
          lastSession = dup;
        } else {
          sessions.push(s);
          lastSession = s;
        }
        lastSessionLine = i;
      }
    } else if (cls.type === 'multi_event' && !dates.length && times.length && !times.some((t) => t.kind === 'doors_open')
      && ln.norm.replace(/(\d{1,2}:\d{2}|〜|-|\s)/g, '').length >= 3) {
      // 複合イベントの小イベント（「10:30〜 見学ツアー（要申込）」）
      const rest = ln.norm.slice(times.at(-1).end).replace(/^[\s〜-]+/, '').trim();
      const place = rest.match(/[(（]([^)）]*(?:ホール|ギャラリー|リハーサル室|アトリエ|練習室|スタジオ|ホワイエ|会議室|和室)[^)）]*)[)）]/);
      const appl = rest.match(/(要申込|申込不要|事前申込制|当日受付)/);
      const title = rest.replace(/[(（][^)）]*[)）]/g, '').trim();
      ev.sub_events.items.push({
        id: `s${ev.sub_events.items.length + 1}`,
        title: field(title || rest, src(ln, 0.6)),
        start_time: field(times[0].time, src(ln, 0.8)),
        end_time: times[1] ? field(times[1].time, src(ln, 0.8)) : field(null),
        place: place ? field(place[1], src(ln, 0.7)) : field(null),
        target: field(null), fee: field(null),
        application: appl ? field(appl[1], src(ln, 0.75)) : field(null),
        description: field(rest.match(/[(（]([^)）]+)[)）]/) && !place ? rest.match(/[(（]([^)）]+)[)）]/)[1] : null, src(ln, 0.5)),
      });
    } else if (eventish && !dates.length && times.length && lastSession && i - lastSessionLine <= 4 && !ln.label?.key?.match(/tickets|contact|open_hours/)) {
      const hasStart = times.some((t) => t.kind === 'start_time');
      if (lastSession.start_time.value && hasStart) {
        // 同じ日の別の回
        const s = newSession(lastSession.date.value, { weekday: lastSession.weekday_on_flyer.value }, ln, lastSession.date.confidence ?? 0.8, lastSession.date.origin === 'inferred');
        s.date = { ...lastSession.date };
        s.weekday_on_flyer = { ...lastSession.weekday_on_flyer };
        applyTimes(s, times, ln, labelOf(ln.norm));
        sessions.push(s);
        lastSession = s;
      } else {
        applyTimes(lastSession, times, ln, labelOf(ln.norm));
      }
      lastSessionLine = i;
    }
  });
  // 1回目のラベルが無く2回目以降にある場合は補う
  sessions.forEach((s, i) => { s.id = `d${i + 1}`; });
  ev.schedule.dates.items = sessions;
  if (ev.schedule.start_date.value && !sessions.length) {
    warnings.push('期間（開始日〜終了日）として読み取りました。展示などの場合は日程ではなく期間で確認してください。');
  }

  // ---- 見出しつき項目 ----
  const sectionLines = (key) => lines.filter((l) => l.section === key);
  const sectionText = (key) => sectionLines(key).map((l) => l.content).filter(Boolean).join('\n');

  // 主催など（同じ行に複数あることがある）
  const ORG_RE = /(主催|共催|後援|協賛|助成|協力)\s*[:：]\s*/g;
  const ORG_KEYS = { 主催: 'organizer', 共催: 'co_organizer', 後援: 'supporter', 協賛: 'sponsor', 助成: 'grant', 協力: 'cooperation' };
  for (const ln of lines) {
    const parts = [...ln.norm.matchAll(ORG_RE)];
    if (parts.length) {
      parts.forEach((p, j) => {
        const start = p.index + p[0].length;
        const end = j + 1 < parts.length ? parts[j + 1].index : ln.norm.length;
        const v = ln.norm.slice(start, end).trim().replace(/[、,/／]$/, '');
        if (v) setF(ev.organization, ORG_KEYS[p[1]], v, ln, 0.85);
      });
    } else if (ln.label && ORG_KEYS[ln.label.word]) {
      const v = ln.label.rest || lines[ln.idx + 1]?.norm;
      if (v) setF(ev.organization, ORG_KEYS[ln.label.word], v, ln, ln.label.rest ? 0.85 : 0.6);
    }
  }

  // 問い合わせ・電話・メール・URL
  const PHONE_RE = /(?<!\d)(0\d{1,4})\s*[-(（]\s*(\d{1,4})\s*[-)）]\s*(\d{3,4})(?!\d)/g;
  const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const URL_RE = /https?:\/\/[^\s<>"'）)」』、]+/g;
  const contactLines = sectionLines('contact');
  for (const ln of contactLines) {
    if (ln.label && ln.label.rest) setF(ev.organization, 'contact', ln.label.rest.replace(PHONE_RE, '').replace(/(TEL|Tel|tel|電話)\s*[:：]?\s*$/, '').trim() || ln.label.rest, ln, 0.75);
    else if (!ln.label && !ev.organization.contact.value) setF(ev.organization, 'contact', ln.content.replace(PHONE_RE, '').replace(/(TEL|Tel|tel|電話)\s*[:：]?\s*$/, '').trim(), ln, 0.6);
    const ph = [...ln.norm.matchAll(PHONE_RE)][0];
    if (ph) setF(ev.organization, 'phone', `${ph[1]}-${ph[2]}-${ph[3]}`, ln, 0.9);
    const hours = ln.norm.match(/(\d{1,2}:\d{2}\s*〜\s*\d{1,2}:\d{2}[^\n]*)/);
    if (hours && /受付|時間|〜/.test(ln.norm)) setF(ev.organization, 'contact_hours', hours[1].trim(), ln, 0.6);
  }
  for (const ln of lines) {
    const em = ln.norm.match(EMAIL_RE);
    if (em) setF(ev.organization, 'email', em[0], ln, ln.section === 'contact' ? 0.9 : 0.6);
  }
  if (!ev.organization.phone.value) {
    // 見出しがない場合は「問」「TEL」を含む行から
    for (const ln of lines) {
      if (!/(問|TEL|Tel|電話)/.test(ln.norm) || ln.section === 'tickets') continue;
      const ph = [...ln.norm.matchAll(PHONE_RE)][0];
      if (ph) { setF(ev.organization, 'phone', `${ph[1]}-${ph[2]}-${ph[3]}`, ln, 0.6); break; }
    }
  }

  // 会場
  const venueLn = lines.find((l) => l.label?.key === 'venue' && l.label.rest) ?? lines.find((l) => /さくらプラザ|戸塚区民文化センター/.test(l.norm) && !/(主催|共催|問|チケット|TEL)/.test(l.norm));
  if (venueLn) {
    const text = venueLn.label?.key === 'venue' ? venueLn.label.rest : venueLn.norm;
    const room = VENUE_ROOMS.find((r) => text.includes(r));
    const conf = venueLn.label?.key === 'venue' ? 0.85 : 0.6;
    setF(ev.venue, 'venue', /さくらプラザ|戸塚区民文化センター/.test(text) ? (text.match(/(戸塚区民文化センター\s*)?さくらプラザ(\s*[^\s、,()（）]*(ホール|ギャラリー|リハーサル室|アトリエ|練習室|スタジオ|ホワイエ|会議室|和室))?/)?.[0] ?? text) : text, venueLn, conf);
    if (room) setF(ev.venue, 'room', room, venueLn, 0.7);
    const fl = text.match(/(\d+)\s*(?:階|F)/);
    if (fl) setF(ev.venue, 'floor', `${fl[1]}階`, venueLn, 0.7);
  }

  // 料金
  const priceCtx = /(円|無料)/;
  let seatingDone = false;
  for (const ln of lines) {
    const t = ln.norm;
    if (!priceCtx.test(t)) continue;
    if (/(手数料|駐車|送料|交通費)/.test(t) && !/(一般|学生|席)/.test(t)) {
      if (/手数料/.test(t)) setF(ev.tickets, 'fees', t, ln, 0.6);
      continue;
    }
    if (/(膝上|ひざ上)/.test(t)) { setF(ev.pricing, 'lap_seating', t.replace(/^[※*]\s*/, ''), ln, 0.8); consumed.add(ln.idx); continue; }
    const inPriceSection = ln.section === 'price' || /(料金|入場料|全席|指定|自由|一般|学生|参加費|受講料|前売|当日|席)/.test(t);
    if (!inPriceSection && !/無料/.test(t)) continue;
    if (!seatingDone) {
      const seat = t.match(/(全席指定|全席自由|自由席|指定席|全席自由・?[^\s]*|当日自由席)/);
      if (seat) { setF(ev.pricing, 'seating_type', seat[1], ln, 0.85); seatingDone = true; }
    }
    if (/税込/.test(t)) setF(ev.pricing, 'tax_included', '税込', ln, 0.85);
    const PRICE_RE = /([^\s\d:：/／、,()（）]{1,12}(?:[(（][^)）]{1,15}[)）])?)?\s*[:：]?\s*[¥￥]?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*円\s*(?:[(（]([^)）]{1,30})[)）])?/g;
    let m;
    let found = false;
    while ((m = PRICE_RE.exec(t))) {
      let cat = (m[1] ?? '').replace(/(全席指定|全席自由|自由席|指定席|料金|入場料|チケット)/g, '').replace(/^[・\s]+|[・\s]+$/g, '');
      if (/^(各|計|約)$/.test(cat)) cat = '';
      const amount = Number(m[2].replace(/,/g, ''));
      const item = {
        id: `c${ev.pricing.prices.items.length + 1}`,
        category: cat ? field(cat, src(ln, 0.7)) : field(null),
        amount: field(amount, src(ln, 0.85)),
        label: field(null),
        note: m[3] ? field(m[3], src(ln, 0.7)) : field(null),
      };
      if (/(参加費|受講料)/.test(t) && !cat) item.category = field(/受講料/.test(t) ? '受講料' : '参加費', src(ln, 0.8));
      ev.pricing.prices.items.push(item);
      found = true;
    }
    if (!found && /無料/.test(t) && !/(入場無料の|以外)/.test(t)) {
      const lbl = t.match(/((?:入場|参加|観覧|受講)?無料(?:\s*[(（][^)）]*[)）])?)/)[1];
      if (!ev.pricing.prices.items.some((p) => p.amount.value === 0)) {
        ev.pricing.prices.items.push({
          id: `c${ev.pricing.prices.items.length + 1}`,
          category: field(null), amount: field(0, src(ln, 0.85)), label: field(lbl, src(ln, 0.85)), note: field(null),
        });
      }
    }
    if (/(参加費|受講料)/.test(t)) setF(ev.participation, 'participation_fee', ln.content || t, ln, 0.75);
    if (/学生証|学生券/.test(t) && /(提示|確認|要)/.test(t)) setF(ev.pricing, 'student_requirements', t, ln, 0.7);
  }

  // 年齢・対象
  for (const ln of lines) {
    const t = ln.norm;
    if (ln.section === 'eligibility') continue;
    if (ln.section === 'target' || ln.label?.key === 'target') {
      if (ln.content) setF(ev.participation, 'target_age', ln.content, ln, 0.8);
      continue;
    }
    if (/円/.test(t) && !/(入場|入れ|ご遠慮|不可)/.test(t)) continue; // 「学生1,500円（25歳以下）」は年齢制限ではない
    const age = t.match(/(未就学児[^。]*|\d+\s*[歳才]\s*(?:以上|未満|以下|から|〜)[^。]*|(?:小|中|高)学生以上[^。]*)/);
    if (age && !/(膝上|ひざ上)/.test(t)) {
      const strong = /(入場|入れ|ご遠慮|不可|可)/.test(t);
      setF(ev.pricing, 'age_requirement', tidy(age[1].replace(/^[※*]\s*/, '')), ln, strong ? 0.85 : 0.6);
      if (strong) consumed.add(ln.idx);
    }
    if (/学生証/.test(t)) { setF(ev.pricing, 'student_requirements', t.replace(/^[※*]\s*/, ''), ln, 0.7); consumed.add(ln.idx); }
  }

  // 定員・持ち物・申込・抽選・応募資格
  for (const ln of lines) {
    const t = ln.norm;
    const cap = t.match(/定員\s*[:：]?\s*(\d+\s*(?:名|人|組|席)[^\n]*)/);
    if (cap) setF(ev.participation, 'capacity', tidy(cap[1]), ln, 0.85);
    const lot = t.match(/((?:応募|申込)?(?:多数の場合は?)?抽選[^\n]*|先着順?[^\n]*)/);
    if (lot) setF(ev.participation, 'lottery', tidy(lot[1]), ln, 0.7);
  }
  const bel = sectionText('belongings');
  if (bel) setF(ev.participation, 'belongings', bel, sectionLines('belongings')[0], 0.8);
  const appl = sectionText('application');
  if (appl) setF(ev.participation, 'application_method', appl, sectionLines('application')[0], 0.7);
  const elig = sectionText('eligibility');
  if (elig) setF(ev.participation, 'eligibility', elig, sectionLines('eligibility')[0], 0.8);
  const closed = sectionText('closed_days');
  if (closed) setF(ev.schedule, 'closed_days', closed, sectionLines('closed_days')[0], 0.8);
  const openH = sectionText('open_hours');
  if (openH) setF(ev.schedule, 'open_hours', openH, sectionLines('open_hours')[0], 0.8);

  // 上演時間・休憩
  for (const ln of lines) {
    const t = ln.norm;
    const du = t.match(/((?:上演|公演|所要)時間\s*[:：]?\s*約?\s*\d+\s*(?:分|時間(?:\s*\d+\s*分)?)[^\n、。]*|約\s*\d+\s*(?:分|時間(?:\s*\d+\s*分)?)(?:\s*[(（][^)）]*[)）])?)/);
    if (du && !ev.schedule.duration.value && /(上演|公演|所要|予定|約)/.test(t) && !/(徒歩|駅)/.test(t)) setF(ev.schedule, 'duration', du[1].trim(), ln, 0.7);
    const ic = t.match(/(休憩\s*(?:あり|なし|有|無)?\s*(?:[(（]?\s*約?\s*\d+\s*分\s*[)）]?)?)/);
    if (ic) setF(ev.schedule, 'intermission', ic[1].trim(), ln, 0.7);
  }

  // アクセシビリティ
  const A11Y = [
    ['wheelchair', /(車いす|車椅子)/], ['accessible_toilet', /(多目的トイレ|バリアフリートイレ|だれでもトイレ)/],
    ['stroller', /(ベビーカー)/], ['childcare', /(託児)/], ['hearing_support', /(ヒアリングループ|磁気ループ|補聴|手話|字幕|要約筆記)/],
    ['age_accessibility', /(途中入退場|途中入場|泣いても|声を出しても)/],
  ];
  for (const ln of lines) {
    for (const [key, re] of A11Y) {
      if (re.test(ln.norm)) { setF(ev.accessibility, key, ln.norm.replace(/^[※*・]\s*/, ''), ln, 0.7); consumed.add(ln.idx); }
    }
  }

  // 注意事項（※で始まる行。曲目欄のものはプログラム注記へ）
  const noteLines = lines.filter((l) => /^[※*]/.test(l.norm) && l.section !== 'program' && !consumed.has(l.idx) && !/(膝上|ひざ上|手数料)/.test(l.norm));
  const notesSec = sectionLines('notes').map((l) => l.content).filter(Boolean);
  const notes = [...notesSec, ...noteLines.map((l) => l.norm.replace(/^[※*]\s*/, ''))];
  if (notes.length) ev.notes = field([...new Set(notes)].join('\n'), src(noteLines[0] ?? sectionLines('notes')[0], 0.7));

  // ジャンル
  const GENRES = ['クラシック', 'ジャズ', '落語', '演劇', 'ダンス', 'バレエ', '邦楽', '吹奏楽', '合唱', 'ポップス', 'ミュージカル', 'オペラ', '人形劇', '映画'];
  for (const g of GENRES) {
    const ln = lines.find((l) => l.norm.includes(g));
    if (ln) { setF(ev, 'genre', g, ln, 0.6); break; }
  }

  // ---- 出演者 ----
  const performers = [];
  const addPerformer = (p, ln, conf) => {
    if (!p.name || p.name.length > 30) return null;
    if (performers.some((x) => x.name.value === p.name)) return performers.find((x) => x.name.value === p.name);
    const item = {
      id: `p${performers.length + 1}`,
      name: field(p.name, src(ln, conf)),
      reading: p.reading ? field(p.reading, src(ln, conf)) : field(null),
      roman_name: field(null),
      role: p.role ? field(p.role, src(ln, conf)) : field(null),
      instrument: p.instrument ? field(p.instrument, src(ln, conf)) : field(null),
      profile: field(null), photo: field(null), photo_alt: field(null), photo_credit: field(null),
    };
    performers.push(item);
    return item;
  };
  const parsePerformerText = (text, ln, roleFromLabel) => {
    const t = text.trim();
    if (!t) return;
    // 「うた：A ピアノ：B」のように1行に複数ある場合は分ける
    const chunks = t.split(PAIR_SPLIT_RE).filter(Boolean);
    if (chunks.length > 1) { chunks.forEach((c) => parsePerformerText(c, ln, roleFromLabel)); return; }
    // 楽器：名前
    const im = t.match(/^([^\s:：/／]{1,12})\s*[:：/／]\s*(.+)$/);
    if (im && isInstrumentOrRole(im[1])) {
      for (const n of im[2].split(/[、,，]/)) addPerformer({ name: n.trim(), instrument: INSTRUMENTS.includes(im[1]) ? im[1] : null, role: ROLES.includes(im[1]) ? im[1] : roleFromLabel }, ln, 0.7);
      return;
    }
    // 名前（楽器）…の繰り返し
    const PAIR = /([^\s（(、,，/／][^（(、,，/／]*?)\s*[（(]([^）)]+)[）)]/g;
    let m;
    let any = false;
    while ((m = PAIR.exec(t))) {
      const name = m[1].trim();
      const par = m[2].trim();
      if (KANA_ONLY.test(par) && !isInstrumentOrRole(par)) addPerformer({ name, reading: par, role: roleFromLabel }, ln, 0.7);
      else if (isInstrumentOrRole(par)) addPerformer({ name, instrument: ROLES.includes(par) ? null : par, role: ROLES.includes(par) ? par : roleFromLabel }, ln, 0.75);
      else addPerformer({ name, role: roleFromLabel }, ln, 0.5);
      any = true;
    }
    if (any) return;
    // 名前 楽器
    const tail = t.match(/^(.{2,15}?)\s+([^\s]+)$/);
    if (tail && isInstrumentOrRole(tail[2])) {
      addPerformer({ name: tail[1], instrument: ROLES.includes(tail[2]) ? null : tail[2], role: ROLES.includes(tail[2]) ? tail[2] : roleFromLabel }, ln, 0.65);
      return;
    }
    // ローマ字の行は直前の出演者の欧文表記
    if (LATIN_ONLY.test(t) && performers.length && !performers.at(-1).roman_name.value) {
      performers.at(-1).roman_name = field(t, src(ln, 0.6));
      return;
    }
    if (t.length <= 16 && !/[。、]/.test(t) && !/\d/.test(t)) addPerformer({ name: t, role: roleFromLabel }, ln, 0.45);
  };
  for (const ln of sectionLines('performers')) {
    if (/^[※*]/.test(ln.norm)) continue;
    const word = ln.sectionWord;
    const roleFromLabel = /^(出演|出演者|キャスト)$/.test(word) ? null : word;
    if (ln.label) { if (ln.label.rest) parsePerformerText(ln.label.rest, ln, roleFromLabel); continue; }
    if (/[。]/.test(ln.norm) || ln.norm.length > 40) continue;
    parsePerformerText(ln.norm, ln, roleFromLabel);
  }
  // プロフィール
  const profLines = lines.filter((l) => l.section === 'profile' && !l.label);
  const nameKey = (s) => s.replace(/\s/g, '');
  let cur = null;
  const profiles = new Map();
  const startsWithName = (t) => performers.find((p) => nameKey(t).startsWith(nameKey(p.name.value)));
  const candidates = profLines.length ? profLines : lines.filter((l) => l.section !== 'performers');
  for (const ln of candidates) {
    const p = startsWithName(ln.norm);
    if (p && (profLines.length || (ln.norm.length > 30 && /。/.test(ln.norm)))) {
      cur = p;
      const namePrefix = new RegExp(`^.*?${[...nameKey(p.name.value)].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*')}\\s*(?:[(（][^)）]*[)）])?\\s*`);
      const rest = ln.norm.replace(namePrefix, '').trim();
      profiles.set(p, { lines: rest ? [rest] : [], ln });
    } else if (cur && profiles.has(cur) && (profLines.length || /。/.test(ln.norm))) {
      if (LATIN_ONLY.test(ln.norm) && !cur.roman_name.value) cur.roman_name = field(ln.norm, src(ln, 0.6));
      else if (!matchLabel(ln.norm)) profiles.get(cur).lines.push(ln.norm);
    } else if (profLines.length && performers.length === 1 && !profiles.size) {
      cur = performers[0];
      profiles.set(cur, { lines: [ln.norm], ln });
    } else {
      cur = profLines.length ? cur : null;
    }
  }
  for (const [p, { lines: pl, ln }] of profiles) {
    const text = pl.join('').trim();
    if (text) p.profile = field(text, src(ln, 0.6, { note: 'プロフィールの範囲を自動判定しています。前後の文が混ざっていないか確認してください。' }));
  }
  ev.performers.items = performers;

  // ---- プログラム ----
  const works = [];
  let currentPart = null;
  const programNotes = [];
  for (const ln of sectionLines('program')) {
    const text = ln.label ? ln.label.rest : ln.norm;
    if (!text) continue;
    if (/^[※*]/.test(text) || /(変更|予定|ほか|他$)/.test(text) && text.length < 40 && !/[:：／/]/.test(text)) { programNotes.push(text.replace(/^[※*]\s*/, '')); continue; }
    const part = text.match(/^(第\s*\d+\s*部|前半|後半|Part\s*\d+)\s*$/i);
    if (part) { currentPart = part[1]; continue; }
    const mm = text.match(/^(.+?)\s*[:：／/]\s*(.+)$/);
    const item = { id: `w${works.length + 1}`, composer: field(null), work: field(null), section: currentPart ? field(currentPart, src(ln, 0.7)) : field(null), notes: field(null) };
    if (mm && mm[1].length <= 20) {
      item.composer = field(mm[1].trim(), src(ln, 0.75));
      item.work = field(mm[2].trim(), src(ln, 0.75));
    } else {
      item.work = field(text, src(ln, 0.5));
    }
    works.push(item);
  }
  ev.program.works.items = works;
  if (programNotes.length) ev.program.notes = field(programNotes.join('\n'), src(sectionLines('program')[0], 0.7));

  // ---- チケット取扱・コード ----
  const PROVIDERS = /(チケットぴあ|ローソンチケット|イープラス|e\+|カンフェティ|チケットセンター|チケットボックス|窓口|プレイガイド)/;
  const channels = [];
  for (const ln of lines) {
    const inSec = ln.section === 'tickets';
    const t = ln.label?.key === 'tickets' ? ln.label.rest : ln.norm;
    if (!t) continue;
    const code = [...t.matchAll(/([PL])\s*コード\s*[:：]?\s*([\d-]+)/g)];
    for (const c of code) {
      ev.tickets.ticket_codes.items.push({ id: `k${ev.tickets.ticket_codes.items.length + 1}`, provider: field(c[1] === 'P' ? 'チケットぴあ' : 'ローソンチケット', src(ln, 0.8)), code: field(`${c[1]}コード ${c[2]}`, src(ln, 0.85)) });
    }
    if (!(inSec || (PROVIDERS.test(t) && !(ln.label && ln.label.key !== 'tickets') && !['application', 'application_period', 'contact'].includes(ln.section) && !/(発売|主催|問い?合|申込|応募)/.test(t)))) continue;
    if (/^[※*]/.test(t)) { setF(ev.tickets, 'ticket_notes', t.replace(/^[※*]\s*/, ''), ln, 0.6); continue; }
    const ph = [...t.matchAll(PHONE_RE)][0];
    const url = t.match(URL_RE)?.[0];
    const hours = t.match(/[(（]?\s*(\d{1,2}:\d{2}\s*〜\s*\d{1,2}:\d{2}[^)）]*)[)）]?/);
    let name = t.replace(URL_RE, '').replace(PHONE_RE, '').replace(/([PL])\s*コード\s*[:：]?\s*[\d-]+/g, '').replace(/[(（]?\s*\d{1,2}:\d{2}\s*〜\s*\d{1,2}:\d{2}[^)）]*[)）]?/, '')
      .replace(/(TEL|Tel|電話)\s*[:：]?/g, '').replace(/[:：\s]+$/, '').trim();
    if (!name && !ph && !url) continue;
    if (!name) name = '（取扱先名 要確認）';
    if (channels.some((c) => c.name.value === name)) continue;
    channels.push({
      id: `t${channels.length + 1}`,
      name: field(name, src(ln, inSec ? 0.7 : 0.55)),
      detail: field(null),
      phone: ph ? field(`${ph[1]}-${ph[2]}-${ph[3]}`, src(ln, 0.85)) : field(null),
      url: url ? field(url, src(ln, 0.85)) : field(null),
      hours: hours ? field(hours[1].trim(), src(ln, 0.7)) : field(null),
    });
  }
  ev.tickets.ticket_channels.items = channels;

  // ---- URL（取扱・申込以外は外部リンクへ） ----
  const usedUrls = new Set(channels.map((c) => c.url.value).filter(Boolean));
  for (const ln of lines) {
    for (const u of ln.norm.match(URL_RE) ?? []) {
      if (usedUrls.has(u)) continue;
      usedUrls.add(u);
      if (ln.section === 'application' || /(申込|応募)/.test(ln.norm)) {
        setF(ev.participation, 'application_url', u, ln, 0.75);
        continue;
      }
      const label = ln.norm.replace(u, '').replace(/[:：\s▶→>]+$/g, '').replace(/^[:：\s]+/, '').trim();
      ev.links.items.push({
        id: `l${ev.links.items.length + 1}`,
        label: field(label || null, src(ln, 0.4, { note: 'リンクの説明は行き先がわかる文にしてください（「こちら」は不可）。' })),
        url: field(u, src(ln, 0.85)),
      });
    }
  }

  // ---- タイトル・紹介文 ----
  const isDataLine = (l) => l.label || findDates(l.norm).length || findTimes(l.norm).length || /円|TEL|https?:|@|^[※*]/.test(l.norm);
  const first = raw.files?.[0];
  const firstPageLines = lines.filter((l) => l.file === first?.name && l.page === (first?.pages?.[0]?.page ?? 1));
  const sized = firstPageLines.filter((l) => l.size && !isDataLine(l) && l.norm.length >= 2);
  let titleLn = null;
  let titleText = null;
  if (sized.length) {
    const max = Math.max(...sized.map((l) => l.size));
    const big = sized.filter((l) => l.size >= max * 0.93);
    titleLn = big[0];
    // 隣り合う同サイズの行は1つのタイトルとして結合
    const joined = [titleLn];
    for (const l of big.slice(1)) if (l.idx === joined.at(-1).idx + 1) joined.push(l);
    titleText = joined.map((l) => l.norm).join(' ');
    ev.basic.title = field(titleText, src(titleLn, 0.65, { note: '文字の大きさから推定しました。' }));
    const second = sized.filter((l) => l.size < max * 0.93 && !joined.includes(l)).sort((a, b) => b.size - a.size)[0];
    if (second && Math.abs(second.idx - titleLn.idx) <= 2 && second.norm.length <= 40) {
      ev.basic.subtitle = field(second.norm, src(second, 0.4, { note: '文字の大きさから推定しました。' }));
    }
  } else {
    titleLn = lines.find((l) => !isDataLine(l) && l.norm.length >= 3 && l.norm.length <= 60 && !/[。]/.test(l.norm));
    if (titleLn) ev.basic.title = field(titleLn.norm, src(titleLn, 0.45, { note: '最初の行から推定しました。' }));
  }
  const descLines = lines.filter((l) => !l.section && /。/.test(l.norm) && !/^[※*]/.test(l.norm) && !startsWithName(l.norm));
  if (descLines.length) ev.basic.description = field(descLines.map((l) => l.norm).join('\n'), src(descLines[0], 0.5, { note: 'チラシの文章をそのまま入れています。' }));

  // ---- 状態の手がかり（自動では設定しない） ----
  if (/(完売|予定枚数終了)/.test(allText)) suggestions.push({ status: 'sold_out', message: 'チラシに「完売」の表記があります。販売状況を確認してください。' });
  if (/(受付終了|募集終了|定員に達し)/.test(allText)) suggestions.push({ status: 'registration_closed', message: 'チラシに「受付終了」の表記があります。' });
  if (/(公演中止|開催中止)/.test(allText)) suggestions.push({ status: 'cancelled', message: 'チラシに「中止」の表記があります。' });
  if (/延期/.test(allText)) suggestions.push({ status: 'postponed', message: 'チラシに「延期」の表記があります。' });

  // ---- 補足 ----
  if (!ev.venue.venue.value) warnings.push(`会場が見つかりませんでした。${FACILITY_NAME}の室名を確認して入力してください。`);
  if (!sessions.length && !ev.schedule.start_date.value) warnings.push('開催日が見つかりませんでした。');
  sessions.forEach((s) => {
    if (s.date.origin === 'inferred') warnings.push(`開催日 ${s.date.value} の「年」はチラシに書かれていないため推定しました。必ず確認してください。`);
  });

  ev.event_id = makeEventId(ev);
  return { event: ev, log, warnings, suggestions, lines, classification: cls };
}

export function makeEventId(ev) {
  const d = ev.schedule.dates.items[0]?.date?.value ?? ev.schedule.start_date?.value ?? 'undated';
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${d}-${rnd}`;
}
