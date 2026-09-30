// 禁止・注意表現、用語説明、略語。

/** 入力資料で裏付けられない限り生成してはいけない表現（SNS_RULES.md 3章） */
export const BANNED_PHRASES = [
  '必見', '絶対に見逃せない', '見逃せない', '世界最高', '最高峰', '史上最高', '奇跡の', '伝説の',
  '唯一無二', 'No.1', 'ナンバーワン', '日本一', '世界一', '急げ', '今すぐ', 'ラストチャンス',
  'お見逃しなく', '売り切れ必至', '圧巻', '感動必至', '話題の', '大人気', '超絶技巧', '至高',
];

/** 販売状況から機械的に出す場合だけ使える語 */
export const STATUS_ONLY_PHRASES = { '残りわずか': ['few_tickets'], '完売': ['sold_out'] };

/**
 * 出力文に含まれる禁止表現のうち、資料（sourceText）に含まれないものを返す。
 * sourceText には event.json の原文（紹介文・プロフィール・キャッチコピー等）を渡す。
 */
export function findUnsupportedPhrases(output, sourceText = '', statusCode = null) {
  const found = [];
  for (const p of BANNED_PHRASES) {
    if (output.includes(p) && !sourceText.includes(p)) found.push(p);
  }
  for (const [p, codes] of Object.entries(STATUS_ONLY_PHRASES)) {
    if (output.includes(p) && !sourceText.includes(p) && !codes.includes(statusCode)) found.push(p);
  }
  return found;
}

/** 見慣れない語の説明（WCAG 3.1.3）。本文に出てきた語だけを「ことばの説明」に載せる。 */
export const GLOSSARY = {
  '開場': '会場の入口が開き、入場できるようになる時刻です。',
  '開演': '公演が始まる時刻です。',
  '終演': '公演が終わる時刻です。',
  '全席指定': '座席の番号がチケットで決まっている方式です。',
  '全席自由': '座席が決まっておらず、空いている席に座れる方式です。',
  '未就学児': '小学校に入学する前のこどもです。',
  '膝上鑑賞': '保護者のひざの上にこどもを座らせて鑑賞することです。こどもの座席はありません。',
  '当日券': '公演の当日に会場で販売するチケットです。',
  '先行発売': '一般発売より前に、会員などを対象に販売することです。',
  '一般発売': 'どなたでも購入できる販売の開始です。',
  '抽選': '申込が定員より多い場合に、くじで参加者を決めることです。',
  '託児': '公演の間、こどもを預かるサービスです。',
  'ヒアリングループ': '補聴器などで音を聞き取りやすくする設備です。',
  '磁気ループ': '補聴器などで音を聞き取りやすくする設備です。',
  'ホワイエ': 'ホールの客席の外にある広いロビーです。',
  'プレイガイド': 'チケットを販売する会社や窓口です。',
};

/** 略語（WCAG 3.1.4）。abbr の title に使う。 */
export const ABBREVIATIONS = {
  'Pコード': 'チケットぴあで購入するときの公演番号',
  'Lコード': 'ローソンチケットで購入するときの公演番号',
  'WS': 'ワークショップ',
  'Pf': 'ピアノ',
  'Vn': 'ヴァイオリン',
  'Va': 'ヴィオラ',
  'Vc': 'チェロ',
  'Fl': 'フルート',
  'Cl': 'クラリネット',
};

export function glossaryFor(text) {
  return Object.entries(GLOSSARY).filter(([term]) => text.includes(term));
}

/** リンクテキストとして不十分な語（WCAG 2.4.4 / 2.4.9） */
export const VAGUE_LINK_TEXTS = ['こちら', 'ここ', '詳細', '詳しくはこちら', 'クリック', 'click here', 'here', 'more', 'link', 'リンク'];
