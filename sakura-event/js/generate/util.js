// 生成器の共通処理（エスケープ・表示用の整形）。
import { str, has, val, isField } from '../core/field.js';
import { isSafeUrl } from '../core/validate.js';

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** href に使えるURLだけを返す（javascript: 等は空） */
export function safeHref(u) {
  const s = String(u ?? '').trim();
  if (!s) return '';
  if (/^(tel|mailto):/i.test(s)) return s;
  if (isSafeUrl(s)) return s;
  // 相対パス（CMSにアップロードするファイル名）
  if (/^[\w./-]+$/.test(s) && !/^\/\//.test(s) && !/:/.test(s)) return s;
  return '';
}

/** ラテン文字だけの文字列（欧文）か。WCAG 3.1.2 の lang 付与に使う */
export function isLatin(s) {
  const t = String(s ?? '').trim();
  return /[A-Za-z]/.test(t) && /^[A-Za-z0-9À-ɏ\s.,'’&:;!?()\-–—#/"“”]+$/.test(t);
}

/** 欧文なら lang="en" の span で包む（エスケープ済みHTMLを返す） */
export function langWrap(s) {
  return isLatin(s) ? `<span lang="en">${esc(s)}</span>` : esc(s);
}

export function yen(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n);
  if (v === 0) return '無料';
  return `${v.toLocaleString('ja-JP')}円`;
}

export function lines(s) {
  return String(s ?? '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

export function priceText(item) {
  if (has(item.label) && (!has(item.amount) || Number(val(item.amount)) === 0)) return str(item.label);
  if (has(item.amount)) return yen(val(item.amount));
  return str(item.label);
}

export function performerLabel(p) {
  const role = str(p.role);
  const parts = [str(p.instrument), role === '出演' ? '' : role].filter(Boolean);
  return parts.join('・');
}

export { str, has, val, isField };
