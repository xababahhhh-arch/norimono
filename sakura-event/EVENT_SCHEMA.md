# EVENT_SCHEMA — event.json 仕様（schema_version 1.0）

`event.json` は **Single Source of Truth** です。HP・SNS・代替テキスト・アクセシビリティ報告はすべてこのファイルだけから生成します。

## 1. 出典つきの値（Field）

主要な項目はすべて次の形で保持します。

```json
"title": {
  "value": "○○ピアノリサイタル",
  "source_file": "flyer_front.pdf",
  "source_page": 1,
  "source_text": "○○ ピアノ・リサイタル",
  "confidence": 0.62,
  "origin": "extracted",
  "confirmed": false,
  "confirmed_at": null,
  "note": "",
  "basis": "文字の大きさの情報がないため、最初の行をタイトルの候補にしました",
  "reasons": ["タイトルかどうか、チラシで確認してください"]
}
```

| キー | 型 | 説明 |
|---|---|---|
| `value` | string / number / boolean / null | 値。空は `null` または `""` |
| `source_file` | string / null | 取り出したファイル名 |
| `source_page` | number / null | ページ番号（1始まり）。画像は 1 |
| `source_text` | string / null | 取り出し元の **加工前の** 文字列（前後を含む1行程度） |
| `source_method` | `pdf_text` / `ocr` / `paste` / `mixed` / null | 取得方法。画面では「PDFの文字から取得」「OCRで取得」「担当者が修正」（`origin: manual`）などと表示 |
| `source_bbox` | {x0,y0,x1,y1} / null | ページ上の位置（0〜1、上が0）。プレビューで枠を表示するために使う |
| `confidence` | number / null | 0〜1。抽出規則の確からしさ。人が入力した値は 1 |
| `origin` | `extracted` / `inferred` / `computed` / `manual` / `ai` | 値の由来。`inferred` は推定（例：年の省略を補った） |
| `confirmed` | boolean | 人が「確認済み」にしたか。**抽出器・AIは true にしない** |
| `confirmed_at` | ISO日時 / null | 確認した日時 |
| `note` | string | 確認時のメモ（例：「該当なし」「チラシ裏面で確認」） |
| `basis` | string | **抽出根拠**。どの書き方・どの見出しから取り出したか（例：「「開演」の語と並んで書かれた時刻です」） |
| `reasons` | string[] | **確認が必要な理由**（例：「年がチラシに書かれていないため推定しました」「見出しのない行から取り出したため…」）。値を取り出せなかった場合も、理由だけを持つことがある |

> **確信度（confidence）は正しさの保証ではありません。** 実チラシのテスト（REAL_DATA_TEST_UNPLUGGED.md）で、誤った値に高い確信度が付くことがわかったため、画面には数値を表示せず、`basis` と `reasons` を文章で表示します。`confidence` は内部で候補の優先順位を決めるためだけに使います。

### 確認状態の表示（UI・報告書）

| 条件 | 表示 | 記号 |
|---|---|---|
| `confirmed === true` かつ値あり | 確認済み | ✓ |
| `confirmed === true` かつ値なし | 確認済み（該当なし） | ✓ |
| `confirmed === false` かつ値あり | 要確認 | ！ |
| `confirmed === false` かつ値なし | 情報なし | － |

- 確認画面では、各項目に「出典（ファイル・ページ・原文）」「抽出根拠」「確認が必要な理由」を表示します（確信度の数値は表示しません）。
- **確認後に値を変更すると `confirmed` は自動で false に戻ります。**

## 2. 繰り返し項目（List）

出演者・曲目・日程・料金・チケット取扱などの繰り返し項目は次の形です。

```json
"performers": {
  "items": [ { "id": "p1", "name": { Field }, "instrument": { Field } } ],
  "none_confirmed": false
}
```

`none_confirmed: true` は「この項目は該当なし（例：出演者なしの展示）」と人が確認したことを表します。

## 3. 全体構造

