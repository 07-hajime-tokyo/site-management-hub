const dataSourceNotionVersion = "2025-09-03";
const databaseNotionVersion = "2022-06-28";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && !["GET", "POST", "PUT"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PUT");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  const databaseId = process.env.NOTION_LINKS_DATABASE_ID || process.env.NOTION_DATABASE_ID;

  if (!token || (!dataSourceId && !databaseId)) {
    if (req.method === "POST" || req.method === "PUT") {
      res.status(500).json({
        configured: false,
        error:
          "NOTION_TOKEN と NOTION_DATA_SOURCE_ID または NOTION_LINKS_DATABASE_ID を設定してください。",
      });
      return;
    }
    res.status(200).json({
      configured: false,
      tools: [],
      message:
        "NOTION_TOKEN と NOTION_DATA_SOURCE_ID または NOTION_LINKS_DATABASE_ID を設定してください。",
    });
    return;
  }

  const source = dataSourceId
    ? { id: dataSourceId, type: "data_source" }
    : { id: databaseId, type: "database" };

  if (req.method === "POST") {
    try {
      const tool = normalizeIncomingTool(req.body || {});
      const page = await createNotionToolPage(token, source, tool);
      res.status(201).json({
        configured: true,
        sourceType: source.type,
        tool: mapNotionPageToTool(page),
      });
    } catch (error) {
      res.status(500).json({
        configured: true,
        error:
          error instanceof Error
            ? error.message
            : "Notion DBに保存できませんでした。",
      });
    }
    return;
  }

  if (req.method === "PUT") {
    try {
      const pageId = normalizeNotionPageId(req.body?.id || req.body?.pageId);
      const tool = normalizeIncomingTool(req.body || {});
      const page = await updateNotionToolPage(token, source, pageId, tool);
      res.status(200).json({
        configured: true,
        sourceType: source.type,
        tool: mapNotionPageToTool(page),
      });
    } catch (error) {
      res.status(500).json({
        configured: true,
        error:
          error instanceof Error
            ? error.message
            : "Notion DBを更新できませんでした。",
      });
    }
    return;
  }

  try {
    const pages = await queryNotionCollection(token, source);
    res.status(200).json({
      configured: true,
      sourceType: source.type,
      tools: pages.map(mapNotionPageToTool).filter(Boolean),
    });
  } catch (error) {
    res.status(500).json({
      configured: true,
      tools: [],
      error:
        error instanceof Error
          ? error.message
          : "Notion共有データを読み込めませんでした。",
    });
  }
};

async function createNotionToolPage(token, source, tool) {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version":
        source.type === "data_source" ? dataSourceNotionVersion : databaseNotionVersion,
    },
    body: JSON.stringify({
      parent:
        source.type === "data_source"
          ? { type: "data_source_id", data_source_id: source.id }
          : { type: "database_id", database_id: source.id },
      properties: createNotionProperties(tool),
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Notion DBに保存できませんでした");
  }
  return payload;
}

async function updateNotionToolPage(token, source, pageId, tool) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version":
        source.type === "data_source" ? dataSourceNotionVersion : databaseNotionVersion,
    },
    body: JSON.stringify({
      properties: createNotionProperties(tool),
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Notion DBを更新できませんでした");
  }
  return payload;
}

function createNotionProperties(tool) {
  return {
    名前: {
      title: [{ text: { content: tool.title } }],
    },
    URL: {
      url: tool.url,
    },
    種類: {
      select: { name: toNotionType(tool.type) },
    },
    カテゴリー: {
      select: { name: tool.category || "その他" },
    },
    状態: {
      select: { name: toNotionStatus(tool.status) },
    },
    説明: {
      rich_text: tool.description
        ? [{ text: { content: tool.description.slice(0, 2000) } }]
        : [],
    },
    固定: {
      checkbox: Boolean(tool.pinned),
    },
    公開範囲: {
      select: { name: "共有" },
    },
  };
}

