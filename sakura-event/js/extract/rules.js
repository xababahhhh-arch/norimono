// raw extraction（ページごとの文字）から event.json の下書きを作るルールベース抽出。
// ・値には必ず出典（ファイル・ページ・元の行）と確信度を付ける。
// ・確認済み（confirmed）には絶対にしない。
// ・見つからない項目は空のまま（推測で埋めない）。
import { field, addReason } from '../core/field.js';
import { createEmptyEvent, VENUE_ROOMS, FACILITY_NAME } from '../core/schema.js';
import { normalizeText, toIso, isIsoDate, weekdayOf, normTime, reiwaToYear, todayIso } from '../core/dates.js';
import { classify } from '../core/classify.js';

export const EXTRACTOR_VERSION = 'rules-1.2';

// ---- 前処理 -----------------------------------------------------------

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

/** NFKC の前に丸数字を保護する（NFKC で ① が 1 になり時刻とくっつくのを防ぐ） */
export function prepLine(s) {
  const protectedText = String(s ?? '').replace(/[①-⑳]/g, (c) => ` 〈${CIRCLED.indexOf(c) + 1}〉 `);
  return normalizeText(protectedText).replace(/[ \t]+/g, ' ').trim()
    // 「主　催：」「電　話：」のように字間を空けた見出し語を詰める
    .replace(/^([一-龥])\s+([一-龥])(?=\s*[:：])/, '$1$2');
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
      let blank = true; // ページの先頭は区切りとみなす
      for (const ln of srcLines) {
        const text = String(ln.text ?? '').trim();
        if (!text) { blank = true; continue; }
        const prev = lines.at(-1);
        // 「…オンライン窓口・」＋「その他プレイガイド：8月16日」のように、行末が「・」「、」で続く文は1行につなぐ
        const method = ln.method ?? pg.method ?? file.method ?? null;
        if (!blank && prev && prev.file === file.name && prev.page === (pg.page ?? 1) && /[・、，,]$/.test(prev.norm) && !matchLabel(prepLine(text))) {
          prev.text = `${prev.text}${text}`;
          prev.norm = prepLine(prev.text);
          prev.joined = true;
          if (prev.method !== method) prev.method = 'mixed';
          prev.bbox = unionBox(prev.bbox, ln.bbox ?? null);
          prev.lowWords = [...(prev.lowWords ?? []), ...(ln.lowWords ?? [])];
          continue;
        }
        // 位置情報がある行（PDFの文字・OCR）は、行間が大きく空いた所や段（列）が変わった所を空行とみなす
        if (!blank && prev && prev.page === (pg.page ?? 1) && prev.bbox && ln.bbox) {
          const lh = Math.max(0.004, prev.bbox.y1 - prev.bbox.y0);
          const gap = ln.bbox.y0 - prev.bbox.y1;
          if (gap > lh * 1.6 || gap < -lh * 2 || Math.abs(ln.bbox.x0 - prev.bbox.x0) > 0.25) blank = true;
        }
        lines.push({
          file: file.name, page: pg.page ?? 1, text, norm: prepLine(text), size: ln.size ?? null, idx: lines.length, blankBefore: blank,
          method, bbox: ln.bbox ?? null, conf: ln.conf ?? null, lowWords: ln.lowWords ?? [],
        });
        blank = false;
      }
    }
  }
  return lines;
}

function unionBox(a, b) {
  if (!a) return b;
  if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
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
  ['sales', 'チケット発売(?:情報|日)?|一般発売日?|発売(?:日|情報)?'],
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

// 値が1行で終わる見出し。後の行まで範囲を広げない（「休館日：」の後に主催などが混ざるのを防ぐ）
const SINGLE_LINE_LABELS = new Set(['organizer', 'co_organizer', 'supporter', 'sponsor', 'grant', 'cooperation', 'planning', 'venue', 'target', 'capacity', 'closed_days', 'open_hours', 'deadline', 'application_period', 'notification']);

/** 施設名だけの行（チラシのロゴ・フッター）。見出しの範囲の区切りに使う */
export function isFacilityLine(norm) {
  return /^(戸塚区民文化センター)?さくらプラザ$/.test(String(norm).replace(/\s/g, ''));
}

const DATA_RE = /(\d{1,2}:\d{2}|\d{1,2}月\d{1,2}日|\d+円|TEL|https?:|@)/;

function sectionize(lines) {
  let current = null;
  let currentWord = null;
  let remaining = Infinity; // 1行見出しで値が次の行にある場合の残り行数
  let sectionLines = [];
  const end = () => { current = null; currentWord = null; remaining = Infinity; sectionLines = []; };
  for (const ln of lines) {
    const lab = matchLabel(ln.norm);
    ln.facility = isFacilityLine(ln.norm);
    if (lab) {
      current = lab.key;
      currentWord = lab.word;
      remaining = SINGLE_LINE_LABELS.has(lab.key) ? (lab.rest ? 0 : 1) : Infinity;
      sectionLines = [ln];
      ln.label = lab;
      ln.section = current;
      ln.sectionWord = currentWord;
      ln.content = lab.rest;
      continue;
    }
    if (current) {
      const starred = (x) => /^[※*・●■]/.test(x.norm);
      const stop = ln.facility
        || remaining <= 0
        || (ln.blankBefore && current !== 'profile')
        // プログラム欄に日付・時刻・料金・電話・URLの行が来たら、別の情報に移ったとみなす
        || (current === 'program' && DATA_RE.test(ln.norm))
        // 注意事項（※の箇条書き）の後の、※で始まらない文章は別の段落
        || (current === 'notes' && !starred(ln) && sectionLines.length > 1 && sectionLines.slice(1).every(starred));
      if (stop) end();
    }
    ln.section = current;
    ln.sectionWord = currentWord;
    ln.content = ln.norm;
    if (current) { sectionLines.push(ln); remaining -= 1; }
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
  // 取扱先・問い合わせ・注意事項・プロフィール欄の日付や、電話受付の行は公演日時ではない
  if (NON_EVENT_SECTIONS.has(ln.section) || /(TEL|電話|FAX|受付時間|営業時間|平日)/.test(t)) return 'other';
  return 'event';
}

const NON_EVENT_SECTIONS = new Set(['tickets', 'contact', 'notes', 'profile', 'price', 'closed_days', 'open_hours', 'organizer', 'co_organizer', 'cooperation', 'planning']);

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
    // 数字の途中（電話番号・「1.5」など）は除外。「日付／18:30」の「／」の後は時刻として扱う
    const before = norm[m.index - 1];
    if (before && /[\d.]/.test(before)) continue;
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
    if (!t.kind && i + 1 < out.length && /^\s*[〜-]\s*$/.test(segAfter(i))) { t.kind = 'start_time'; out[i + 1].kind = out[i + 1].kind ?? 'end_time'; t.range = true; }
    if (!t.kind && /^\s*〜/.test(segAfter(i))) t.kind = 'start_time';
    if (!t.kind && i > 0 && out[i - 1].range) t.kind = 'end_time';
  });
  return out;
}

