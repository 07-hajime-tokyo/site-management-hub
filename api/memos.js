const defaultRepo = "07-hajime-tokyo/site-management-hub";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = req.body || {};
    const memo = normalizeMemo(body);
    const repo = process.env.PROGRESS_MEMO_REPOSITORY || process.env.GITHUB_REPOSITORY || defaultRepo;
    const issue = buildIssuePayload(memo);
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

    if (!token) {
      res.status(200).json({
        configured: false,
        issueUrl: createIssueUrl(repo, issue),
        message: "GITHUB_TOKEN が未設定なので、GitHub Issue作成URLを返しました。",
      });
      return;
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(issue),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "GitHub Issueを作成できませんでした");
    }

    res.status(201).json({
      configured: true,
      issueUrl: payload.html_url,
      issueNumber: payload.number,
      message: "GitHub Issueに保存しました。",
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "進捗メモを保存できませんでした。",
    });
  }
};

function normalizeMemo(body) {
  const title = String(body.title || "").trim();
  const note = String(body.note || body.body || "").trim();
  const featureId = String(body.featureId || "").trim();
  const sourceUrl = String(body.sourceUrl || "").trim();

  if (!title) throw new Error("タイトルを入力してください");
  if (!note) throw new Error("メモ本文を入力してください");
  if (sourceUrl) {
    try {
      new URL(sourceUrl);
    } catch {
      throw new Error("参照URLの形式が正しくありません");
    }
  }

  return {
    title,
    note,
    featureId,
    sourceUrl,
    createdAt: new Date().toISOString(),
  };
}

function buildIssuePayload(memo) {
  const lines = [
    `Feature: ${memo.featureId || "未指定"}`,
    `Created: ${memo.createdAt}`,
    memo.sourceUrl ? `Source: ${memo.sourceUrl}` : "",
    "",
    "## Memo",
    memo.note,
    "",
    "## Next",
    "- [ ] 進捗ダッシュボードに反映する",
  ].filter((line) => line !== "");

  return {
    title: `[進捗メモ] ${memo.title}`,
    body: lines.join("\n"),
  };
}

function createIssueUrl(repo, issue) {
  const params = new URLSearchParams({
    title: issue.title,
    body: issue.body,
  });
  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}
