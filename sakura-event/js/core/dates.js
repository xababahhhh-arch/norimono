// 日付・曜日・時刻の処理。
export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** ISO日付（YYYY-MM-DD）として正しいか */
export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isTime(s) {
  return typeof s === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(s);
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toIso(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** 日付から曜日（日〜土）を計算。タイムゾーンに依存しないよう UTC で計算する。 */
export function weekdayOf(iso) {
  if (!isIsoDate(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** チラシの曜日表記を「土」のような1文字に正規化。「土・祝」→「土」 */
export function normalizeWeekday(s) {
  if (s == null) return null;
  const t = String(s).normalize('NFKC');
  const m = t.match(/[日月火水木金土]/);
  if (m) return m[0];
  const en = t.toLowerCase().match(/\b(sun|mon|tue|wed|thu|fri|sat)/);
  if (en) return WEEKDAYS[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(en[1])];
  return null;
}

/** "7月4日（土）" */
export function formatDateJa(iso, { year = false } = {}) {
  if (!isIsoDate(iso)) return String(iso ?? '');
  const [y, m, d] = iso.split('-').map(Number);
  return `${year ? `${y}年` : ''}${m}月${d}日（${weekdayOf(iso)}）`;
}

/** "7/4(土)" */
export function formatDateShort(iso) {
  if (!isIsoDate(iso)) return String(iso ?? '');
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}(${weekdayOf(iso)})`;
}

/** time要素の datetime 値（日本時間） */
export function datetimeAttr(iso, time) {
  if (!isIsoDate(iso)) return null;
  if (time && isTime(time)) {
    const [h, mi] = time.split(':');
    return `${iso}T${pad2(h)}:${mi}+09:00`;
  }
  return iso;
}

export function normTime(h, m) {
  return `${pad2(Number(h))}:${pad2(Number(m ?? 0))}`;
}

/** 全角英数・記号を半角に、丸付き曜日を括弧付きに（NFKC）。波ダッシュ等を統一。 */
export function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/[〜～~]/g, '〜')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/　/g, ' ');
}

export function reiwaToYear(n) {
  return 2018 + Number(n);
}

export function todayIso(d = new Date()) {
  // 日本時間の今日
  const t = new Date(d.getTime() + 9 * 3600 * 1000);
  return t.toISOString().slice(0, 10);
}

export function compareIso(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
