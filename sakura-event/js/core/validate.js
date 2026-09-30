// 曜日照合・形式チェック・確定ゲート（必須確認項目）。
import { has, str, val, isField, reviewState } from './field.js';
import { weekdayOf, normalizeWeekday, isIsoDate, isTime, formatDateJa } from './dates.js';
import { eventType, TYPE_SETS, GROUPS, pathOf, isVisibleFor } from './schema.js';

const WD_FULL = { 日: '日曜日', 月: '月曜日', 火: '火曜日', 水: '水曜日', 木: '木曜日', 金: '金曜日', 土: '土曜日' };

/** 日程1件の曜日照合 */
export function weekdayCheck(item) {
  const date = str(item?.date);
  const flyerRaw = str(item?.weekday_on_flyer);
  if (!date) return { status: 'no_date', computed: null, flyer: null, message: '', suggestion: '' };
  if (!isIsoDate(date)) {
    return {
      status: 'invalid_date', computed: null, flyer: null,
      message: `エラー：開催日「${date}」を日付として読み取れません`,
      suggestion: '「2026-07-04」の形で入力してください。',
    };
  }
  const computed = weekdayOf(date);
  if (!flyerRaw) {
    return {
      status: 'no_flyer_weekday', computed, flyer: null,
      message: `チラシに曜日の表記が見つかりません（日付から計算：${computed}）`,
      suggestion: `チラシに曜日が書かれていない場合は、空欄のまま「確認済み」にしてください。HPには計算した曜日（${computed}）を表示します。`,
    };
  }
  const flyer = normalizeWeekday(flyerRaw);
  if (!flyer) {
    return {
      status: 'invalid_weekday', computed, flyer: flyerRaw,
      message: `エラー：曜日「${flyerRaw}」を読み取れません`,
      suggestion: '「土」のように曜日を1文字で入力してください。',
    };
  }
  if (flyer !== computed) {
    return {
      status: 'mismatch', computed, flyer,
      message: `エラー：曜日が一致しません（チラシ：${flyer}／日付から計算：${computed}）`,
      suggestion: `${formatDateJa(date, { year: true }).replace(/（.）$/, '')}は${WD_FULL[computed]}です。チラシの日付と曜日のどちらが正しいか確認し、どちらかを修正してください。チラシ自体の誤りの場合は主催者に確認してください。`,
    };
  }
  return { status: 'ok', computed, flyer, message: `曜日は一致しています（${computed}）`, suggestion: '' };
}

