// 抽出・文章生成の adapter。
// Phase 1 はブラウザ内で完結する 'local'（ルールベース＋テンプレート）だけが有効。
// 外部AI（Claude API / OpenAI API 等）を追加する場合は external: true の adapter を登録し、
// 呼び出し前に必ず requestExternalConsent() で利用者の同意を得る。
import { extractEvent } from '../extract/rules.js';
import { generateSns } from '../generate/sns.js';

export const CONSENT_MESSAGE = 'このファイル・情報を外部AIサービスへ送信します。';

export const localAdapter = {
  id: 'local',
  label: 'ブラウザ内で処理（外部送信なし）',
  external: false,
  async extract(raw, opts) {
    return extractEvent(raw, opts);
  },
  async draftSns(ev, platform, kind, opts) {
    return generateSns(ev, platform, kind, opts);
  },
};

/**
 * 外部AI adapter のひな形（Phase 3）。実装時は endpoint・モデル名・APIキーの扱いを設計し直すこと。
 * 出力は必ず event.json の「下書き」として扱い、confirmed を true にしない。
 */
export function createExternalAdapterStub({ id, label, serviceName }) {
  return {
    id,
    label,
    serviceName,
    external: true,
    enabled: false,
    async extract() {
      throw new Error(`${label} は未実装です（Phase 3）。`);
    },
    async draftSns() {
      throw new Error(`${label} は未実装です（Phase 3）。`);
    },
  };
}

export const ADAPTERS = [
  localAdapter,
  createExternalAdapterStub({ id: 'claude', label: 'Claude API（未実装）', serviceName: 'Anthropic Claude API' }),
  createExternalAdapterStub({ id: 'openai', label: 'OpenAI API（未実装）', serviceName: 'OpenAI API' }),
];

/**
 * 外部送信の同意を得る。confirmFn は (message) => Promise<boolean>（既定はキャンセル扱い）。
 * 送信する内容（ファイル名・項目）を必ず列挙して見せる。
 */
export async function requestExternalConsent(adapter, { files = [], fields = [] } = {}, confirmFn = async () => false) {
  if (!adapter.external) return true;
  const msg = [
    CONSENT_MESSAGE,
    `送信先：${adapter.serviceName ?? adapter.label}`,
    files.length ? `送信するファイル：${files.join('、')}` : '',
    fields.length ? `送信する情報：${fields.join('、')}` : '',
    '送信してよろしいですか？',
  ].filter(Boolean).join('\n');
  return !!(await confirmFn(msg));
}

/** adapter を使って処理する。外部 adapter は同意がなければ実行しない。 */
export async function runWithAdapter(adapter, action, args, consentInfo, confirmFn) {
  if (adapter.external) {
    if (!adapter.enabled) throw new Error(`${adapter.label} は利用できません。`);
    const ok = await requestExternalConsent(adapter, consentInfo, confirmFn);
    if (!ok) throw new Error('外部AIサービスへの送信はキャンセルされました。');
  }
  return adapter[action](...args);
}
