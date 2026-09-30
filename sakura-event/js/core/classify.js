// イベント種別の推定（キーワードの重み付き加点）。結果は候補であり、担当者が変更できる。
import { normalizeText } from './dates.js';

const RULES = {
  performance: [['開演', 3], ['開場', 2], ['公演', 2], ['コンサート', 3], ['リサイタル', 4], ['ライブ', 3], ['全席指定', 3], ['全席自由', 2], ['演奏会', 3], ['曲目', 2], ['プログラム', 1], ['落語', 3], ['演劇', 3], ['ジャズ', 2]],
  family_performance: [['0歳', 6], ['0才', 6], ['親子', 4], ['ファミリー', 4], ['膝上', 4], ['ひざ上', 4], ['こども', 2], ['子ども', 2], ['キッズ', 3], ['赤ちゃん', 4], ['ベビー', 3]],
  workshop: [['ワークショップ', 6], ['体験', 3], ['つくろう', 3], ['作ろう', 3], ['持ち物', 3], ['参加費', 3], ['材料費', 3], ['定員', 2], ['動きやすい服装', 3]],
  lecture: [['講座', 6], ['講演', 4], ['レクチャー', 5], ['セミナー', 5], ['講師', 3], ['受講', 5], ['全\\d+回', 3]],
  exhibition: [['展示', 5], ['展覧会', 6], ['作品展', 6], ['ギャラリー', 3], ['会期', 5], ['休館日', 3], ['最終日', 2], ['入場無料', 1]],
  recruitment: [['募集', 5], ['応募', 5], ['オーディション', 6], ['出演者募集', 6], ['団員', 4], ['応募資格', 6], ['選考', 4]],
  multi_event: [['オープンデー', 8], ['オープンシアター', 8], ['フェスティバル', 5], ['同時開催', 5], ['館内', 2], ['見学ツアー', 5], ['バックステージ', 3], ['スタンプラリー', 5], ['各回', 1]],
};

export function classify(text) {
  const t = normalizeText(text);
  const scores = {};
  const hits = {};
  for (const [type, rules] of Object.entries(RULES)) {
    scores[type] = 0;
    hits[type] = [];
    for (const [kw, w] of rules) {
      const re = new RegExp(kw, 'g');
      const n = (t.match(re) || []).length;
      if (n) {
        scores[type] += w * Math.min(n, 3);
        hits[type].push(kw.replace('\\d+', 'N'));
      }
    }
  }
  // ファミリー公演は公演の特徴も持つ
  if (scores.family_performance > 0 && scores.performance > 0) scores.family_performance += Math.min(scores.performance, 6);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0];
  const second = ranked[1][1];
  if (bestScore === 0) {
    return { type: 'performance', confidence: 0.2, scores, hits, reason: '判定に使える語が見つかりませんでした（仮に「公演」としています）' };
  }
  const confidence = Math.max(0.3, Math.min(0.95, (bestScore - second) / (bestScore + 4) + 0.4));
  return { type: best, confidence: Number(confidence.toFixed(2)), scores, hits, reason: `手がかり：${hits[best].join('、')}` };
}
