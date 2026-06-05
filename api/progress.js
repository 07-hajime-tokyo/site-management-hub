const seedData = require("../data/progress-seed.json");

const dataSourceNotionVersion = "2025-09-03";
const githubApiBase = "https://api.github.com";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const seed = await loadSeed();
    const [github, notion] = await Promise.all([
      loadGitHubProgress(seed),
      loadNotionOverview(seed),
    ]);

    const commits = github.commits || [];
    const features = enrichFeatures(seed.features || [], commits);
    const commitEvents = commits.map((commit) => ({
      id: `commit-${commit.sha}`,
      date: commit.date,
      type: "commit",
      title: commit.message,
      featureIds: commit.featureIds,
      summary: commit.message,
      sourceRef: commit.url,
      sha: commit.sha,
      url: commit.url,
    }));

    const events = [...(seed.events || []), ...commitEvents].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || "")),
    );

    res.status(200).json({
      generatedAt: new Date().toISOString(),
      repository: seed.repository,
      vercel: {
        ...seed.vercel,
        configured: Boolean(process.env.VERCEL || process.env.VERCEL_URL),
      },
      notion,
      github,
      features,
      events,
      sources: seed.sources || [],
      sessions: seed.sessions || [],
      roadmap: seed.roadmap || [],
      summaries: buildSummaries(features, events, github, notion),
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "進捗データを読み込めませんでした。",
    });
  }
};

async function loadSeed() {
  return seedData;
}

async function loadGitHubProgress(seed) {
  const fullName = process.env.GITHUB_REPOSITORY || seed.repository?.fullName || "";
  if (!fullName.includes("/")) {
    return { configured: false, commits: [], error: "GitHub repository is not configured." };
  }

  const headers = createGitHubHeaders();
  try {
    const [repo, commits] = await Promise.all([
      githubJson(`/repos/${fullName}`, headers),
      githubJson(`/repos/${fullName}/commits?per_page=80`, headers),
    ]);

    return {
      configured: true,
      repository: {
        fullName,
        url: repo.html_url,
        private: Boolean(repo.private),
        defaultBranch: repo.default_branch,
        pushedAt: repo.pushed_at,
        description: repo.description || "",
      },
      commits: (Array.isArray(commits) ? commits : []).map(mapCommit),
    };
  } catch (error) {
    return {
      configured: false,
      repository: { fullName },
      commits: [],
      error:
        error instanceof Error
          ? error.message
          : "GitHub commits could not be loaded.",
    };
  }
}

function createGitHubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubJson(path, headers) {
  const response = await fetch(`${githubApiBase}${path}`, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "GitHub API error");
  }
  return payload;
}

function mapCommit(commit) {
  const message = String(commit.commit?.message || "").split("\n")[0] || "Untitled commit";
  const featureIds = inferCommitFeatureIds(message);
  return {
    sha: String(commit.sha || "").slice(0, 7),
    fullSha: commit.sha,
    message,
    date: commit.commit?.author?.date || commit.commit?.committer?.date || "",
    author: commit.commit?.author?.name || "",
    url: commit.html_url,
    featureIds,
  };
}

function inferCommitFeatureIds(message) {
  const lower = message.toLowerCase();
  const scoped = lower.match(/^[a-z]+(?:-[a-z]+)?\(([^)]+)\):/);
  if (scoped?.[1]) return [scoped[1].trim()];
  if (lower.includes("progress") || lower.includes("dashboard")) return ["progress-dashboard"];
  if (lower.includes("notion") || lower.includes("shared") || lower.includes("platform")) {
    return ["notion-shared-data"];
  }
  if (lower.includes("exchange") || lower.includes("usd") || lower.includes("jpy")) {
    return ["exchange-rates"];
  }
  if (
    lower.includes("shortcut") ||
    lower.includes("ninja") ||
    lower.includes("chatwork") ||
    lower.includes("ebay") ||
    lower.includes("sellsta")
  ) {
    return ["shortcut-rail"];
  }
  return ["site-management-hub"];
}