function normalizeIncomingTool(body) {
  const title = String(body.title || "").trim();
  const url = String(body.url || "").trim();
  if (!title) throw new Error("名前を入力してください");
  if (!url) throw new Error("URLを入力してください");
  try {
    new URL(url);
  } catch {
    throw new Error("URLの形式が正しくありません");
  }

  return {
    title,
    url,
    category: String(body.category || "その他").trim() || "その他",
    type: normalizeType(body.type || "site"),
    status: normalizeStatus(body.status || "active"),
    description: String(body.description || "").trim(),
    pinned: Boolean(body.pinned),
  };
}

function normalizeNotionPageId(value) {
  const pageId = String(value || "")
    .replace(/^notion-/, "")
    .trim();
  if (!/^[0-9a-f-]{32,36}$/i.test(pageId)) {
    throw new Error("更新対象のNotionページが見つかりません");
  }
  return pageId;
}

async function queryNotionCollection(token, source) {
  const pages = [];
  let startCursor;
  const endpoint =
    source.type === "data_source"
      ? `https://api.notion.com/v1/data_sources/${source.id}/query`
      : `https://api.notion.com/v1/databases/${source.id}/query`;

  do {
    const body = {
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version":
          source.type === "data_source" ? dataSourceNotionVersion : databaseNotionVersion,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "Notion API error");
    }
    pages.push(...(payload.results || []).filter((item) => item.object === "page"));
    startCursor = payload.has_more ? payload.next_cursor : undefined;
  } while (startCursor);

  return pages;
}

function mapNotionPageToTool(page) {
  const props = page.properties || {};
  const visibility = readProperty(props, ["公開範囲", "公開", "Visibility", "Scope"]);
  const normalizedVisibility = String(visibility || "").toLowerCase();
  if (
    visibility &&
    !["共有", "公開", "shared", "public"].includes(normalizedVisibility)
  ) {
    return null;
  }

  const title = readProperty(props, ["名前", "Name", "タイトル", "Title"]) || "無題";
  const url = readProperty(props, ["URL", "Url", "リンク", "Link"]);
  if (!url) return null;

  return {
    id: `notion-${page.id}`,
    title,
    url,
    category: readProperty(props, ["カテゴリ", "カテゴリー", "Category"]) || "未分類",
    type: normalizeType(readProperty(props, ["種類", "Type"]) || "site"),
    status: normalizeStatus(readProperty(props, ["状態", "Status"]) || "active"),
    description: readProperty(props, ["説明", "Description", "メモ", "Memo"]) || "",
    tags: [],
    pinned: Boolean(readProperty(props, ["固定", "Pinned", "Pin"])),
    createdAt: page.created_time || new Date().toISOString(),
    lastOpenedAt: "",
    openCount: 0,
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
  if (prop.type === "multi_select") {
    return prop.multi_select?.map((item) => item.name).join(", ") || "";
  }
  if (prop.type === "formula") return readFormula(prop.formula);
  return "";
}

function richTextToPlain(parts = []) {
  return parts.map((part) => part.plain_text || "").join("");
}

function readFormula(formula) {
  if (!formula) return "";
  if (formula.type === "string") return formula.string || "";
  if (formula.type === "boolean") return formula.boolean;
  if (formula.type === "number") return String(formula.number ?? "");
  return "";
}

function normalizeType(value) {
  const type = String(value).toLowerCase();
  if (["スプレッドシート", "sheet", "sheets", "spreadsheet"].includes(type)) {
    return "sheet";
  }
  if (["ドキュメント", "doc", "docs", "document"].includes(type)) return "doc";
  if (["レポート", "report"].includes(type)) return "report";
  return "site";
}

function toNotionType(value) {
  const type = normalizeType(value);
  const labels = {
    site: "サイト",
    sheet: "スプレッドシート",
    doc: "ドキュメント",
    report: "レポート",
  };
  return labels[type] || "サイト";
}

function normalizeStatus(value) {
  const status = String(value).toLowerCase();
  if (["要確認", "review"].includes(status)) return "review";
  if (["作成中", "draft"].includes(status)) return "draft";
  if (["保管", "archived", "archive"].includes(status)) return "archived";
  return "active";
}

function toNotionStatus(value) {
  const status = normalizeStatus(value);
  const labels = {
    active: "稼働中",
    review: "要確認",
    draft: "作成中",
    archived: "保管",
  };
  return labels[status] || "稼働中";
}
