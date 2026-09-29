// event.json の定義。確認画面のフォーム、空のevent.jsonの作成、読み込み時の正規化は
// すべてこの定義から行う（項目を追加するときはここだけを変更する）。
import { field, list, isField, isEmpty } from './field.js';

export const SCHEMA_VERSION = '1.0';
export const FACILITY_NAME = '戸塚区民文化センター さくらプラザ';

export const EVENT_TYPES = {
  performance: '公演',
  family_performance: 'ファミリー公演',
  workshop: 'ワークショップ',
  lecture: '講座',
  exhibition: '展示',
  recruitment: '参加者募集',
  multi_event: '複合イベント',
};

export const STATUSES = {
  // 販売・受付状況はチラシからは決めない。担当者が窓口の状況を確認して設定するまで「未設定」。
  unset: { label: '未設定', mark: '？' },
  scheduled: { label: '発売前', mark: '◇' },
  on_sale: { label: '発売中', mark: '●' },
  few_tickets: { label: '残りわずか', mark: '▲' },
  sold_out: { label: '完売', mark: '✕' },
  registration_open: { label: '受付中', mark: '●' },
  registration_closed: { label: '受付終了', mark: '✕' },
  waiting_list: { label: 'キャンセル待ち受付中', mark: '▲' },
  cancelled: { label: '中止', mark: '✕' },
  postponed: { label: '延期', mark: '！' },
  finished: { label: '終了しました', mark: '－' },
};

/** 購入・申込を促してはいけない状態 */
export const CLOSED_STATUSES = ['sold_out', 'registration_closed', 'cancelled', 'postponed', 'finished'];

export const UPDATE_TYPES = {
  status: '販売・受付状況',
  performer_change: '出演者変更',
  program_change: '曲目・内容変更',
  schedule_change: '日時変更',
  notice: 'お知らせ',
};

/** 施設内の室名（抽出の手がかりとしてのみ使う。確認済みにはしない） */
export const VENUE_ROOMS = ['ホール', 'ギャラリー', 'リハーサル室', 'アトリエ', '練習室', 'スタジオ', 'ホワイエ', '会議室', '和室'];

const PERF = ['performance', 'family_performance'];
const PART = ['workshop', 'lecture', 'recruitment'];
const ALL = Object.keys(EVENT_TYPES);
const TICKETED = ['performance', 'family_performance', 'lecture', 'multi_event'];

// f(): 1つの値 / l(): 繰り返し項目
function f(key, label, opts = {}) {
  return { kind: 'field', key, label, type: 'text', ...opts };
}
function l(key, label, fields, opts = {}) {
  return { kind: 'list', key, label, fields, ...opts };
}

/**
 * base: event.json 上の親パス（'' はトップレベル）
 * types: 確認画面・HPで表示する種別（省略時はすべて）
 */