async function loadNotionOverview(seed) {
  const token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
  const dataSourceId =
    process.env.NOTION_DATA_SOURCE_ID ||
    seed.notion?.dataSourceId ||
    process.env.NOTION_DATABASE_ID;

  const base = {
    ...seed.notion,
    configured: Boolean(token && dataSourceId),
    records: [],
    counts: {},
    properties: [],
  };

  if (!token || !dataSourceId) {
    return {
      ...base,
      error: "NOTION_TOKEN と NOTION_DATA_SOURCE_ID が未設定です。",
    };
  }

  try {
    const [schema, pages] = await Promise.all([
      notionJson(`https://api.notion.com/v1/data_sources/${dataSourceId}`, token),
      queryNotionDataSource(token, dataSourceId),
    ]);
    const records = pages.map(mapNotionPage).filter(Boolean);
    return {
      ...base,
      title: schema.title?.map((part) => part.plain_text || "").join("") || base.title,
      properties: Object.entries(schema.properties || {}).map(([name, prop]) => ({
        name,
        type: prop.type,
        options: readNotionOptions(prop),
      })),
      records,
      counts: {
        total: records.length,
        site: records.filter((record) => record.type === "サイト").length,
        sheet: records.filter((record) => record.type === "スプレッドシート").length,
        review: records.filter((record) => record.status === "要確認").length,
        pinned: records.filter((record) => record.pinned).length,
      },
      categories: [...new Set(records.map((record) => record.category).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "ja"),
      ),
    };
  } catch (error) {
    return {
      ...base,
      error:
        error instanceof Error
          ? error.message
          : "Notion overview could not be loaded.",
    };
  }
}

async function queryNotionDataSource(token, dataSourceId) {
  const results = [];
  let startCursor;

  do {
    const response = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": dataSourceNotionVersion,
      },
      body: JSON.stringify({
        page_size: 100,
        ...(startCursor ? { start_cursor: startCursor } : {}),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Notion API error");
    results.push(...(payload.results || []).filter((item) => item.object === "page"));
    startCursor = payload.has_more ? payload.next_cursor : undefined;
  } while (startCursor);

  return results;
}

async function notionJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": dataSourceNotionVersion,
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Notion API error");
  return payload;
}

function readNotionOptions(prop) {
  const source = prop.select || prop.status || prop.multi_select;
  return Array.isArray(source?.options) ? source.options.map((option) => option.name) : [];
}

function mapNotionPage(page) {
  const props = page.properties || {};
  const visibility = readProperty(props, ["公開範囲", "公開", "Visibility", "Scope"]);
  if (visibility && !["共有", "公開", "shared", "public"].includes(String(visibility).toLowerCase())) {
    return null;
  }

  const title = readProperty(props, ["名前", "Name", "タイトル", "Title"]) || "無題";
  const url = readProperty(props, ["URL", "Url", "リンク", "Link"]);
  if (!url) return null;
  return {
    id: page.id,
    title,
    url,
    repositoryUrl: readProperty(props, ["リポジトリURL", "Repository URL", "Repo URL"]) || "",
    vercelUrl: readProperty(props, ["Vercel URL", "Vercel", "Deployment URL"]) || "",
    notionUrl: readProperty(props, ["Notion URL", "Notion", "Notion Page URL"]) || "",
    category: readProperty(props, ["カテゴリー", "カテゴリ", "Category"]) || "未分類",
    type: readProperty(props, ["種類", "Type"]) || "サイト",
    status: readProperty(props, ["状態", "Status"]) || "稼働中",
    visibility: visibility || "",
    pinned: Boolean(readProperty(props, ["固定", "Pinned", "Pin"])),
    createdAt: page.created_time || "",
  };
}

function readProperty(props, names) {
  const prop = names.map((name) => props[name]).find(Boolean);
  if (!prop) return "";
  if (prop.type === "title") return richTextToPlain(prop.title);
  if (prop.type === "rich_text") return richTextToPlain(prop.rich_text);
  if (prop.type === "url") return prop.url || "";
  if (prop.type === "select") return prop.select?.name || "";
  if (prop.type === "status") return prop.status?.name || "";
  if (prop.type === "checkbox") return prop.checkbox;
  if (prop.type === "number") return prop.number;
  if (prop.type === "multi_select") return prop.multi_select?.map((item) => item.name).join(", ") || "";
  return "";
}

function richTextToPlain(parts = []) {
  return parts.map((part) => part.plain_text || "").join("");
}

function enrichFeatures(features, commits) {
  return features.map((feature) => {
    const relatedCommits = commits.filter((commit) => commit.featureIds.includes(feature.id));
    const newestCommit = relatedCommits[0]?.date;
    return {
      ...feature,
      commitCount: relatedCommits.length,
      commits: relatedCommits,
      updatedAt: newestCommit ? newestCommit.slice(0, 10) : feature.updatedAt,
    };
  });
}

function buildSummaries(features, events, github, notion) {
  const activeFeatures = features.filter((feature) => feature.status === "active").length;
  const buildingFeatures = features.filter((feature) => feature.status === "building").length;
  return {
    featureCount: features.length,
    activeFeatures,
    buildingFeatures,
    plannedFeatures: features.length - activeFeatures - buildingFeatures,
    commitCount: github.commits?.length || 0,
    eventCount: events.length,
    notionRecordCount: notion.counts?.total || 0,
    lastCommitAt: github.commits?.[0]?.date || "",
    lastEventAt: events[0]?.date || "",
  };
}
