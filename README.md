# Site Management Hub

サイト、スプレッドシート、ドキュメントを管理する個人・共有ポータルです。

## Data

- 個人データ: ブラウザの localStorage に保存
- 共有データ: Notion DB から読み込み、共有モードで追加したものは Notion DB に保存

## Vercel Environment Variables

共有データを使うには Vercel 側に以下を設定してください。

```txt
NOTION_TOKEN=...
NOTION_DATA_SOURCE_ID=db87f784-5f06-4e23-b007-ae71837066b6
```

`NOTION_TOKEN` は GitHub にコミットしません。

## Local Preview

```bash
npm run dev
```

Then open `http://127.0.0.1:4173/`.