const PHONE_RE = /^0\d{1,4}-\d{1,4}-\d{3,4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isSafeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** event.json 内の各項目を型定義に従って形式チェックする */
export function formatIssues(ev) {
  const issues = [];
  const type = eventType(ev);
  const check = (def, f, path, label) => {
    if (!isField(f) || !has(f)) return;
    const v = val(f);
    const s = String(v).trim();
    const push = (message, suggestion) => issues.push({ path, label, message, suggestion });
    switch (def.type) {
      case 'date':
        if (!isIsoDate(s)) push(`エラー：${label}「${s}」は日付の形式ではありません`, '「2026-07-04」の形で入力してください。');
        break;
      case 'time':
        if (!isTime(s)) push(`エラー：${label}「${s}」は時刻の形式ではありません`, '「14:00」の形（24時間表記）で入力してください。');
        break;
      case 'tel':
        if (!PHONE_RE.test(s)) push(`エラー：${label}「${s}」は電話番号の形式ではありません`, '市外局番からハイフン区切りで入力してください（例：045-000-0000）。');
        break;
      case 'email':
        if (!EMAIL_RE.test(s)) push(`エラー：${label}「${s}」はメールアドレスの形式ではありません`, '「name@example.jp」の形で入力してください。');
        break;
      case 'url':
        if (!isSafeUrl(s)) push(`エラー：${label}「${s}」はURLの形式ではありません`, '「https://」から始まるURLを入力してください。');
        break;
      case 'number':
        if (!Number.isFinite(Number(s))) push(`エラー：${label}「${s}」は数字ではありません`, '半角数字で入力してください（無料は 0）。カンマや「円」は不要です。');
        break;
      default:
    }
  };
  for (const g of GROUPS) {
    for (const def of g.fields) {
      const p = pathOf(g, def);
      const target = p.split('.').reduce((o, k) => o?.[k], ev);
      if (def.kind === 'list') {
        (target?.items ?? []).forEach((item, i) => {
          for (const d of def.fields) check(d, item[d.key], `${p}.items.${i}.${d.key}`, `${def.label}${i + 1}の${d.label}`);
        });
      } else {
        check(def, target, p, def.label);
      }
    }
  }
  // 時刻の前後関係
  (ev.schedule?.dates?.items ?? []).forEach((d, i) => {
    const open = str(d.doors_open);
    const start = str(d.start_time);
    const end = str(d.end_time);
    if (isTime(open) && isTime(start) && open > start) {
      issues.push({
        path: `schedule.dates.items.${i}.doors_open`, label: `日程${i + 1}の開場`,
        message: `エラー：開場（${open}）が開演（${start}）より後になっています`,
        suggestion: '開場と開演が入れ替わっていないか確認してください。',
      });
    }
    if (isTime(start) && isTime(end) && start >= end) {
      issues.push({
        path: `schedule.dates.items.${i}.end_time`, label: `日程${i + 1}の終演`,
        message: `エラー：終演（${end}）が開演（${start}）より前になっています`,
        suggestion: '終演・終了の時刻を確認してください。',
      });
    }
  });
  if (TYPE_SETS.PART.includes(type)) {
    const a = str(ev.participation?.application_start);
    const b = str(ev.participation?.application_deadline);
    if (isIsoDate(a) && isIsoDate(b) && a > b) {
      issues.push({
        path: 'participation.application_deadline', label: '申込締切日',
        message: `エラー：申込締切日（${b}）が申込開始日（${a}）より前です`,
        suggestion: '申込期間を確認してください。',
      });
    }
  }
  return issues;
}

// ---- 確定ゲート -------------------------------------------------------

function fieldCheck(f, { allowEmpty = true } = {}) {
  const st = reviewState(f);
  if (st === 'confirmed') return true;
  if (st === 'confirmed_empty') return allowEmpty;
  return false;
}

function stateText(f, allowEmpty = true) {
  const st = reviewState(f);
  if (st === 'confirmed_empty' && !allowEmpty) return '値が空のまま確認済みになっています';
  return { confirmed: '確認済み', confirmed_empty: '確認済み（該当なし）', needs_review: '要確認', missing: '情報なし' }[st];
}

/**
 * 必須確認項目のチェック一覧を返す。
 * 各要素 { id, label, path, ok, na, message, suggestion }
 */
export function gateChecks(ev) {
  const type = eventType(ev);
  const out = [];
  const add = (id, label, path, ok, message, suggestion = '', na = false) =>
    out.push({ id, label, path, ok, na, message, suggestion });
  const needConfirm = '内容をチラシと照らし合わせ、「確認済みにする」を押してください。';

  // タイトル
  add('title', 'タイトル', 'basic.title', fieldCheck(ev.basic.title, { allowEmpty: false }),
    stateText(ev.basic.title, false), has(ev.basic.title) ? needConfirm : 'タイトルを入力してください。');

  // 開催日・曜日・開場・開演
  const dates = ev.schedule.dates;
  const periodTypes = ['exhibition', 'recruitment', 'multi_event'];
  if (dates.items.length === 0) {
    const periodOk = periodTypes.includes(type) && fieldCheck(ev.schedule.start_date, { allowEmpty: false });
    add('date', '開催日', 'schedule.dates', periodOk,
      periodOk ? '期間で確認済み' : '開催日が登録されていません',
      periodOk ? '' : '「日程を追加」から開催日を入力してください。');
    add('weekday', '曜日', 'schedule.dates', periodOk, periodOk ? '期間で確認済み' : '開催日がないため照合できません', '', periodOk);
    add('doors_open', '開場', 'schedule.dates', true, '該当なし', '', true);
    add('start_time', '開演', 'schedule.dates', periodOk, periodOk ? '期間で確認済み' : '開催日がないため確認できません', '', periodOk);
  } else {
    const doorsVisible = isVisibleFor({ types: [...TYPE_SETS.PERF, 'lecture', 'multi_event'] }, type);
    dates.items.forEach((d, i) => {
      const n = dates.items.length > 1 ? `（${i + 1}件目）` : '';
      const base = `schedule.dates.items.${i}`;
      add(`date${i}`, `開催日${n}`, `${base}.date`, fieldCheck(d.date, { allowEmpty: false }) && isIsoDate(str(d.date)),
        has(d.date) && !isIsoDate(str(d.date)) ? `エラー：「${str(d.date)}」は日付の形式ではありません` : stateText(d.date, false),
        has(d.date) ? needConfirm : '開催日を入力してください。');
      const wc = weekdayCheck(d);
      const wdConfirmed = fieldCheck(d.weekday_on_flyer);
      const wdOk = wdConfirmed && (wc.status === 'ok' || wc.status === 'no_flyer_weekday');
      add(`weekday${i}`, `曜日${n}`, `${base}.weekday_on_flyer`, wdOk,
        ['mismatch', 'invalid_weekday', 'invalid_date'].includes(wc.status) ? wc.message : stateText(d.weekday_on_flyer),
        wc.suggestion || needConfirm);
      if (doorsVisible) {
        add(`doors_open${i}`, `開場${n}`, `${base}.doors_open`, fieldCheck(d.doors_open), stateText(d.doors_open),
          has(d.doors_open) ? needConfirm : 'チラシに開場時刻がない場合は、空欄のまま「確認済み」にしてください。');
      } else {
        add(`doors_open${i}`, `開場${n}`, `${base}.doors_open`, true, `該当なし（種別：${typeLabel(type)}）`, '', true);
      }
      add(`start_time${i}`, `開演・開始${n}`, `${base}.start_time`, fieldCheck(d.start_time), stateText(d.start_time),
        has(d.start_time) ? needConfirm : '開始時刻がない場合（展示など）は、空欄のまま「確認済み」にしてください。');
    });
  }

  // 会場
  add('venue', '会場', 'venue.venue', fieldCheck(ev.venue.venue, { allowEmpty: false }), stateText(ev.venue.venue, false),
    has(ev.venue.venue) ? needConfirm : '会場を入力してください。');

  // 出演者
  if (isVisibleFor({ types: GROUPS.find((g) => g.id === 'performers').types }, type)) {
    const ps = ev.performers;
    if (ps.none_confirmed) {
      add('performers', '出演者', 'performers', true, '確認済み（該当なし）');
    } else if (ps.items.length === 0) {
      add('performers', '出演者', 'performers', false, '情報なし',
        '出演者を追加するか、出演者がいない場合は「該当なしとして確認」を押してください。');
    } else {
      const bad = ps.items.filter((p) => !fieldCheck(p.name, { allowEmpty: false }));
      add('performers', '出演者', 'performers', bad.length === 0,
        bad.length ? `未確認の出演者が${bad.length}名います` : `確認済み（${ps.items.length}名）`,
        bad.length ? '各出演者の名前を確認し、「確認済みにする」を押してください。' : '');
    }
  } else {
    add('performers', '出演者', 'performers', true, `該当なし（種別：${typeLabel(type)}）`, '', true);
  }

  // 料金
  const pr = ev.pricing.prices;
  if (pr.none_confirmed) {
    add('prices', '料金', 'pricing.prices', true, '確認済み（該当なし）');
  } else if (pr.items.length === 0) {
    add('prices', '料金', 'pricing.prices', false, '情報なし', '料金を追加してください。無料の場合は金額に 0 を入力してください。');
  } else {
    const bad = pr.items.filter((it) => {
      const filled = ['category', 'amount', 'label'].filter((k) => has(it[k]));
      if (!has(it.amount) && !has(it.label)) return true;
      return filled.some((k) => !it[k].confirmed);
    });
    add('prices', '料金', 'pricing.prices', bad.length === 0,
      bad.length ? `未確認の料金が${bad.length}件あります` : `確認済み（${pr.items.length}件）`,
      bad.length ? '区分・金額をチラシと照合し、それぞれ「確認済みにする」を押してください。' : '');
  }

  // 年齢制限
  add('age', '年齢制限', 'pricing.age_requirement', fieldCheck(ev.pricing.age_requirement), stateText(ev.pricing.age_requirement),
    has(ev.pricing.age_requirement) ? needConfirm : 'チラシに年齢の記載がない場合は、空欄のまま「確認済み」にしてください（HPには表示しません）。');

  // チケット発売・申込
  if (TYPE_SETS.TICKETED.includes(type)) {
    const sched = ev.tickets.sales_schedule?.items ?? [];
    const badSched = sched.filter((it) => ['method', 'date', 'time', 'note'].some((k) => has(it[k]) && !it[k].confirmed) || !has(it.method) || !has(it.date));
    const salesOk = fieldCheck(ev.tickets.sales_start) && badSched.length === 0;
    add('sales', 'チケット発売情報', 'tickets.sales_start', salesOk,
      badSched.length ? `販売方法ごとの発売日時に未確認のものが${badSched.length}件あります（一般発売日：${stateText(ev.tickets.sales_start)}）` : stateText(ev.tickets.sales_start),
      has(ev.tickets.sales_start) || sched.length ? '販売方法・発売日・発売時刻をチラシと照合し、「確認済みにする」を押してください。' : '発売日がない場合（入場無料・申込不要など）は、空欄のまま「確認済み」にしてください。');
  } else if (TYPE_SETS.PART.includes(type)) {
    const a = ev.participation.application_method;
    const b = ev.participation.application_start;
    add('sales', '申込情報（方法・開始日）', 'participation.application_method', fieldCheck(a) && fieldCheck(b),
      `申込方法：${stateText(a)}／申込開始日：${stateText(b)}`, '申込方法と申込開始日を確認してください。');
  } else {
    add('sales', 'チケット発売情報', 'tickets.sales_start', true, `該当なし（種別：${typeLabel(type)}）`, '', true);
  }

  // 電話番号
  add('phone', '電話番号', 'organization.phone', fieldCheck(ev.organization.phone), stateText(ev.organization.phone),
    has(ev.organization.phone) ? needConfirm : '問い合わせ電話番号を入力してください。記載がない場合は空欄のまま「確認済み」にしてください。');

  // 外部URL
  const urls = collectUrlFields(ev);
  const badUrls = urls.filter((u) => !u.field.confirmed || !isSafeUrl(str(u.field)));
  add('urls', '外部URL', urls[0]?.path ?? 'links', badUrls.length === 0,
    urls.length === 0 ? '外部URLはありません' : badUrls.length ? `未確認または形式が正しくないURLが${badUrls.length}件あります` : `確認済み（${urls.length}件）`,
    badUrls.length ? 'URLを実際に開いて行き先が正しいことを確認し、「確認済みにする」を押してください。' : '', urls.length === 0);

  // 曲目・問い合わせ先（値があれば照合を必須にする。OCR では特に誤読しやすい）
  const works = ev.program?.works?.items ?? [];
  const badWorks = works.filter((w) => ['composer', 'work', 'section', 'notes'].some((k) => has(w[k]) && !w[k].confirmed));
  add('program', '曲目', 'program.works', badWorks.length === 0,
    works.length ? (badWorks.length ? `未確認の曲目が${badWorks.length}件あります` : `確認済み（${works.length}件）`) : '曲目の登録なし',
    badWorks.length ? '作曲者・曲名をチラシの表記どおりか照合し、「確認済みにする」を押してください。' : '', works.length === 0);
  const contact = ev.organization?.contact;
  add('contact', '問い合わせ先', 'organization.contact', !has(contact) || !!contact.confirmed, has(contact) ? stateText(contact) : '記載なし',
    has(contact) && !contact.confirmed ? needConfirm : '', !has(contact));

  // 入力資料（版）の確認。ハッシュは同じファイルかどうかの確認だけに使い、最新版・承認済みかは担当者が確認する
  const srcFiles = (ev.meta?.source_files ?? []).filter((f) => f.sha256);
  if (srcFiles.length) {
    add('source_version', '入力資料の版', 'meta.source_review', !!ev.meta.source_review?.confirmed,
      ev.meta.source_review?.confirmed ? '確認済み' : '未確認',
      '入力した資料（ファイル名・取込日時）が、原稿の基にする版であることを担当者が確認し、「版を確認した」を押してください。システムは最新版かどうか・承認済みかどうかを判定しません。');
  }
  if (ev.meta?.source_mismatch) {
    add('source_mismatch', '入力資料の一致', 'meta.source_review', false,
      '読み込んだファイルが、この event.json の記録（SHA-256）と一致しません',
      '別の資料に差し替えた場合は、解析からやり直してください。前の確認結果・承認状態は引き継ぎません。');
  }

  // 販売・受付状況（チラシからは決めない。担当者が設定する）
  const code = ev.status?.code ?? 'unset';
  add('status', '販売・受付状況', 'status', code !== 'unset',
    code === 'unset' ? '未設定' : '設定済み',
    code === 'unset' ? '窓口・販売システムで現在の販売・受付状況を確認し、「販売・受付状況」を選んでください（チラシからは判断しません）。' : '');

  // 抽出器が判断できず、人の確認を求めた記載
  const pendingReview = (ev.meta?.review_items ?? []).filter((r) => r.blocking && !r.resolved);
  add('review_items', '判断が必要な記載', 'meta.review_items', pendingReview.length === 0,
    pendingReview.length ? `未対応の記載が${pendingReview.length}件あります（${pendingReview.map((r) => r.topic).join('、')}）` : '対応済み',
    pendingReview.length ? '「判断が必要な記載」の原文を確認し、必要な項目に入力してから「対応済みにする」を押してください。' : '',
    (ev.meta?.review_items ?? []).filter((r) => r.blocking).length === 0);

  return out;
}

export function collectUrlFields(ev) {
  const out = [];
  const push = (f, path, label) => { if (isField(f) && has(f)) out.push({ field: f, path, label }); };
  ev.links.items.forEach((l, i) => push(l.url, `links.items.${i}.url`, str(l.label) || `リンク${i + 1}`));
  ev.tickets.ticket_channels.items.forEach((c, i) => push(c.url, `tickets.ticket_channels.items.${i}.url`, str(c.name) || `取扱先${i + 1}`));
  push(ev.participation.application_url, 'participation.application_url', '申込URL');
  push(ev.media.video, 'media.video', '動画URL');
  return out;
}

function typeLabel(t) {
  return { performance: '公演', family_performance: 'ファミリー公演', workshop: 'ワークショップ', lecture: '講座', exhibition: '展示', recruitment: '参加者募集', multi_event: '複合イベント' }[t];
}

/** 確定できるか。blockers にはゲート未通過と形式エラーを含める。 */
export function canFinalize(ev) {
  const gate = gateChecks(ev);
  const fmt = formatIssues(ev);
  const blockers = [
    ...gate.filter((c) => !c.ok).map((c) => ({ label: c.label, path: c.path, message: c.message, suggestion: c.suggestion })),
    ...fmt,
  ];
  return { ok: blockers.length === 0, gate, formatIssues: fmt, blockers };
}

/** 進み具合（確認画面の上部表示用） */
export function gateProgress(ev) {
  const g = gateChecks(ev).filter((c) => !c.na);
  return { done: g.filter((c) => c.ok).length, total: g.length };
}