```jsonc
{
  "schema_version": "1.0",
  "event_id": "2026-07-04-sample-piano",       // 英数字とハイフン。ファイル名・URLにも使える
  "event_type": Field,                          // performance | family_performance | workshop | lecture | exhibition | recruitment | multi_event
  "genre": Field,                               // 任意：クラシック / ジャズ / 演劇 など（チラシにある場合のみ）

  "basic": {
    "title": Field, "subtitle": Field,
    "catchphrase": Field,                       // チラシにある文言のみ。自動作成しない
    "description": Field                        // チラシの紹介文
  },

  "status": {                                   // 販売・受付状況（本文と分離）
    "code": "on_sale",
    "label": "発売中",                          // 空なら code の標準ラベル
    "updated_at": "2026-06-01"
  },
  "updates": {
    "items": [
      { "id": "u1", "date": "2026-07-04", "type": "notice", "text": "定員に達したため電話受付は実施しません" }
    ]
  },

  "schedule": {
    "dates": { "items": [
      {
        "id": "d1",
        "date": Field,                           // "2026-07-04"（ISO）
        "weekday_on_flyer": Field,               // "土"（チラシ表記。照合用）
        "session_label": Field,                  // "1回目" "午前の部" など
        "doors_open": Field,                     // "13:30"
        "start_time": Field,                     // "14:00"
        "end_time": Field,                       // "16:00"（終演予定・終了時刻）
        "status": null                           // 回ごとの販売状況（任意。status.code と同じ値）
      }
    ], "none_confirmed": false },
    "start_date": Field,                         // 展示・募集などの期間。空なら dates から計算
    "end_date": Field,
    "duration": Field,                           // "約90分"
    "intermission": Field,                       // "休憩あり（15分）"
    "open_hours": Field,                         // 展示の開館時間
    "closed_days": Field,                        // 休館日
    "schedule_notes": Field
    // multiple_sessions は保存せず dates の件数から計算（2件以上で true）
  },

  "venue": { "venue": Field, "room": Field, "floor": Field },

  "performers": { "items": [
    {
      "id": "p1",
      "name": Field, "reading": Field, "roman_name": Field,
      "role": Field,                             // 出演 / 講師 / ナビゲーター / 指揮 など
      "instrument": Field,
      "profile": Field,                          // チラシ等の原文。要約・補完しない
      "photo": Field,                            // 画像ファイル名またはURL
      "photo_alt": Field,
      "photo_credit": Field
    }
  ], "none_confirmed": false },

  "program": {
    "works": { "items": [ { "id": "w1", "composer": Field, "work": Field, "section": Field, "notes": Field } ], "none_confirmed": false },
    "notes": Field                               // 「曲目は変更になる場合があります」など
  },

  "pricing": {
    "seating_type": Field,                       // 全席指定 / 全席自由 / 当日自由席 など
    "prices": { "items": [
      { "id": "c1", "category": Field, "amount": Field, "label": Field, "note": Field }
      // amount は円の数値。無料は 0。label は「無料（要整理券）」など表示用の原文
    ], "none_confirmed": false },
    "tax_included": Field,
    "age_requirement": Field,                    // 「未就学児入場不可」「0歳から入場可」
    "lap_seating": Field,                        // 「3歳未満 膝上鑑賞無料（1名まで）」
    "student_requirements": Field,               // 「学生券は当日学生証提示」
    "price_notes": Field
  },

  "tickets": {
    "sales_start": Field,                        // 一般発売日 ISO
    "advance_phone_start": Field,                // 先行（電話）等
    "boxoffice_start": Field,                    // 窓口発売
    "online_start": Field,                       // WEB発売
    "presale": Field,                            // 先行発売の説明（原文）
    "sales_schedule": { "items": [              // 販売方法ごとの発売日時（チラシの販売方法の文言をそのまま）
      { "id": "ss1", "method": Field, "date": Field, "time": Field, "note": Field }
      // 例：method「さくらプラザ先行電話予約」date「2026-08-15」time「14:00」
    ], "none_confirmed": false },
    "ticket_channels": { "items": [
      { "id": "t1", "name": Field, "detail": Field, "phone": Field, "url": Field, "hours": Field,
        "notes": Field }                         // この取扱先だけの条件（例：「車椅子席の取扱いはございません」）
    ], "none_confirmed": false },
    "ticket_codes": { "items": [ { "id": "k1", "provider": Field, "code": Field } ], "none_confirmed": false },
    "payment_methods": Field,
    "fees": Field,                               // 手数料
    "ticket_notes": Field
  },

  "participation": {                             // ワークショップ・講座・募集
    "target_age": Field, "capacity": Field, "participation_fee": Field,
    "belongings": Field, "application_method": Field, "application_url": Field,
    "application_start": Field, "application_deadline": Field,
    "lottery": Field, "notification_date": Field, "eligibility": Field
  },

  "accessibility": {
    "wheelchair": Field, "accessible_toilet": Field, "stroller": Field,
    "childcare": Field, "hearing_support": Field, "age_accessibility": Field,
    "accessibility_notes": Field
  },

  "organization": {
    "organizer": Field, "co_organizer": Field, "sponsor": Field,
    "supporter": Field,                          // 後援
    "grant": Field,                              // 助成
    "cooperation": Field,
    "contact": Field, "phone": Field, "email": Field, "contact_hours": Field
  },

  "links": { "items": [ { "id": "l1", "label": Field, "url": Field } ], "none_confirmed": false },

  "media": {
    "flyer": Field, "flyer_front": Field, "flyer_back": Field,   // ファイル名またはURL（PDFへのリンク用）
    "images": { "items": [ { "id": "i1", "src": Field, "alt": Field, "caption": Field, "credit": Field } ], "none_confirmed": false },
    "video": Field
  },

  "notes": Field,                                // 注意事項（原文）

  "sub_events": { "items": [                     // multi_event の小イベント
    { "id": "s1", "title": Field, "start_time": Field, "end_time": Field, "place": Field,
      "target": Field, "fee": Field, "application": Field, "description": Field }
  ], "none_confirmed": false },

  "meta": {
    "created_at": "2026-06-01T10:00:00+09:00",
    "updated_at": "2026-06-01T10:30:00+09:00",
    "source_files": [ { "name": "flyer_front.pdf", "type": "application/pdf", "size": 123456,
                        "sha256": "…64桁…", "imported_at": "2026-06-01T10:00:00+09:00", "pages": 1 } ],
    "source_review": { "confirmed": false },     // 担当者が「版を確認した」か（SHA-256 は同一性の確認だけ。最新版・承認済みとは判定しない）
    "source_mismatch": false,                    // 読み込んだファイルが記録の SHA-256 と一致しない（差し替え）→ 確定できない
    "extractor": "rules-1.0",
    "finalized": false,                          // 確認ゲート通過後に true
    "finalized_at": null,
    "review_items": [                            // 抽出器が値として取り込まず、人の判断を求めた記載（原文つき）
      { "id": "r1", "topic": "開場・開演の時刻", "text": "開場・開演 18:00／18:30", "page": 1, "file": "…",
        "reason": "「開場」「開演」の語と時刻の組み合わせを自動で区別できませんでした…",
        "blocking": true,                        // true：対応済みにするまで確定できない
        "resolved": false, "resolution": "" }
    ],
    "workflow": {                                // 生成・承認・公開の記録（このシステムは公開しない）
      "state": "draft",                          // draft → generated（承認待ち・未公開）→ approved（公開待ち）→ published
      "generated_at": null, "approved_by": "", "approved_at": null, "published_at": null, "published_url": ""
    },
    "page_url": "https://…"                      // 公開したHPページのURL（SNSの導線に使う。未入力なら「［HPページのURL］」と表示）
  }
}
```

