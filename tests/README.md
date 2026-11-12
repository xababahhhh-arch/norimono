# 新作ゲームの検証
`play-smoke.cjs` は Playwright と Chrome がある環境で実行する。`npm install` と `npx playwright install chromium` で準備する。既存Chromeを使う場合は `CHROME_PATH`、共通インストールのPlaywrightを使う場合は `PLAYWRIGHT_MODULE` を指定できる。

1. リポジトリのルートで `python3 -m http.server 8765`
2. `cd tests && npm test`

320×568 / 375×667 / 390×844 / 412×915、タッチありのChromiumで各ゲーム3ステージ→クリア→再挑戦→ホーム。説明を聞く・スキップを別々に通過。線路の合わないパーツを試す。ページ例外を収集。
読み上げはテスト中だけ短時間完了するスタブ。OS音声・音質・重複の実聴確認をこのテストで保証しない。アニメーション中の安定待ちで自動操作が止まらないよう reducedMotion を使用。通常アニメーションのスクリーンショットも別途確認。

## 線路の接続と走行（2026-10-27 修正）
- `node --test tests/rail-geometry.test.mjs`: 経路・分岐・行き止まりの接続判定。
- 確認サーバーで `http://localhost:8765/tests/rail-browser.html` を開く: 4画面サイズの実際の描画座標と走行を検査。最後に `ALL PASS` を確認。
従来の通し操作テストだけではカーブの見た目の断線を検出できなかったため、上記を必須とする。

## 商品素材・発音文の見直し
`node --test tests/product.test.cjs` で発音文と中断処理を検査。
`tests/product-browser.html` は全24本の表示・最初の操作・音声接続、`tests/play-browser.html` は新作5本の全ステージを確認する。
`tests/product-review.html` は実際の端末で発音・アクセントを確認するページ。前2つのテストの音声はスタブであり、発音の実聴確認ではない。

## No.26〜30

`npm run test:next` は操作順序と完了条件を検証します。`next-browser.html?w=320&h=568` は実画面のタップ中心・遮蔽・地形・水面と船・乗客の移動、説明／スキップ、3ステージ、再プレイ、ホームを通し操作します。390×844、412×915も同じクエリで指定できます。音声終了だけをスタブ化しているため発音・アクセントの承認はできません。`next-gallery.html` は見た目と実操作のレビュー用です。

## 毎日追加ゲームの品質検査

`daily-quality-browser.html?size=small` を開き「20本を検証」を押す。sizeはsmall(320×568)、phone(390×844)、tablet(768×1024)、pc(1366×768)。数字のDOM順、44px以上の入力領域、画面内配置、説明・問題音声の文、具体的な不正解ヒント、全3ステージ、クリア、再プレイ、音声中のやり直し、JSエラーを確認する。正解は画面の絵・指示文から決定し、毎ステップ不正解も試す。

既存のCLI入口は `cd tests && npm install && npx playwright install chromium && npm run test:daily`。同じブラウザ検証をPlaywrightから実行する。今回の実行記録はブラウザ内の検証結果であり、CLIラッパーの実行記録ではない。

`node --test tests/daily-quality.test.cjs` は数字・数字文字列の並びと、音声キャンセル後に古い処理が進まないことを検査する。新作もdaily-quality.jsのordered/speak/cancelを使用し、ブラウザ検証のIDと固有の操作を追加する。ゲームごとに数字をshuffleしない。名前→押す対象を明記し、選択肢を数字へ置き換える位置暗記問題を避ける。

`rescue-quality-browser.html` は消防・はしごの3サイズ通し検査。`rail-browser.html` は6サイズの線路接続と電車軌道を検査する。

音声終了はスタブ。実際の発音・音質・iOS/Androidの音声制限や幼児の自力操作はこの検証では保証しない。