export const GROUPS = [
  {
    id: 'classification', base: '', label: 'イベント種別',
    fields: [
      f('event_type', 'イベント種別', { type: 'select', options: EVENT_TYPES, help: '自動で推定しています。違う場合は変更してください。' }),
      f('genre', 'ジャンル', { help: 'チラシに書かれている場合のみ（例：クラシック、ジャズ）' }),
    ],
  },
  {
    id: 'basic', base: 'basic', label: '基本情報',
    fields: [
      f('title', 'タイトル', { required: true }),
      f('subtitle', 'サブタイトル'),
      f('catchphrase', 'キャッチコピー', { help: 'チラシに書かれている文言のみ。自動では作りません。' }),
      f('description', '紹介文', { type: 'textarea' }),
    ],
  },
  {
    id: 'schedule', base: 'schedule', label: '日時',
    fields: [
      l('dates', '日程', [
        f('date', '開催日', { type: 'date', required: true }),
        f('weekday_on_flyer', '曜日（チラシの表記）', { required: true, help: '日付から計算した曜日と照合します。' }),
        f('session_label', '回の名前', { help: '例：1回目、午前の部' }),
        f('doors_open', '開場', { type: 'time', required: true, types: [...PERF, 'lecture', 'multi_event'] }),
        f('start_time', '開演・開始', { type: 'time', required: true }),
        f('end_time', '終演・終了（予定）', { type: 'time' }),
      ], { itemLabel: '回', required: true }),
      f('start_date', '期間の開始日', { type: 'date', types: ['exhibition', 'recruitment', 'multi_event'] }),
      f('end_date', '期間の終了日', { type: 'date', types: ['exhibition', 'recruitment', 'multi_event'] }),
      f('duration', '上演・所要時間', { help: '例：約90分' }),
      f('intermission', '休憩', { types: [...PERF, 'lecture'] }),
      f('open_hours', '開館時間', { types: ['exhibition'] }),
      f('closed_days', '休館日', { types: ['exhibition'] }),
      f('schedule_notes', '日時の補足', { type: 'textarea' }),
    ],
  },
  {
    id: 'venue', base: 'venue', label: '会場',
    fields: [
      f('venue', '会場', { required: true }),
      f('room', '室名'),
      f('floor', '階'),
    ],
  },
  {
    id: 'performers', base: '', label: '出演・講師',
    types: ['performance', 'family_performance', 'workshop', 'lecture', 'multi_event', 'exhibition'],
    fields: [
      l('performers', '出演者', [
        f('name', '名前', { required: true }),
        f('reading', '読み（ふりがな）'),
        f('roman_name', 'ローマ字表記', { lang: 'en' }),
        f('role', '役割', { help: '例：出演、講師、ナビゲーター' }),
        f('instrument', '楽器・声種'),
        f('profile', 'プロフィール', { type: 'textarea', help: 'チラシ等の原文。要約・補完はしません。' }),
        f('photo', '写真（ファイル名またはURL）'),
        f('photo_alt', '写真の代替テキスト'),
        f('photo_credit', '写真クレジット'),
      ], { itemLabel: '出演者', required: true }),
    ],
  },
  {
    id: 'program', base: 'program', label: 'プログラム',
    types: ['performance', 'family_performance', 'lecture', 'multi_event'],
    fields: [
      l('works', '曲目・演目', [
        f('composer', '作曲者・作者'),
        f('work', '作品名'),
        f('section', '部・区分', { help: '例：第1部' }),
        f('notes', '補足'),
      ], { itemLabel: '曲' }),
      f('notes', 'プログラムの注記', { help: '例：曲目は変更になる場合があります' }),
    ],
  },
  {
    id: 'sub_events', base: '', label: '同時開催の催し', types: ['multi_event'],
    fields: [
      l('sub_events', '催し', [
        f('title', '催しの名前', { required: true }),
        f('start_time', '開始', { type: 'time' }),
        f('end_time', '終了', { type: 'time' }),
        f('place', '場所'),
        f('target', '対象'),
        f('fee', '料金'),
        f('application', '申込'),
        f('description', '内容', { type: 'textarea' }),
      ], { itemLabel: '催し' }),
    ],
  },
  {
    id: 'pricing', base: 'pricing', label: '料金',
    fields: [
      f('seating_type', '席種', { help: '例：全席指定、全席自由' }),
      l('prices', '料金', [
        f('category', '区分', { help: '例：一般、学生' }),
        f('amount', '金額（円）', { type: 'number', help: '無料は 0' }),
        f('label', '表示（原文）', { help: '例：入場無料（要整理券）' }),
        f('note', '補足'),
      ], { itemLabel: '料金', required: true }),
      f('tax_included', '税込表記'),
      f('age_requirement', '年齢制限', { required: true }),
      f('lap_seating', '膝上鑑賞', { types: [...PERF, 'multi_event'] }),
      f('student_requirements', '学生券の条件'),
      f('price_notes', '料金の補足', { type: 'textarea' }),
    ],
  },
  {
    id: 'participation', base: 'participation', label: '対象・申込', types: [...PART, 'multi_event'],
    fields: [
      f('target_age', '対象'),
      f('capacity', '定員'),
      f('participation_fee', '参加費・受講料'),
      f('eligibility', '応募資格', { types: ['recruitment'] }),
      f('belongings', '持ち物', { types: ['workshop', 'lecture', 'multi_event'] }),
      f('application_method', '申込方法', { type: 'textarea', required: true }),
      f('application_url', '申込URL', { type: 'url' }),
      f('application_start', '申込開始日', { type: 'date', required: true }),
      f('application_deadline', '申込締切日', { type: 'date' }),
      f('lottery', '抽選'),
      f('notification_date', '結果通知'),
    ],
  },
  {
    id: 'tickets', base: 'tickets', label: 'チケット', types: TICKETED,
    fields: [
      f('sales_start', '一般発売日', { type: 'date', required: true }),
      l('sales_schedule', '発売日時（販売方法ごと）', [
        f('method', '販売方法（原文）', { required: true, help: '例：さくらプラザ先行電話予約' }),
        f('date', '発売日', { type: 'date', required: true }),
        f('time', '発売時刻', { type: 'time', help: '例：10:00（チラシに時刻がなければ空欄）' }),
        f('note', '補足'),
      ], { itemLabel: '発売' }),
      f('presale', '先行発売'),
      f('advance_phone_start', '電話予約開始', { type: 'date' }),
      f('boxoffice_start', '窓口発売', { type: 'date' }),
      f('online_start', 'WEB発売', { type: 'date' }),
      l('ticket_channels', 'チケット取扱', [
        f('name', '取扱先', { required: true }),
        f('detail', '詳細'),
        f('phone', '電話', { type: 'tel' }),
        f('url', 'URL', { type: 'url' }),
        f('hours', '受付時間'),
        f('notes', 'この取扱先だけの注記', { type: 'textarea', help: '例：車椅子席の取扱いはございません（取扱先ごとの条件）' }),
      ], { itemLabel: '取扱先' }),
      l('ticket_codes', 'プレイガイドのコード', [
        f('provider', 'プレイガイド'),
        f('code', 'コード'),
      ], { itemLabel: 'コード' }),
      f('payment_methods', '支払方法'),
      f('fees', '手数料'),
      f('ticket_notes', 'チケットの補足', { type: 'textarea' }),
    ],
  },
  {
    id: 'accessibility', base: 'accessibility', label: 'アクセシビリティ',
    fields: [
      f('wheelchair', '車いす席・車いすでの来場'),
      f('accessible_toilet', '多目的トイレ'),
      f('stroller', 'ベビーカー'),
      f('childcare', '託児'),
      f('hearing_support', '聞こえのサポート', { help: '例：ヒアリングループ、手話通訳、字幕' }),
      f('age_accessibility', '年齢に関する配慮', { help: '例：途中入退場可' }),
      f('accessibility_notes', 'その他', { type: 'textarea' }),
    ],
  },
  {
    id: 'notes', base: '', label: '注意事項',
    fields: [f('notes', '注意事項', { type: 'textarea' })],
  },
  {
    id: 'organization', base: 'organization', label: '主催・問い合わせ',
    fields: [
      f('organizer', '主催'),
      f('co_organizer', '共催'),
      f('supporter', '後援'),
      f('sponsor', '協賛'),
      f('grant', '助成'),
      f('cooperation', '協力'),
      f('contact', '問い合わせ先'),
      f('phone', '電話番号', { type: 'tel', required: true }),
      f('email', 'メール', { type: 'email' }),
      f('contact_hours', '受付時間'),
    ],
  },
  {
    id: 'links', base: '', label: '外部リンク',
    fields: [
      l('links', 'リンク', [
        f('label', 'リンクの説明', { required: true, help: '例：出演者の公式サイト（「こちら」は不可）' }),
        f('url', 'URL', { type: 'url', required: true }),
      ], { itemLabel: 'リンク' }),
    ],
  },
  {
    id: 'media', base: 'media', label: '画像・チラシ',
    fields: [
      f('flyer', 'チラシ（PDF・画像のファイル名またはURL）'),
      f('flyer_front', 'チラシ表面'),
      f('flyer_back', 'チラシ裏面'),
      l('images', '画像', [
        f('src', 'ファイル名またはURL', { required: true }),
        f('alt', '代替テキスト', { required: true }),
        f('caption', 'キャプション'),
        f('credit', 'クレジット'),
      ], { itemLabel: '画像' }),
      f('video', '動画URL', { type: 'url' }),
    ],
  },
];