## 4. 販売・受付状況（status.code）

| code | 標準ラベル | HPでの表示（記号＋文字） | 主な種別 |
|---|---|---|---|
| `unset` | 未設定 | ？ 販売・受付状況は未設定です（要確認） | 全般（初期値。**チラシからは決めない**。未設定のままでは確定できない） |
| `scheduled` | 発売前 | ◇ 発売前 | 全般 |
| `on_sale` | 発売中 | ● 発売中 | 公演 |
| `few_tickets` | 残りわずか | ▲ 残りわずか | 公演 |
| `sold_out` | 完売 | ✕ 完売 | 公演 |
| `registration_open` | 受付中 | ● 受付中 | WS・講座・募集 |
| `registration_closed` | 受付終了 | ✕ 受付終了 | WS・講座・募集 |
| `waiting_list` | キャンセル待ち受付中 | ▲ キャンセル待ち受付中 | 全般 |
| `cancelled` | 中止 | ✕ 中止 | 全般 |
| `postponed` | 延期 | ！ 延期 | 全般 |
| `finished` | 終了しました | － 終了しました | 全般 |

- `label` を入力すると標準ラベルの代わりに表示します（例：「予定枚数終了」）。
- 回ごとの状況は `schedule.dates.items[].status` に同じ code を入れます。
- 状況を変えたときは `updates.items` に日付つきで履歴を残すことを推奨します（UIの状況変更ボタンは自動で履歴を追加します）。

