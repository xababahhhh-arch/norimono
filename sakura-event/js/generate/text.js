// HP用プレーンテキスト（CMSのテキスト欄・メール配信などに使う）。HTMLと同じ順序・同じ情報。
import { lines, priceText, performerLabel, yen, str, has } from './util.js';
import { formatDateJa, isIsoDate } from '../core/dates.js';
import { eventType, statusLabel, TYPE_SETS, STATUSES, UPDATE_TYPES } from '../core/schema.js';
import { canFinalize } from '../core/validate.js';

export function generateText(ev, opts = {}) {
  const gate = canFinalize(ev);
  const draft = opts.draft ?? !gate.ok;
  const type = eventType(ev);
  const out = [];
  const sec = (title, body) => {
    const b = body.filter((x) => x !== null && x !== undefined && String(x).trim() !== '');
    if (b.length) out.push('', `【${title}】`, ...b);
  };
  const d = (iso) => (isIsoDate(iso) ? formatDateJa(iso, { year: true }) : iso);
  const kv = (label, f, fmt) => (has(f) ? `${label}：${fmt ? fmt(str(f)) : str(f)}` : null);

  if (draft) out.push('※下書き：確認が済んでいない項目があります。このまま公開しないでください。', '');
  out.push(str(ev.basic.title) || 'タイトル：情報なし（要確認）');
  if (has(ev.basic.subtitle)) out.push(str(ev.basic.subtitle));
  out.push('', `販売・受付状況：${ev.status?.code === 'unset' ? '未設定（要確認）' : statusLabel(ev.status)}`);
  for (const dd of ev.schedule.dates.items) {
    if (dd.status && STATUSES[dd.status]) out.push(`・${d(str(dd.date))}${has(dd.start_time) ? ` ${str(dd.start_time)}の回` : ''}：${STATUSES[dd.status].label}`);
  }
  for (const u of ev.updates.items.filter((x) => ['performer_change', 'schedule_change', 'program_change'].includes(x.type))) {
    out.push(`・${d(u.date)}【${UPDATE_TYPES[u.type]}】${u.text}`);
  }

  sec('概要', [str(ev.basic.catchphrase), ...lines(str(ev.basic.description))]);

  if (type !== 'recruitment') {
    sec(['workshop', 'lecture'].includes(type) ? '講師' : '出演', ev.performers.items.filter((p) => has(p.name)).flatMap((p) => {
      const lbl = performerLabel(p);
      return [
        `${str(p.name)}${has(p.reading) ? `（${str(p.reading)}）` : ''}${lbl ? `／${lbl}` : ''}${has(p.roman_name) ? `　${str(p.roman_name)}` : ''}`,
        ...(has(p.profile) ? lines(str(p.profile)).map((x) => `　${x}`) : []),
      ];
    }));
  }

  if (TYPE_SETS.PERF.includes(type) || ['lecture', 'multi_event'].includes(type)) {
    const works = ev.program.works.items.filter((w) => has(w.work) || has(w.composer));
    let cur = null;
    const body = [];
    for (const w of works) {
      if (str(w.section) && str(w.section) !== cur) { cur = str(w.section); body.push(`〈${cur}〉`); }
      body.push(`・${has(w.composer) ? `${str(w.composer)}：` : ''}${str(w.work)}${has(w.notes) ? `（${str(w.notes)}）` : ''}`);
    }
    body.push(...lines(str(ev.program.notes)).map((x) => `※${x.replace(/^※/, '')}`));
    for (const s of ev.sub_events.items.filter((x) => has(x.title))) {
      body.push(`・${has(s.start_time) ? `${str(s.start_time)}〜${str(s.end_time)} ` : ''}${str(s.title)}${[str(s.place), str(s.target), str(s.fee), str(s.application)].filter(Boolean).map((x) => `／${x}`).join('')}`);
    }
    sec(type === 'multi_event' ? '催しの内容' : 'プログラム', body);
  }

  const dates = ev.schedule.dates.items.filter((x) => has(x.date)).map((x) => {
    const times = [
      has(x.doors_open) ? `開場 ${str(x.doors_open)}` : '',
      has(x.start_time) ? `${TYPE_SETS.PERF.includes(type) ? '開演' : '開始'} ${str(x.start_time)}` : '',
      has(x.end_time) ? `${TYPE_SETS.PERF.includes(type) ? '終演予定' : '終了'} ${str(x.end_time)}` : '',
    ].filter(Boolean).join('／');
    return `${d(str(x.date))}${has(x.session_label) ? `【${str(x.session_label)}】` : ''} ${times}`.trim();
  });
  sec(type === 'exhibition' ? '会期・時間' : '日時', [
    ...dates,
    has(ev.schedule.start_date) ? `${type === 'exhibition' ? '会期' : '期間'}：${d(str(ev.schedule.start_date))}${has(ev.schedule.end_date) ? `〜${d(str(ev.schedule.end_date))}` : ''}` : null,
    kv('開館時間', ev.schedule.open_hours), kv('休館日', ev.schedule.closed_days), kv('上演・所要時間', ev.schedule.duration), kv('休憩', ev.schedule.intermission),
    ...lines(str(ev.schedule.schedule_notes)),
  ]);

  const v = str(ev.venue.venue);
  const r = str(ev.venue.room);
  sec('会場', [[v, r && !v.includes(r) ? r : '', has(ev.venue.floor) && !v.includes(str(ev.venue.floor)) ? `（${str(ev.venue.floor)}）` : ''].filter(Boolean).join(' ')]);

  sec('料金', [
    has(ev.pricing.seating_type) ? `${str(ev.pricing.seating_type)}${has(ev.pricing.tax_included) ? `（${str(ev.pricing.tax_included)}）` : ''}` : kv('', ev.pricing.tax_included)?.slice(1),
    ...ev.pricing.prices.items.filter((p) => has(p.amount) || has(p.label)).map((p) => `${str(p.category) || '料金'}　${priceText(p)}${has(p.note) ? `（${str(p.note)}）` : ''}`),
    kv('学生券', ev.pricing.student_requirements), ...lines(str(ev.pricing.price_notes)),
  ]);

  sec('対象・年齢', [
    kv('年齢', ev.pricing.age_requirement), kv('膝上鑑賞', ev.pricing.lap_seating), kv('対象', ev.participation.target_age),
    kv('定員', ev.participation.capacity), kv('応募資格', ev.participation.eligibility),
  ]);

  const a = ev.accessibility;
  sec('アクセシビリティ・ご来場の配慮', [
    kv('車いす', a.wheelchair), kv('多目的トイレ', a.accessible_toilet), kv('ベビーカー', a.stroller), kv('託児', a.childcare),
    kv('聞こえのサポート', a.hearing_support), kv('年齢に関する配慮', a.age_accessibility), kv('その他', a.accessibility_notes),
  ]);

  sec('注意事項', lines(str(ev.notes)).map((x) => `※${x.replace(/^[※*・]\s*/, '')}`));

  if (TYPE_SETS.TICKETED.includes(type)) {
    const sched = (ev.tickets.sales_schedule?.items ?? []).filter((x) => has(x.date) || has(x.method));
    sec('チケット発売日', sched.length
      ? sched.map((x) => `${str(x.method) || '発売'}：${d(str(x.date))}${has(x.time) ? ` ${str(x.time)}〜` : ''}${has(x.note) ? `（${str(x.note)}）` : ''}`)
      : [
        kv('先行発売', ev.tickets.presale), kv('一般発売', ev.tickets.sales_start, d), kv('電話予約', ev.tickets.advance_phone_start, d),
        kv('窓口', ev.tickets.boxoffice_start, d), kv('WEB', ev.tickets.online_start, d),
      ]);
  }
  if (TYPE_SETS.PART.includes(type) || type === 'multi_event') {
    const p = ev.participation;
    sec(type === 'recruitment' ? '応募方法' : '申込方法', [
      ...lines(str(p.application_method)), kv('申込URL', p.application_url), kv('参加費', p.participation_fee), kv('持ち物', p.belongings),
      kv('申込開始', p.application_start, d), kv('申込締切', p.application_deadline, d), kv('抽選', p.lottery), kv('結果通知', p.notification_date),
    ]);
  }
  if (TYPE_SETS.TICKETED.includes(type)) {
    sec('チケット取扱', [
      ...ev.tickets.ticket_channels.items.filter((c) => has(c.name)).flatMap((c) => [
        [str(c.name), str(c.detail), has(c.phone) ? `TEL ${str(c.phone)}` : '', has(c.hours) ? `（${str(c.hours)}）` : '', str(c.url)].filter(Boolean).join(' '),
        ...lines(str(c.notes)).map((x) => `　・${x}`),
      ]),
      ...ev.tickets.ticket_codes.items.filter((k) => has(k.code)).map((k) => `${str(k.provider)}：${str(k.code)}`),
      kv('支払方法', ev.tickets.payment_methods), kv('手数料', ev.tickets.fees), ...lines(str(ev.tickets.ticket_notes)),
    ]);
  }
  const o = ev.organization;
  sec('主催・共催など', [kv('主催', o.organizer), kv('共催', o.co_organizer), kv('後援', o.supporter), kv('協賛', o.sponsor), kv('助成', o.grant), kv('協力', o.cooperation)]);
  sec('お問い合わせ', [str(o.contact), kv('TEL', o.phone), kv('メール', o.email), kv('受付時間', o.contact_hours)]);
  sec('関連リンク', [...ev.links.items.filter((l) => has(l.url)).map((l) => `${str(l.label) || 'リンク'}：${str(l.url)}`), kv('動画', ev.media.video)]);
  if (ev.updates.items.length) {
    sec('更新履歴', [...ev.updates.items].sort((x, y) => (x.date < y.date ? 1 : -1)).map((u) => `${d(u.date)}　${u.text}`));
  }
  return { text: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(), draft };
}

export { yen };
