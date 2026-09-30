// 画像代替テキストの生成（SNS_RULES.md 5章）。
// 画像の見た目（色・服装・表情など）は自動で書かない。event.json にある事実だけで作る。
import { str, has, performerLabel } from './util.js';
import { formatDateJa } from '../core/dates.js';
import { eventType } from '../core/schema.js';

function dateSummary(ev) {
  const items = ev.schedule.dates.items.filter((d) => has(d.date));
  const s = str(ev.schedule.start_date);
  const e = str(ev.schedule.end_date);
  if (!items.length && s) return e && e !== s ? `${formatDateJa(s)}から${formatDateJa(e)}まで` : formatDateJa(s);
  const uniq = [...new Set(items.map((d) => str(d.date)))];
  if (!uniq.length) return '';
  if (uniq.length === 1) return formatDateJa(uniq[0], { year: true });
  return `${formatDateJa(uniq[0], { year: true })}ほか全${uniq.length}日`;
}

function venueText(ev) {
  const v = str(ev.venue.venue);
  const r = str(ev.venue.room);
  return r && !v.includes(r) ? `${v} ${r}` : v;
}

export function flyerAlt(ev, side = 'front') {
  const title = str(ev.basic.title) || '（タイトル要確認）';
  const sideText = side === 'back' ? '裏面' : side === 'front' ? '表面' : '';
  const parts = [`「${title}」のチラシ${sideText}`];
  if (side !== 'back') {
    const d = dateSummary(ev);
    const v = venueText(ev);
    if (d || v) parts.push([d, v].filter(Boolean).join('、'));
  }
  parts.push('内容は本文に記載しています');
  return `${parts.join('。')}。`;
}

export function performerPhotoAlt(p) {
  if (has(p.photo_alt)) return str(p.photo_alt);
  const label = performerLabel(p);
  return `${str(p.name)}${label ? `（${label}）` : ''}の写真`;
}

export function instagramAlt(ev) {
  const t = str(ev.basic.title);
  const d = dateSummary(ev);
  const kind = { performance: '公演', family_performance: '公演', workshop: 'ワークショップ', lecture: '講座', exhibition: '展示', recruitment: '募集', multi_event: 'イベント' }[eventType(ev)];
  let s = `${kind}「${t}」の告知画像。${d ? `${d}、` : ''}${venueText(ev)}。`;
  if (s.length > 100) s = `${kind}「${t}」の告知画像。${d}。`;
  return s;
}

/** 生成できる代替テキストの一覧（出力パネル用） */
export function allAlts(ev) {
  const out = [];
  if (has(ev.media.flyer_front) || has(ev.media.flyer)) out.push({ target: 'チラシ表面', alt: flyerAlt(ev, 'front') });
  if (has(ev.media.flyer_back)) out.push({ target: 'チラシ裏面', alt: flyerAlt(ev, 'back') });
  if (!out.length) out.push({ target: 'チラシ（画像を掲載する場合）', alt: flyerAlt(ev, 'front') });
  ev.media.images.items.forEach((im, i) => {
    out.push({ target: `画像${i + 1}（${str(im.src) || 'ファイル未指定'}）`, alt: str(im.alt) || '代替テキストが未入力です（画像の内容を確認して入力してください）' });
  });
  ev.performers.items.forEach((p) => {
    if (has(p.photo)) out.push({ target: `${str(p.name)}の写真`, alt: performerPhotoAlt(p) });
  });
  out.push({ target: 'Instagram投稿画像', alt: instagramAlt(ev) });
  return out;
}