## 5. 更新履歴（updates.items）

| キー | 説明 |
|---|---|
| `date` | ISO日付 |
| `type` | `status`（販売状況）/ `performer_change`（出演者変更）/ `program_change`（曲目変更）/ `schedule_change`（日時変更）/ `notice`（その他のお知らせ） |
| `text` | 表示する文章（人が書いたもの） |

HPでは新しい順に「更新履歴」として表示し、出演者変更・中止・延期はページ上部の状態表示の近くにも表示します。

## 6. 必須確認項目（確定ゲート）

次の項目がすべて「確認済み」（該当なしの確認を含む）でない限り、最終HTMLを確定できません。

| 項目 | 対象パス | 備考 |
|---|---|---|
| タイトル | `basic.title` | 空のまま確認済みにはできない |
| 開催日 | `schedule.dates.items[].date` | 1件以上必要（展示・募集は `start_date` でも可） |
| 曜日 | `schedule.dates.items[].weekday_on_flyer` | プログラムで計算した曜日と一致すること。不一致は「エラー：曜日が一致しません」 |
| 開場 | `schedule.dates.items[].doors_open` | 展示・WS等は「該当なし」で確認可 |
| 開演 | `schedule.dates.items[].start_time` | |
| 会場 | `venue.venue` | 空のまま確認済みにはできない |
| 出演者 | `performers`（各 `name`） | 出演者なしは「該当なし」で確認 |
| 料金 | `pricing.prices`（各 `category` `amount` または `label`） | 無料は amount 0 |
| （参考）曲目 | `program.works` | 必須確認ではないが、SNS「C」はここが空だと生成しない |
| 年齢制限 | `pricing.age_requirement` | |
| チケット発売情報 | `tickets.sales_start` と `tickets.sales_schedule` の各行（WS・講座・募集は `participation.application_start` / `application_method`） | |
| 電話番号 | `organization.phone` | 形式チェックあり |
| 販売・受付状況 | `status.code` | `unset`（未設定）のままでは確定できない。窓口・販売システムで確認して設定する |
| 判断が必要な記載 | `meta.review_items`（`blocking: true`） | 原文を確認して「対応済み」にするまで確定できない |
| 外部URL | 値のある URL 項目すべて（`links` `ticket_channels[].url` `participation.application_url` `media.video`） | `http(s)://` のみ |

## 7. fixture の簡略表記

テスト用の `fixtures/events/*.json` は、Field を素の値で書いた簡略表記です（例：`"title": "○○"`）。
`normalizeEvent(json, { confirmed: true })` で Field に変換し、確認済みとして扱います。
値を `null` と明記した項目は「確認済み（該当なし）」、書かなかった項目は「情報なし」になります。
アプリで event.json を読み込むときは `confirmed: false` で読み込み、Field 形式で保存された確認状態だけを引き継ぎます。

## 8. 空の値と「情報なし」

- 生成器は空の項目について、**推測で埋めず**、HPでは原則として見出しごと非表示にします。
- ただし必須セクション（日時・会場・料金・問い合わせ）が空の場合は、下書きプレビューで「情報なし（要確認）」と表示し、確定をブロックします。

## 9. 生成・承認・公開の区別

- 「確認済みの内容で生成する」を押すと `meta.workflow.state` が `generated`（生成済み・上長の承認待ち・未公開）になります。**生成しても公開されたことにはなりません。**
- 上長の承認後、STEP 5 で承認者と承認日を記録すると `approved`、担当者が CMS・各SNS で公開した後に公開日とURLを記録すると `published` になります。このシステム自体は公開を行いません。
- 生成・承認の後に内容を変更すると、記録は `draft` に戻ります（承認した内容と公開する内容を一致させるため）。
