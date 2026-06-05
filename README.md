# Site Management Hub

サイト、スプレッドシート、ドキュメントを管理する個人・共有ポータルです。

## Pages

- `/` / `index.html`: 入口管理ハブ
- `/progress.html`: GitHub、Vercel、Notion、Codex作業要点をまとめた進捗ダッシュボード

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

## Local Preview

```bash
npm run dev
```

Then open `http://127.0.0.1:4173/`.
