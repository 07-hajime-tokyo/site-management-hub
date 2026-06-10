# Site Management Hub

サイト、スプレッドシート、ドキュメントを管理する個人・共有ポータルです。

## Pages

- `/` / `index.html`: 入口管理ハブ
- `/progress.html`: GitHub、Vercel、Notion、Codex作業要点をまとめた進捗ダッシュボード
- `/ebay-research.html`: eBayリサーチ判定ビュー。Sheets接続時は既存Activeマスターとの重複チェックも表示
- `/ebay-listing-prep.html`: 目視判断◯の商品を出品準備キュー化し、Sellsta下書き保存まで進める作業ビュー

## Data

- 個人データ: ブラウザの localStorage に保存
- 共有データ: Notion DB から読み込み、共有モードで追加したものは Notion DB に保存
- 進捗データ: `data/progress-seed.json` と GitHub commit history を `/api/progress` で集約

## Vercel Environment Variables

共有データを使うには Vercel 側に以下を設定してください。

```txt
NOTION_TOKEN=...
NOTION_DATA_SOURCE_ID=db87f784-5f06-4e23-b007-ae71837066b6
```

`NOTION_TOKEN` は GitHub にコミットしません。

進捗メモをサイトから直接GitHub Issueとして保存する場合だけ、Vercel側に以下を追加します。

```txt
GITHUB_TOKEN=...
PROGRESS_MEMO_REPOSITORY=07-hajime-tokyo/site-management-hub
```

`GITHUB_TOKEN` が未設定でも、進捗メモフォームはGitHub Issue作成URLを返します。

eBay出品準備ビューでGoogle Sheetsを読み書きする場合は、Vercel側にサービスアカウントの認証情報を設定します。認証情報JSON、Cookie、APIキー、注文やバイヤー個人情報はGitHubに保存しません。

```txt
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
LISTING_QUEUE_SPREADSHEET_ID=1qUnfHVKsyYtUCpnXfHGX-H5RSehFVL-_JDvH0CfLBWU
LISTING_QUEUE_SHEET_NAME=出品前チェック
LISTING_SOURCES_SHEET_NAME=出品ソース管理
LISTING_ACTIVE_SHEET_NAME=既存Activeマスター
```

`GOOGLE_SERVICE_ACCOUNT_JSON` または `GOOGLE_SERVICE_ACCOUNT_JSON_B64` でも設定できます。サービスアカウントには対象Google Sheetsの編集権限を付与してください。

## Local Preview

```bash
npm run dev
```

Then open `http://127.0.0.1:4173/`.
