# Codex Operational Rules

このリポジトリでCodexが作業する時の運用ルールです。

## Account And Browser Rules

- Google Drive、Google Sheets、Chrome操作は原則として `07hajime` / `07.hajime.tokyo@gmail.com` 側で行う。`01murakami` 側で操作しない。
- Vercel操作も原則として `07hajime` 側で行う。`site-management-hub` の本番は `hajime-s-projects-9906072f/site-management-hub`。
- Vercelデプロイ前に必ず `npm run verify:vercel` を実行し、ローカル `.vercel/project.json` が次を指していることを確認する。
  - `projectId`: `prj_Derah8fqdDbu5kOH6tZvA0TOSjuy`
  - `orgId`: `team_6dUXI0G0s5EUoy9iHG8519vn`
- `01murakami-gmailcoms-projects/site-management-hub` へはデプロイしない。もし `.vercel/project.json` が `prj_4jRhxpwXwmgQq6w1dAaNR4qFzMAR` または `team_f0AOCz8FSnsWppOjxf58qMU8` を指していたら、作業を止めて以下で張り直す。

```powershell
vercel link --yes --project site-management-hub --scope hajime-s-projects-9906072f
```

## Deployment

- 本番デプロイは直接 `vercel deploy --prod` を打たず、原則として次を使う。

```powershell
npm run deploy:prod
```

- デプロイ後は `https://site-management-hub.vercel.app/` 側で反映確認する。Preview URLだけで完了扱いにしない。