export function pathOf(group, def) {
  return group.base ? `${group.base}.${def.key}` : def.key;
}

export function isVisibleFor(def, eventType) {
  if (!def.types) return true;
  return def.types.includes(eventType);
}

/** 空の event.json を作る */
export function createEmptyEvent(now = new Date().toISOString()) {
  const ev = {
    schema_version: SCHEMA_VERSION,
    event_id: '',
    status: { code: 'unset', label: '', updated_at: null },
    updates: { items: [] },
    meta: {
      created_at: now, updated_at: now, source_files: [],
      extractor: null, finalized: false, finalized_at: null,
      // 抽出器が値として取り込まず、人の判断を求めた記載（原文つき）
      review_items: [],
      // 生成・承認・公開の記録。生成完了＝公開ではない。
      workflow: { state: 'draft', generated_at: null, approved_by: '', approved_at: null, published_at: null, published_url: '' },
    },
  };
  for (const g of GROUPS) {
    for (const def of g.fields) {
      const p = pathOf(g, def);
      assign(ev, p, def.kind === 'list' ? list([]) : field(null));
    }
  }
  ev.event_type.value = 'performance';
  ev.event_type.origin = 'inferred';
  ev.event_type.confidence = 0;
  return ev;
}

export function createListItem(listDef, prefix = 'i') {
  const item = { id: `${prefix}${Math.random().toString(36).slice(2, 8)}` };
  for (const d of listDef.fields) item[d.key] = field(null);
  return item;
}