/**
 * 1行の中の「開場」「開演」と時刻の対応が一意に決まるかを調べる。
 * 決まらない場合は理由を返す（推測で割り当てない）。
 */
export function timeAmbiguity(norm, times) {
  const nOpen = (norm.match(/開場/g) || []).length;
  const nStart = (norm.match(/開演|開始/g) || []).length;
  const aOpen = times.filter((t) => t.kind === 'doors_open');
  const aStart = times.filter((t) => t.kind === 'start_time');
  if (nOpen + nStart === 0) return null;
  if (aOpen.length !== nOpen || aStart.length !== nStart) {
    return '「開場」「開演」の語と時刻の組み合わせを自動で区別できませんでした';
  }
  if (aOpen.length === 1 && aStart.length === 1 && aOpen[0].time >= aStart[0].time) {
    return '読み取った開場時刻が開演時刻と同じか後になっています';
  }
  return null;
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
// 英語の楽器名（チラシの原文のまま instrument に入れる。日本語に訳さない）
const EN_INSTRUMENTS = ['Piano', 'Saxophone', 'Alto Saxophone', 'Tenor Saxophone', 'Soprano Saxophone', 'Sax', 'Violin', 'Viola', 'Cello', 'Violoncello',
  'Contrabass', 'Double Bass', 'Bass', 'Flute', 'Oboe', 'Clarinet', 'Bassoon', 'Trumpet', 'Horn', 'Trombone', 'Tuba', 'Harp', 'Guitar',
  'Percussion', 'Drums', 'Vocal', 'Vocals', 'Voice', 'Soprano', 'Mezzo-soprano', 'Alto', 'Tenor', 'Baritone', 'Organ', 'Harpsichord',
  'Marimba', 'Keyboard', 'Keyboards', 'Conductor'];
const EN_INSTR_RE = new RegExp(`^(.+?)\\s+(${EN_INSTRUMENTS.sort((a, b) => b.length - a.length).join('|')})$`, 'i');
const JP_NAME_RE = /^[一-龥々ぁ-んァ-ヶー・]+(?:\s[一-龥々ぁ-んァ-ヶー・]+)*$/;

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

/** 「※」や「。」で区切って1文ずつにする（先頭の※は除く） */
export function splitSentences(norm) {
  // 括弧の中の「※」「。」では区切らない（例：「発券手数料（385円※税込）」）
  const out = [];
  let cur = '';
  let depth = 0;
  for (const ch of String(norm ?? '')) {
    if ('(（「『'.includes(ch)) depth += 1;
    if (')）」』'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === '※' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
    if (ch === '。' && depth === 0) { out.push(cur); cur = ''; }
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter((x) => x && !/^[。、)）]$/.test(x));
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

  const defaultBasis = (ln) => (ln.label ? `見出し「${ln.label.word}」の行から取り出しました` : 'チラシの文字の書き方から取り出しました');
  const OCR_REASON = 'OCRで読み取った文字です。チラシの文字と1文字ずつ照合してください';
  const ocrReasons = (ln) => {
    if (ln.method !== 'ocr' && ln.method !== 'mixed') return [];
    const r = [OCR_REASON];
    if (ln.lowWords?.length) r.push(`読み取りにくかった部分があります（「${ln.lowWords.slice(0, 5).join('」「')}」）`);
    return r;
  };
  const src = (ln, confidence, extra = {}) => ({
    file: ln.file, page: ln.page, text: ln.text, confidence, origin: 'extracted', method: ln.method ?? null, bbox: ln.bbox ?? null,
    basis: extra.basis ?? defaultBasis(ln), ...extra,
    reasons: [...(extra.reasons ?? []), ...ocrReasons(ln)],
  });
  // 値として取り込まず、原文つきで人の判断を求める記載
  ev.meta.review_items = [];
  const review = (topic, ln, reason, { blocking = true, text } = {}) => {
    const t = text ?? ln.text;
    if (ev.meta.review_items.some((r) => r.topic === topic && r.text === t)) return;
    ev.meta.review_items.push({ id: `r${ev.meta.review_items.length + 1}`, topic, text: t, page: ln.page, file: ln.file, method: ln.method ?? null, bbox: ln.bbox ?? null, reason, blocking, resolved: false, resolution: '' });
  };
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
  ev.event_type = field(cls.type, { confidence: cls.confidence, origin: 'inferred', text: cls.reason, basis: `種別を推定した${cls.reason}`, reasons: ['種別は推定です。違う場合は変更してください'] });

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
    date: field(iso, src(ln, conf, inferred
      ? { origin: 'inferred', basis: '日付の書き方の行から取り出しました', reasons: ['年がチラシに書かれていないため推定しました'] }
      : { basis: '「発売」「受付」などの語がない行の日付を、公演日としました' })),
    weekday_on_flyer: dt.weekday
      ? field(dt.weekday, src(ln, 0.95, { basis: '日付の後の（）内の曜日です' }))
      : field(null, unreadableWeekday(ln, dt) ? { reasons: [`日付の後の曜日の部分（「${ln.norm[dt.end]}」）を読み取れませんでした。チラシの曜日を確認してください`], text: ln.text, page: ln.page, file: ln.file, method: ln.method, bbox: ln.bbox } : {}),
    session_label: field(null),
    doors_open: field(null),
    start_time: field(null),
    end_time: field(null),
    status: null,
  });
  const KIND_WORD = { doors_open: '開場', start_time: '開演・開始', end_time: '終演・終了' };
  // OCR で四角囲みの曜日（㊏など）が別の文字になった場合
  const unreadableWeekday = (ln, dt) => (ln.method === 'ocr' || ln.method === 'mixed') && /[^\s\d/(（)）:〜.,、。]/.test(ln.norm[dt.end] ?? ' ');
  const applyTimes = (s, times, ln, labelText) => {
    const amb = timeAmbiguity(ln.norm, times);
    if (amb) {
      // 推測しない：開場・開演は空欄のまま、原文つきで確認を求める
      for (const k of ['doors_open', 'start_time']) {
        if (!s[k].value) s[k] = field(null, { reasons: [`${amb}。原文「${ln.text}」を見て入力してください。`], text: ln.text, page: ln.page, file: ln.file });
      }
      review('開場・開演の時刻', ln, `${amb}。開場と開演の時刻をチラシで確認して入力してください。`);
      return;
    }
    for (const t of times) {
      if (!t.kind || t.kind === 'reception') continue;
      if (!s[t.kind].value) s[t.kind] = field(t.time, src(ln, 0.9, { basis: `「${KIND_WORD[t.kind]}」の語と並んで書かれた時刻です` }));
    }
    const untagged = times.filter((t) => !t.kind);
    if (!s.start_time.value && untagged.length === 1) {
      s.start_time = field(untagged[0].time, src(ln, 0.55, { basis: '開催日と同じ行にある時刻です', reasons: ['「開演」「開始」の語がないため、開始時刻かどうか確認してください'] }));
    }
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
    // OCR：日付・時刻に関わる語と数字があるのに日付として読めない行（「20268A 158」など）は確認を求める
    if ((ln.method === 'ocr' || ln.method === 'mixed') && !dates.length && /(発売|予約|先行|開演|開場|公演日|日時)/.test(ln.norm) && /\d{3,}/.test(ln.norm) && !/(TEL|FAX|\d{2,4}-\d{2,4}-\d{3,4})/.test(ln.norm)) {
      review('日付の読み取り', ln, '日付らしき数字がありますが、日付として読み取れませんでした（OCRの読み誤りの可能性があります）。チラシで日付・時刻を確認して入力してください。');
    }
    if (dates.length && ctx !== 'event') {
      const r = resolveYear(dates[0], yctx);
      if (!r) return;
      const conf = r.inferred ? 0.6 : 0.8;
      if (ctx === 'sales') {
        const t = ln.norm;
        // 販売方法ごとの発売日時（原文の販売方法をそのまま持つ。時刻も保持する）
        for (const dt of dates) {
          const rr = resolveYear(dt, yctx);
          if (!rr) continue;
          let method = t.slice(0, dt.index).replace(/[\s:：]+$/, '').replace(/^[【■●◆]+|[】]+$/g, '').trim();
          if (!method || /^\d/.test(method)) method = ln.label?.word ?? '発売';
          const after = findTimes(t.slice(dt.end, dates[dates.indexOf(dt) + 1]?.index ?? t.length));
          const time = after[0]?.time ?? null;
          const sched = ev.tickets.sales_schedule.items;
          const same = sched.find((x) => x.method.value.replace(/\s/g, '') === method.replace(/\s/g, '') && x.date.value === rr.iso);
          if (same && (same.time.value === time || !time)) continue; // 同じ記載（片方の時刻が読めなかった場合も含む）
          if (same && !same.time.value) { same.time = field(time, src(ln, 0.8, { basis: '発売日の後に書かれた時刻です' })); continue; }
          const basis = '「発売」「先行」などの語がある行の日付です。日付より前の文字を販売方法として取り出しました';
          sched.push({
            id: `ss${sched.length + 1}`,
            method: field(method, src(ln, 0.7, { basis })),
            date: field(rr.iso, src(ln, rr.inferred ? 0.6 : 0.85, { basis, reasons: rr.inferred ? ['年がチラシに書かれていないため推定しました'] : [] })),
            time: time ? field(time, src(ln, 0.8, { basis: '発売日の後に書かれた時刻です' })) : field(null),
            note: field(null),
          });
        }
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
    } else if (eventish && !dates.length && times.length && lastSession && i - lastSessionLine <= 4 && !ln.label?.key?.match(/tickets|contact|open_hours/)
      && !/(TEL|電話|FAX|受付|営業|窓口|休館|平日)/.test(ln.norm)) {
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
  // 「企画・制作」「宣伝美術」は主催等の項目には入れないが、区切りとして認識する
  const ORG_RE = /(主催|共催|後援|協賛|助成|協力|企画・?制作|宣伝美術)\s*[:：]\s*/g;
  const ORG_KEYS = { 主催: 'organizer', 共催: 'co_organizer', 後援: 'supporter', 協賛: 'sponsor', 助成: 'grant', 協力: 'cooperation' };
  for (const ln of lines) {
    const parts = [...ln.norm.matchAll(ORG_RE)];
    if (parts.length) {
      parts.forEach((p, j) => {
        const start = p.index + p[0].length;
        const end = j + 1 < parts.length ? parts[j + 1].index : ln.norm.length;
        const v = ln.norm.slice(start, end).trim().replace(/[、,/／]$/, '');
        // 次の行が括弧だけの行（「（指定管理者 …）」）なら続きとしてつなぐ
        const nx = lines[ln.idx + 1];
        const cont = j + 1 === parts.length && nx && !nx.label && /^[(（].*[)）]$/.test(nx.norm) ? nx : null;
        const val = cont ? `${v}${cont.norm}` : v;
        if (val && ORG_KEYS[p[1]] && setF(ev.organization, ORG_KEYS[p[1]], val, ln, 0.85, { basis: `「${p[1]}：」の後の文字です${cont ? '（次の行の括弧書きを含む）' : ''}` }) && cont) consumed.add(cont.idx);
      });
    } else if (ln.label && ORG_KEYS[ln.label.word]) {
      const v = ln.label.rest || lines[ln.idx + 1]?.norm;
      if (v) setF(ev.organization, ORG_KEYS[ln.label.word], v, ln, ln.label.rest ? 0.85 : 0.6);
    }
  }

  // 問い合わせ・電話・メール・URL
  const PHONE_RE = /(?<!\d)(0\d{1,4})\s*[-(（]\s*(\d{1,4})\s*[-)）]\s*(\d{3,4})(?!\d)/g;
  const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const URL_RE = /https?:\/\/[^\s<>"'（()）」』、]+/g;
  const contactLines = sectionLines('contact');
  for (const ln of contactLines) {
    if (ln.label && ln.label.rest) setF(ev.organization, 'contact', ln.label.rest.replace(PHONE_RE, '').replace(/(TEL|Tel|tel|電話)\s*[:：]?\s*$/, '').trim() || ln.label.rest, ln, 0.75);
    else if (!ln.label && !ev.organization.contact.value) setF(ev.organization, 'contact', ln.content.replace(PHONE_RE, '').replace(/(TEL|Tel|tel|電話)\s*[:：]?\s*$/, '').trim(), ln, 0.6);
    const ph = [...ln.norm.matchAll(PHONE_RE)][0];
    if (ph) setF(ev.organization, 'phone', `${ph[1]}-${ph[2]}-${ph[3]}`, ln, 0.9);
    const hours = ln.norm.match(/(\d{1,2}:\d{2}\s*〜\s*\d{1,2}:\d{2}[^\n]*)/);
    if (hours && /受付|時間|〜/.test(ln.norm)) setF(ev.organization, 'contact_hours', tidy(hours[1]), ln, 0.6, { basis: '問い合わせの電話番号の後の時間です' });
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
  // 全館共通の案内・別企画（「学生応援PROJECT」「■22歳以下は当日券が500円 ※一部除外公演有り」など）は本公演の料金にしない
  const promo = new Set();
  lines.forEach((ln, i) => {
    if (/(PROJECT|プロジェクト|キャンペーン|割引対応|一部除外)/i.test(ln.norm)) {
      promo.add(i);
      for (let j = i + 1; j < lines.length && j <= i + 5; j++) {
        if (lines[j].label || lines[j].facility || lines[j].blankBefore) break;
        promo.add(j);
      }
      for (let j = i - 1; j >= 0 && j >= i - 2; j--) if (/^[■◆]/.test(lines[j].norm)) promo.add(j);
    }
  });
  const priceCtx = /(円|無料)/;
  let seatingDone = false;
  for (const ln of lines) {
    // 手数料・駐車料金などの文は料金として読まない（同じ行に「席」などがあっても）
    const t = /(手数料|駐車|送料|交通費)/.test(ln.norm) ? splitSentences(ln.norm).filter((x) => !/(手数料|駐車|送料|交通費)/.test(x)).join('※') : ln.norm;
    if (!priceCtx.test(t)) continue;
    // OCR で「2,500円」が「2.500円」のように読まれた場合は、金額を推測で直さず、確認を求める
    const oddSep = [...t.matchAll(/\d[.．]\d{3}\s*円/g)];
    if (oddSep.length) {
      review('金額の読み取り', ln, `金額の区切りが「.」になっている部分があります（${oddSep.map((m) => `「${m[0]}」`).join('')}）。OCRの読み誤りの可能性があるため、この金額は料金に入れていません。チラシで金額を確認して入力してください。`);
    }
    if (promo.has(ln.idx) || /^[■◆]/.test(t)) {
      if (/\d\s*円/.test(t)) review('料金らしき記載', ln, '全館共通の案内や別企画の記載と思われるため、本公演の料金には入れていません。本公演に当てはまるか確認してください。', { blocking: false });
      continue;
    }
    if (/(手数料|駐車|送料|交通費)/.test(t) && !/(一般|学生|席)/.test(t)) continue;
    if (/(膝上|ひざ上)/.test(t)) { setF(ev.pricing, 'lap_seating', t.replace(/^[※*]\s*/, ''), ln, 0.8); consumed.add(ln.idx); continue; }
    const inPriceSection = ln.section === 'price' || /(料金|入場料|全席|指定|自由|一般|学生|参加費|受講料|前売|当日|席)/.test(t);
    // 「会員登録（無料）」などは入場料ではない。入場・参加などの無料だけを料金として扱う
    const freeOk = /(入場|参加|観覧|受講|鑑賞|全席)\s*無料|^無料/.test(t) || ln.section === 'price';
    if (!inPriceSection && !freeOk) continue;
    if (!seatingDone) {
      const seat = t.match(/(全席指定|全席自由|自由席|指定席|全席自由・?[^\s]*|当日自由席)/);
      if (seat) { setF(ev.pricing, 'seating_type', seat[1], ln, 0.85); seatingDone = true; }
    }
    if (/税込/.test(t)) setF(ev.pricing, 'tax_included', '税込', ln, 0.85);
    const PRICE_RE = /([^\s\d:：/／、,()（）]{1,12}(?:\s?[(（][^)）]{1,15}[)）])?)?\s*[:：]?\s*[¥￥]?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*円\s*(?:[(（]([^)）]{1,30})[)）])?/g;
    let m;
    let found = false;
    while ((m = PRICE_RE.exec(t))) {
      if (/\d[.．]$/.test(t.slice(0, m.index + m[0].indexOf(m[2]))) || /[.．]\d{3}\s*円/.test(m[0])) continue;
      let cat = (m[1] ?? '').replace(/(全席指定|全席自由|自由席|指定席|料金|入場料|チケット)/g, '').replace(/^[・\s]+|[・\s]+$/g, '');
      if (/^(各|計|約)$/.test(cat)) cat = '';
      // 区分名が文の途中（「歳以下は当日券が」など）になる場合は料金として取り込まない
      if (/[はがをにでも]$/.test(cat) || /^[歳才]/.test(cat)) {
        review('料金らしき記載', ln, '料金の区分を読み取れないため、料金には入れていません。本公演の料金か確認してください。', { blocking: false });
        continue;
      }
      const amount = Number(m[2].replace(/,/g, ''));
      const pb = { basis: '料金の行の「区分 金額円」の書き方から取り出しました' };
      const item = {
        id: `c${ev.pricing.prices.items.length + 1}`,
        category: cat ? field(cat, src(ln, 0.7, pb)) : field(null),
        amount: field(amount, src(ln, 0.85, pb)),
        label: field(null),
        note: m[3] ? field(m[3], src(ln, 0.7)) : field(null),
      };
      if (/(参加費|受講料)/.test(t) && !cat) item.category = field(/受講料/.test(t) ? '受講料' : '参加費', src(ln, 0.8));
      ev.pricing.prices.items.push(item);
      found = true;
    }
    if (!found && freeOk && /無料/.test(t) && !/(入場無料の|以外)/.test(t)) {
      const lbl = t.match(/((?:入場|参加|観覧|受講)?無料(?:\s*[(（][^)）]*[)）])?)/)[1];
      if (!ev.pricing.prices.items.some((p) => p.amount.value === 0)) {
        ev.pricing.prices.items.push({
          id: `c${ev.pricing.prices.items.length + 1}`,
          category: field(null), amount: field(0, src(ln, 0.85)), label: field(lbl, src(ln, 0.85)), note: field(null),
        });
      }
    }
    if (/(参加費|受講料)/.test(t)) setF(ev.participation, 'participation_fee', ln.content || t, ln, 0.75);
    if (/学生証|学生券/.test(t) && /(提示|確認|要)/.test(t)) setF(ev.pricing, 'student_requirements', splitSentences(t).find((x) => /学生/.test(x)) ?? t, ln, 0.7, { basis: '「学生証」「学生券」を含む文です' });
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
    if (/学生証/.test(t)) {
      const sent = splitSentences(t).find((x) => /学生証/.test(x));
      setF(ev.pricing, 'student_requirements', sent, ln, 0.7, { basis: '「学生証」を含む文です' });
      consumed.add(ln.idx);
    }
    if (/総額表示/.test(t)) setF(ev.pricing, 'tax_included', '総額表示', ln, 0.7, { basis: 'チラシの「総額表示」という表記です（原文のまま）' });
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
  if (closed) {
    const cl = sectionLines('closed_days')[0];
    if (cls.type === 'exhibition') setF(ev.schedule, 'closed_days', closed, cl, 0.8);
    else review('休館日', cl, '施設（窓口）の休館日と思われるため、公演の情報には入れていません。必要なら取扱先の注記などに入力してください。', { blocking: false });
  }
  const openH = sectionText('open_hours');
  if (openH) setF(ev.schedule, 'open_hours', openH, sectionLines('open_hours')[0], 0.8);

  // 上演時間・休憩
  for (const ln of lines) {
    const t = ln.norm;
    const du = t.match(/((?:上演|公演|所要|演奏)時間\s*[:：]?\s*約?\s*\d+\s*(?:分|時間(?:\s*\d+\s*分)?)[^\n、。]*|約\s*\d+\s*(?:分|時間(?:\s*\d+\s*分)?)(?:\s*[(（][^)）]*[)）])?)/);
    // 「約10分」だけでは上演時間と決めない（交通案内「横浜⇒戸塚 約10分」などを除く）
    const aboutShow = /(上演|公演|所要|演奏)時間/.test(t) || /(上演|公演|休憩|終演)/.test(t);
    const isAccess = /(⇒|→|駅|線|徒歩|バス|車で|快速|分ほど)/.test(t);
    if (du && !ev.schedule.duration.value && aboutShow && !isAccess) setF(ev.schedule, 'duration', du[1].trim(), ln, 0.7, { basis: '「上演」「公演」などの語と同じ行の時間です' });
    const ic = t.match(/(休憩\s*(?:あり|なし|有|無)?\s*(?:[(（]?\s*約?\s*\d+\s*分\s*[)）]?)?)/);
    if (ic) setF(ev.schedule, 'intermission', ic[1].trim(), ln, 0.7);
  }

  // ---- チケット取扱（取扱先の名前の行と、続く ●・TEL・URL・※ の行をひとまとまりとして読む） ----
  const PROVIDER_NAME = /(チケットぴあ|ローソンチケット|イープラス|e\+|カンフェティ|チケットセンター|チケットボックス|オンライン窓口|窓口$|プレイガイド$|チケット$)/;
  const channels = [];
  const channelLine = new Set();
  let curCh = null;
  let curChAt = -99;
  const chB = (b) => ({ basis: b });
  const appendF = (f, text, ln, basis) => {
    if (!text) return f;
    if (f.value) { f.value = `${f.value}\n${text}`; return f; }
    return field(text, src(ln, 0.6, { basis }));
  };
  const isChannelName = (ln, t) => {
    if (!t || /^[※*●■・]/.test(t) || /^(TEL|Tel|電話|FAX|http)/.test(t) || findDates(t).length || /(発売|引換|主催|問い?合|申込|応募)/.test(t)) return false;
    if (ln.label && ln.label.key !== 'tickets') return false;
    const nameOnly = t.replace(/\s[●$•]\s*\S*取扱い?$/, '').replace(/●.*$/, '').replace(URL_RE, '').replace(PHONE_RE, '').replace(/要?\s*[PL]\s*コード.*$/, '').replace(/(TEL|Tel|電話)\s*[:：]?/g, '').replace(/[(（][^)）]*[)）]/g, '').trim();
    if (!/[A-Za-z一-龥ぁ-んァ-ヶ]/.test(nameOnly) || nameOnly.length > 30 || /[。]/.test(nameOnly)) return false;
    return (ln.section === 'tickets' && !ln.label) || (ln.label?.key === 'tickets' && !!ln.label.rest) || PROVIDER_NAME.test(nameOnly);
  };
  lines.forEach((ln, i) => {
    const t = ln.label?.key === 'tickets' ? ln.label.rest : ln.norm;
    for (const c of t.matchAll(/([PL])\s*コード\s*[:：]?\s*([\d-]+)/g)) {
      const code = `${c[1]}コード ${c[2]}`;
      if (!ev.tickets.ticket_codes.items.some((x) => x.code.value === code)) {
        ev.tickets.ticket_codes.items.push({ id: `k${ev.tickets.ticket_codes.items.length + 1}`, provider: field(c[1] === 'P' ? 'チケットぴあ' : 'ローソンチケット', src(ln, 0.8, chB('「Pコード」はチケットぴあ、「Lコード」はローソンチケットのコードです'))), code: field(code, src(ln, 0.85, chB('「Pコード」「Lコード」の後の番号です'))) });
      }
    }
    if (ln.facility || ln.blankBefore || (ln.label && ln.label.key !== 'tickets' && ln.label.key !== 'closed_days')) curCh = null;
    if (isChannelName(ln, t)) {
      // 「●全券種取扱い」の●がOCRで「$」などになった場合も、名前と分ける（文字は直さない）
      const detail = t.match(/●\s*(.+)$/)?.[1] ?? t.match(/\s[$•]\s*(\S*取扱い?)$/)?.[1] ?? null;
      const ph = [...t.matchAll(PHONE_RE)][0];
      const url = t.match(URL_RE)?.[0];
      const name = t.replace(/\s[●$•]\s*\S*取扱い?$/, '').replace(/●.*$/, '').replace(URL_RE, '').replace(PHONE_RE, '').replace(/要?\s*[PL]\s*コード.*$/, '').replace(/(TEL|Tel|電話)\s*[:：]?/g, '').replace(/[(（][^)）]*[)）]\s*$/, '').replace(/[:：\s]+$/, '').trim();
      curCh = {
        id: `t${channels.length + 1}`,
        name: field(name, src(ln, 0.7, chB(ln.section === 'tickets' ? '「チケット取扱い」の見出しの後の行です' : 'チケットの取扱先の名前（「チケット」「窓口」など）の行です'))),
        detail: detail ? field(detail, src(ln, 0.7, chB('取扱先の名前の後の「●」の文字です'))) : field(null),
        phone: ph ? field(`${ph[1]}-${ph[2]}-${ph[3]}`, src(ln, 0.85, chB('取扱先の行の電話番号です'))) : field(null),
        url: url ? field(url, src(ln, 0.85, chB('取扱先の行のURLです'))) : field(null),
        hours: field(null),
        notes: field(null),
      };
      const hr = t.match(/[(（]([^)）]*(?:\d{1,2}:\d{2}|\d{1,2}時)[^)）]*)[)）]/);
      if (hr) curCh.hours = field(tidy(hr[1]), src(ln, 0.7, chB('取扱先の電話番号の後の（）内の時間です')));
      channels.push(curCh);
      curChAt = i;
      channelLine.add(ln.idx);
      return;
    }
    if (!curCh || i - curChAt > 10) { curCh = null; return; }
    // 取扱先に続く行
    if (ln.label?.key === 'closed_days') {
      curCh.notes = appendF(curCh.notes, `休館日：${ln.label.rest}`, ln, '取扱先の行の後にある休館日です');
      channelLine.add(ln.idx);
      return;
    }
    const ph = [...t.matchAll(PHONE_RE)][0];
    const url = t.match(URL_RE)?.[0];
    // 「●一般・学生券のみ取扱い」（OCR では●が別の文字になることがある。文字は直さずそのまま入れる）
    if (/^●/.test(t) || (/(取扱い?|取り扱い)$/.test(t) && t.length <= 25 && !ph && !url)) {
      const d = t.replace(/^●\s*/, '');
      curCh.detail = curCh.detail.value ? (curCh.detail.value = `${curCh.detail.value}／${d}`, curCh.detail) : field(d, src(ln, 0.7, chB('取扱先の名前の後の「●」の行です')));
    } else if (ph && /^(TEL|Tel|電話)/.test(t)) {
      if (!curCh.phone.value) curCh.phone = field(`${ph[1]}-${ph[2]}-${ph[3]}`, src(ln, 0.85, chB('取扱先の名前の後の「TEL」の行です')));
      const hr = t.match(/[(（]([^)）]*(?:\d{1,2}:\d{2}|\d{1,2}時)[^)）]*)[)）]/);
      if (hr && !curCh.hours.value) curCh.hours = field(tidy(hr[1]), src(ln, 0.7, chB('電話番号の後の（）内の時間です')));
    } else if (url && t.startsWith('http')) {
      if (!curCh.url.value) curCh.url = field(url, src(ln, 0.85, chB('取扱先の名前の後のURLの行です')));
      const rest = t.replace(URL_RE, '').replace(/^[\s(（]+|[\s)）]+$/g, '').trim();
      if (rest) curCh.notes = appendF(curCh.notes, `URL：${rest}`, ln, 'URLの後の補足です');
    } else if (/^[※*]/.test(t) || /。/.test(t)) {
      for (const sent of splitSentences(t)) curCh.notes = appendF(curCh.notes, sent, ln, '取扱先の名前の後にある注記です（この取扱先だけの条件）');
    } else { curCh = null; return; }
    channelLine.add(ln.idx);
  });
  channelLine.forEach((i) => consumed.add(i));
  ev.tickets.ticket_channels.items = channels;
  // 手数料：取扱先の注記に含まれていないものだけを全体の手数料にする
  for (const ln of lines) {
    if (channelLine.has(ln.idx) || !/手数料/.test(ln.norm)) continue;
    const sent = splitSentences(ln.norm).find((x) => /手数料/.test(x));
    if (sent) setF(ev.tickets, 'fees', sent, ln, 0.6, { basis: '「手数料」を含む文です' });
  }

  // アクセシビリティ
  const A11Y = [
    ['wheelchair', /(車いす|車椅子)/], ['accessible_toilet', /(多目的トイレ|バリアフリートイレ|だれでもトイレ)/],
    ['stroller', /(ベビーカー)/], ['childcare', /(託児)/], ['hearing_support', /(ヒアリングループ|磁気ループ|補聴|手話|字幕|要約筆記)/],
    ['age_accessibility', /(途中入退場|途中入場|泣いても|声を出しても)/],
  ];
  const RESTRICT = /(取扱い?は?ございません|取り扱いはございません|取扱いません|取り扱いません|お取扱いできません|扱いはありません|購入できません|ご利用いただけません|販売しておりません)/;
  const GUIDE = /(お求め|お申し出|お知らせ|ご相談|ご連絡|ご用意|ございます|あります|ご利用いただけます|ご案内|ご来場|スペース|席)/;
  for (const ln of lines) {
    for (const sent of splitSentences(ln.norm)) {
      for (const [key, re] of A11Y) {
        if (!re.test(sent)) continue;
        if (key === 'wheelchair') {
          if (channelLine.has(ln.idx)) continue; // 取扱先の注記（販売窓口の取扱制限）として保存済み
          if (RESTRICT.test(sent)) {
            review('車椅子に関する記載', ln, '販売窓口の取扱制限の可能性がある文です。会場の設備・案内として載せるか、取扱先の注記に入れるかを判断してください。', { text: sent });
            continue;
          }
          if (!GUIDE.test(sent)) {
            review('車椅子に関する記載', ln, '会場の設備・案内か、販売窓口の取扱制限かを自動で判断できませんでした。', { text: sent });
            continue;
          }
          setF(ev.accessibility, key, sent, ln, 0.7, { basis: '「車椅子（車いす）」を含み、案内（お知らせ・ご相談・席など）の書き方をしている文です' });
        } else {
          setF(ev.accessibility, key, sent, ln, 0.7, { basis: 'この語を含む文です' });
        }
        consumed.add(ln.idx);
      }
    }
  }

  // 注意事項（※で始まる行。曲目欄のものはプログラム注記へ）
  const noteLines = lines.filter((l) => /^[※*]/.test(l.norm) && l.section !== 'program' && !consumed.has(l.idx) && !/(膝上|ひざ上|手数料)/.test(l.norm));
  const notesSec = sectionLines('notes').map((l) => l.content).filter(Boolean);
  const notes = [...notesSec, ...noteLines.map((l) => l.norm.replace(/^[※*]\s*/, ''))];
  if (notes.length) ev.notes = field([...new Set(notes)].join('\n'), src(noteLines[0] ?? sectionLines('notes')[0], 0.7));


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
    if (ln.method === 'ocr' || ln.method === 'mixed') addReason(item.name, '人名はOCRで誤読しやすい文字です。推測で直さず、チラシの表記どおりか1文字ずつ確認してください');
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
  // 見出し「出演」がない書き方①：「渋 谷 慶 一 郎 Piano ＋ 菊 地 成 孔 Saxophone」
  const collapse = (name) => (/^(\S\s)+\S$/.test(name) ? { name: name.replace(/\s/g, ''), spaced: true } : { name, spaced: false });
  for (const ln of lines) {
    if (ln.label || ln.section === 'performers' || consumed.has(ln.idx)) continue;
    const chunks = ln.norm.split(/\s*\+\s*/);
    if (chunks.length < 1) continue;
    const parsed = chunks.map((c) => c.trim().match(EN_INSTR_RE));
    if (!parsed.every((m) => m && JP_NAME_RE.test(m[1].trim()) && m[1].replace(/\s/g, '').length <= 12)) continue;
    for (const m of parsed) {
      const { name, spaced } = collapse(m[1].trim());
      const p = addPerformer({ name, instrument: m[2] }, ln, 0.6);
      if (!p) continue;
      p.name.basis = '見出し「出演」はありませんが、「名前 楽器（英語）」を「＋」でつないだ行から取り出しました';
      addReason(p.name, '見出しのない行から取り出したため、出演者で間違いないか確認してください');
      if (spaced) addReason(p.name, `字間の空白を詰めました（原文：${m[1].trim()}）`);
      if (p.instrument.value) p.instrument.basis = '名前の後の英語の楽器名です（原文のまま）';
    }
    consumed.add(ln.idx);
  }
  // 書き方②：プロフィールの見出し「渋谷慶一郎（ピアノ）」→「KEIICHIRO SHIBUYA」→ 本文
  const nameKey0 = (x) => String(x).replace(/\s/g, '');
  lines.forEach((ln, i) => {
    if (ln.label || consumed.has(ln.idx)) return;
    const h = ln.norm.match(/^([一-龥々ぁ-んァ-ヶー・]{1,8}(?:\s[一-龥々ぁ-んァ-ヶー・]{1,8})?)\s*[(（]([^)）}\]]+)[)）}\]]$/);
    // （）内が楽器・役割の語か、次の行が大文字の欧文名なら、プロフィールの見出しとみなす
    const romanNext = lines[i + 1] && /^[A-Z][A-Z .'’-]+$/.test(lines[i + 1].norm);
    if (!h || (!isInstrumentOrRole(h[2]) && !romanNext)) return;
    const heading = h[1].trim();
    let p = performers.find((x) => nameKey0(x.name.value) === nameKey0(heading));
    if (!p) {
      const known = isInstrumentOrRole(h[2]);
      p = addPerformer({ name: heading, instrument: INSTRUMENTS.includes(h[2]) || !known ? h[2] : null, role: ROLES.includes(h[2]) ? h[2] : null }, ln, 0.6);
      if (!p) return;
      p.name.basis = 'プロフィールの見出し「名前（楽器）」から取り出しました';
      if (!known && p.instrument.value) addReason(p.instrument, `（）内「${h[2]}」は登録済みの楽器・役割の語ではありません（OCRの読み誤りの可能性）。チラシで確認してください`);
    } else {
      if (p.name.value !== heading) addReason(p.name, `チラシ内で名前の表記が異なります（「${p.name.value}」と「${heading}」）`);
      if (INSTRUMENTS.includes(h[2]) && p.instrument.value !== h[2]) {
        const before = p.instrument.value;
        p.instrument = field(h[2], src(ln, 0.7, { basis: 'プロフィールの見出し「名前（楽器）」の（）内です' }));
        if (before) addReason(p.instrument, `チラシ内で楽器の表記が2通りあります（「${before}」と「${h[2]}」）。表示する表記を確認してください`);
      }
    }
    consumed.add(ln.idx);
    let j = i + 1;
    if (lines[j] && /^[A-Z][A-Z .'’-]+$/.test(lines[j].norm) && !lines[j].label) {
      if (!p.roman_name.value) p.roman_name = field(lines[j].norm, src(lines[j], 0.7, { basis: 'プロフィールの見出しの次の行の欧文（大文字）です' }));
      consumed.add(lines[j].idx);
      j += 1;
    }
    const body = [];
    for (; j < lines.length; j++) {
      const b = lines[j];
      if (b.label || b.facility || (b.blankBefore && body.length) || consumed.has(b.idx)) break;
      if (/^[一-龥々ぁ-んァ-ヶー・]{1,8}(?:\s[一-龥々ぁ-んァ-ヶー・]{1,8})?\s*[(（][^)）}\]]+[)）}\]]$/.test(b.norm)) break;
      if (b.bbox) {
        // 位置情報がある場合は、同じ段で行が続く間を本文とする（OCR は段の幅で改行されるため）
        const prevB = body.at(-1) ?? lines[j - 1];
        if (prevB?.bbox && (Math.abs(b.bbox.x0 - prevB.bbox.x0) > 0.05 || b.bbox.y0 - prevB.bbox.y1 > (prevB.bbox.y1 - prevB.bbox.y0) * 1.6)) break;
      } else if (!/。/.test(b.norm) && b.norm.length < 30) break;
      body.push(b);
    }
    if (body.length && !p.profile.value) {
      p.profile = field(body.map((b) => b.norm).join('\n'), src(body[0], 0.6, { basis: `見出し「${heading}（${h[2]}）」の後に続く文章です`, reasons: ['プロフィールの範囲を自動で判定しています。前後の文が混ざっていないか確認してください'] }));
      body.forEach((b) => consumed.add(b.idx));
    }
  });

  // プロフィール
  const profLines = lines.filter((l) => l.section === 'profile' && !l.label);
  const nameKey = (s) => s.replace(/\s/g, '');
  let cur = null;
  const profiles = new Map();
  const startsWithName = (t) => performers.find((p) => nameKey(t).startsWith(nameKey(p.name.value)));
  const candidates = profLines.length ? profLines : lines.filter((l) => l.section !== 'performers' && !consumed.has(l.idx));
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
    if (text && !p.profile.value) p.profile = field(text, src(ln, 0.6, { basis: 'プロフィール欄、または出演者名で始まる文章です', reasons: ['プロフィールの範囲を自動で判定しています。前後の文が混ざっていないか確認してください'] }));
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
    if (ln.method === 'ocr' || ln.method === 'mixed') {
      addReason(item.work, '曲名・作品名はOCRで誤読しやすい文字です。推測で直さず、チラシの表記どおりか確認してください');
      if (item.composer.value) addReason(item.composer, '作曲者名はOCRで誤読しやすい文字です。チラシの表記どおりか確認してください');
    }
    works.push(item);
  }
  ev.program.works.items = works;
  if (programNotes.length) ev.program.notes = field(programNotes.join('\n'), src(sectionLines('program')[0], 0.7));

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
    if (titleLn) {
      ev.basic.title = field(titleLn.norm, src(titleLn, 0.45, { basis: '文字の大きさの情報がないため、最初の行をタイトルの候補にしました', reasons: ['タイトルかどうか、チラシで確認してください'] }));
      // タイトルの次の行が短い欧文（例：出演者の欧文名）ならサブタイトルの候補にする
      const nx = lines[titleLn.idx + 1];
      if (nx && !isDataLine(nx) && !consumed.has(nx.idx) && /^[A-Za-z][A-Za-z0-9 .,'’&+\-]{2,60}$/.test(nx.norm) && !EN_INSTR_RE.test(nx.norm)) {
        ev.basic.subtitle = field(nx.norm, src(nx, 0.4, { basis: 'タイトルの次の行にある欧文です', reasons: ['サブタイトルとして載せてよいか確認してください'] }));
      }
    }
  }
  const descLines = lines.filter((l) => (!l.section || l.section === 'description') && /。/.test(l.norm) && !/^[※*]/.test(l.norm)
    && !startsWithName(l.norm) && !consumed.has(l.idx) && !promo.has(l.idx));
  if (descLines.length) ev.basic.description = field(descLines.map((l) => l.norm).join('\n'), src(descLines[0], 0.5, { basis: 'どの見出しにも属さない文章です（チラシの文章をそのまま入れています）', reasons: ['紹介文として載せる範囲か確認してください'] }));

  // ジャンル：タイトル・サブタイトル・紹介文に書かれている場合だけ（標語や共催事業名からは取らない）
  const GENRES = ['クラシック', 'ジャズ', '落語', '演劇', 'ダンス', 'バレエ', '邦楽', '吹奏楽', '合唱', 'ポップス', 'ミュージカル', 'オペラ', '人形劇', '映画'];
  const genreSrc = [ev.basic.title, ev.basic.subtitle, ev.basic.description].filter((f) => f?.value);
  for (const g of GENRES) {
    const f = genreSrc.find((x) => String(x.value).includes(g));
    if (f) { ev.genre = field(g, { file: f.source_file, page: f.source_page, text: f.source_text, confidence: 0.6, origin: 'extracted', basis: 'タイトル・紹介文にあるジャンルの語です' }); break; }
  }

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
  return { event: ev, log, warnings: [...new Set(warnings)], suggestions, lines, classification: cls };
}

export function makeEventId(ev) {
  const d = ev.schedule.dates.items[0]?.date?.value ?? ev.schedule.start_date?.value ?? 'undated';
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${d}-${rnd}`;
}
