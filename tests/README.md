# 新作ゲームの検証
`play-smoke.cjs` は Playwright と Chrome がある環境で実行する。`npm install` と `npx playwright install chromium` で準備する。既存Chromeを使う場合は `CHROME_PATH`、共通インストールのPlaywrightを使う場合は `PLAYWRIGHT_MODULE` を指定できる。

1. リポジトリのルートで `python3 -m http.server 8765`
2. `cd tests && npm test`

320×568 / 375×667 / 390×844 / 412×915、タッチありのChromiumで各ゲーム3ステージ→クリア→再挑戦→ホーム。説明を聞く・スキップを別々に通過。線路の合わないパーツを試す。ページ例外を収集。
読み上げはテスト中だけ短時間完了するスタブ。OS音声・音質・重複の実聴確認をこのテストで保証しない。アニメーション中の安定待ちで自動操作が止まらないよう reducedMotion を使用。通常アニメーションのスクリーンショットも別途確認。
