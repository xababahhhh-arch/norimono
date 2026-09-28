// 画像のOCR（Phase 2 で Tesseract.js をブラウザ内で実行する予定）。
// Phase 1 では OCR を行わず、「未対応」を返す。画像のチラシは、プレビューを見ながら
// 文字を貼り付けるか、確認画面で直接入力する。
export const OCR_AVAILABLE = false;

export async function ocrImage(/* file */) {
  return {
    ok: false,
    message: '画像からの文字読み取り（OCR）は準備中です。チラシの文字を「文字を貼り付け」欄に入力するか、確認画面で直接入力してください。',
    pages: [],
  };
}