function assign(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    o[keys[i]] = o[keys[i]] ?? {};
    o = o[keys[i]];
  }
  o[keys.at(-1)] = value;
}

function read(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/**
 * 読み込んだ event.json を正規化する。
 * 素の値（"title": "○○"）は Field に包む。opts.confirmed=true なら確認済みとして扱う
 * （テスト用 fixture を簡潔に書くため。実運用の読み込みでは false）。
 */
export function normalizeEvent(input, opts = {}) {
  const confirmed = !!opts.confirmed;
  const now = opts.now ?? new Date().toISOString();
  const ev = createEmptyEvent(now);
  const src = JSON.parse(JSON.stringify(input ?? {}));

  const wrap = (v) => {
    if (isField(v)) return { ...field(null), ...v };
    const fv = field(v === undefined ? null : v, { origin: isEmpty(v) ? null : 'manual', confidence: isEmpty(v) ? null : 1 });
    if (confirmed) { fv.confirmed = true; fv.confirmed_at = now; }
    return fv;
  };

  for (const g of GROUPS) {
    for (const def of g.fields) {
      const p = pathOf(g, def);
      const v = read(src, p);
      if (def.kind === 'list') {
        const arr = Array.isArray(v) ? v : (v && Array.isArray(v.items) ? v.items : []);
        const items = arr.map((it, i) => {
          const item = { id: it.id ?? `${def.key.slice(0, 1)}${i + 1}` };
          for (const d of def.fields) item[d.key] = wrap(it[d.key]);
          if ('status' in it) item.status = it.status ?? null;
          return item;
        });
        const lst = list(items);
        lst.none_confirmed = !!(v && !Array.isArray(v) && v.none_confirmed);
        assign(ev, p, lst);
      } else if (v !== undefined) {
        assign(ev, p, wrap(v));
      }
      // 未記載の項目は「情報なし」のまま（確認済みにはしない）
    }
  }
  ev.event_id = src.event_id ?? '';
  if (src.status) {
    ev.status = {
      code: STATUSES[src.status.code] ? src.status.code : 'unset',
      label: src.status.label ?? '',
      updated_at: src.status.updated_at ?? null,
    };
  }
  const ups = Array.isArray(src.updates) ? src.updates : (src.updates?.items ?? []);
  ev.updates.items = ups.map((u, i) => ({
    id: u.id ?? `u${i + 1}`,
    date: u.date ?? '',
    type: UPDATE_TYPES[u.type] ? u.type : 'notice',
    text: u.text ?? '',
  }));
  if (src.meta) {
    const { review_items: ri, workflow: wf, ...rest } = src.meta;
    Object.assign(ev.meta, rest);
    ev.meta.review_items = Array.isArray(ri) ? ri.map((x, i) => ({ id: x.id ?? `r${i + 1}`, topic: x.topic ?? '', text: x.text ?? '', page: x.page ?? null, file: x.file ?? null, reason: x.reason ?? '', blocking: !!x.blocking, resolved: !!x.resolved, resolution: x.resolution ?? '' })) : [];
    ev.meta.workflow = { ...ev.meta.workflow, ...(wf ?? {}) };
  }
  if (!EVENT_TYPES[ev.event_type.value]) ev.event_type.value = 'performance';
  return ev;
}

export const WORKFLOW_STATES = {
  draft: '下書き（未生成）',
  generated: '生成済み（上長の承認待ち・未公開）',
  approved: '承認済み（公開待ち）',
  published: '公開済み',
};

export function statusLabel(status) {
  if (!status) return '';
  return (status.label && status.label.trim()) || STATUSES[status.code]?.label || '';
}

export function statusMark(code) {
  return STATUSES[code]?.mark ?? '';
}

export function eventType(ev) {
  const t = ev?.event_type?.value;
  return EVENT_TYPES[t] ? t : 'performance';
}

export const TYPE_SETS = { PERF, PART, TICKETED, ALL };
