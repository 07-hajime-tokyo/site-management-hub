import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const dataSourceNotionVersion = "2025-09-03";
const databaseNotionVersion = "2022-06-28";
const platformLabelOptions = ["01mur", "07haj", "talk"];
const platformLabelSchemaOptions = [
  { name: "01mur", color: "blue" },
  { name: "07haj", color: "green" },
  { name: "talk", color: "purple" },
];

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${host}:${port}`);

    if (url.pathname === "/api/shared-tools") {
      await handleSharedTools(req, res);
      return;
    }

    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const target = normalize(join(root, decodeURIComponent(pathname)));

    if (!target.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const body = await readFile(target);
    res.writeHead(200, {
      "Content-Type": mimeTypes[extname(target)] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, host, () => {
  console.log(`Portal preview: http://${host}:${port}/`);
});

async function handleSharedTools(req, res) {
  if (req.method && !["GET", "POST", "PUT"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, POST, PUT" });
    res.end("Method not allowed");
    return;
  }

  const token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  const databaseId = process.env.NOTION_LINKS_DATABASE_ID || process.env.NOTION_DATABASE_ID;

  if (!token || (!dataSourceId && !databaseId)) {
    if (req.method === "POST" || req.method === "PUT") {
      sendJson(res, 500, {
        configured: false,
        error:
          "NOTION_TOKEN と NOTION_DATA_SOURCE_ID または NOTION_LINKS_DATABASE_ID を設定してください。",
      });
      return;
    }
    sendJson(res, 200, {
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
      const tool = normalizeIncomingTool(await readJsonBody(req));
      await ensureNotionSchema(token, source);
      const page = await createNotionToolPage(token, source, tool);
      sendJson(res, 201, {
        configured: true,
        sourceType: source.type,
        tool: mapNotionPageToTool(page),
      });
    } catch (error) {
      sendJson(res, 500, {
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
      const body = await readJsonBody(req);
      const pageId = normalizeNotionPageId(body.id || body.pageId);
      const tool = normalizeIncomingTool(body);
      await ensureNotionSchema(token, source);
      const page = await updateNotionToolPage(token, source, pageId, tool);
      sendJson(res, 200, {
        configured: true,
        sourceType: source.type,
        tool: mapNotionPageToTool(page),
      });
    } catch (error) {
      sendJson(res, 500, {
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
    sendJson(res, 200, {
      configured: true,
      sourceType: source.type,
      tools: pages.map(mapNotionPageToTool).filter(Boolean),
    });
  } catch (error) {
    sendJson(res, 500, {
      configured: true,
      tools: [],
      error:
        error instanceof Error
          ? error.message
          : "Notion共有データを読み込めませんでした。",
    });
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

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

async function ensureNotionSchema(token, source) {
  const endpoint =
    source.type === "data_source"
      ? `https://api.notion.com/v1/data_sources/${source.id}`
      : `https://api.notion.com/v1/databases/${source.id}`;
  const notionVersion =
    source.type === "data_source" ? dataSourceNotionVersion : databaseNotionVersion;
  const currentResponse = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": notionVersion,
    },
  });
  const current = await currentResponse.json();
  if (!currentResponse.ok) {
    throw new Error(current.message || "Notion DBの設定を確認できませんでした");
  }

  const updates = {};
  const properties = current.properties || {};
  if (!properties["Notion URL"]) {
    updates["Notion URL"] = { url: {} };
  }
  if (!properties["TiDB URL"]) {
    updates["TiDB URL"] = { url: {} };
  }

  const displayNameProperty = properties.表示名;
  if (!displayNameProperty) {
    updates.表示名 = { select: { options: platformLabelSchemaOptions } };
  } else if (displayNameProperty.type === "select") {
    const existingOptions = displayNameProperty.select?.options || [];
    const existingNames = new Set(existingOptions.map((option) => option.name));
    const missingOptions = platformLabelSchemaOptions.filter((option) => !existingNames.has(option.name));
    if (missingOptions.length) {
      updates.表示名 = {
        select: {
          options: [
            ...existingOptions.map((option) => ({
              name: option.name,
              color: option.color || "default",
            })),
            ...missingOptions,
          ],
        },
      };
    }
  }

  if (!Object.keys(updates).length) return;

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": notionVersion,
    },
    body: JSON.stringify({ properties: updates }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || "Notion DBの列を追加できませんでした");
  }
}

function createNotionProperties(tool) {
  const properties = {
    名前: {
      title: [{ text: { content: tool.title } }],
    },
    URL: {
      url: tool.url,
    },
    表示名: {
      select: { name: normalizePlatformLabel(tool.platformLabel, tool) },
    },
    リポジトリURL: {
      url: tool.repositoryUrl || null,
    },
    "Vercel URL": {
      url: tool.vercelUrl || null,
    },
    "TiDB URL": {
      url: tool.tidbUrl || null,
    },
    "Notion URL": {
      url: tool.notionUrl || null,
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
    公開範囲: {
      select: { name: "共有" },
    },
  };

  if (Object.hasOwn(tool, "pinned")) {
    properties.固定 = {
      checkbox: Boolean(tool.pinned),
    };
  }

  if (Object.hasOwn(tool, "displayOrder")) {
    properties.表示順 = {
      number: Number.isFinite(tool.displayOrder) ? tool.displayOrder : null,
    };
  }

  if (Object.hasOwn(tool, "cardOrder")) {
    properties.カード表示順 = {
      number: Number.isFinite(tool.cardOrder) ? tool.cardOrder : null,
    };
  }

  return properties;
}

function normalizeIncomingTool(body) {
  const title = String(body.title || "").trim();
  const url = String(body.url || "").trim();
  const platformLabel = String(body.platformLabel || body.displayName || "").trim();
  const repositoryUrl = String(body.repositoryUrl || body.repoUrl || "").trim();
  const vercelUrl = String(body.vercelUrl || "").trim();
  const tidbUrl = String(body.tidbUrl || body.tidbCloudUrl || "").trim();
  const notionUrl = String(body.notionUrl || body.notionPageUrl || "").trim();
  if (!title) throw new Error("名前を入力してください");
  if (!url) throw new Error("URLを入力してください");
  try {
    new URL(url);
  } catch {
    throw new Error("URLの形式が正しくありません");
  }
  if (repositoryUrl) {
    try {
      new URL(repositoryUrl);
    } catch {
      throw new Error("リポジトリURLの形式が正しくありません");
    }
  }
  if (vercelUrl) {
    try {
      new URL(vercelUrl);
    } catch {
      throw new Error("Vercel URLの形式が正しくありません");
    }
  }
  if (tidbUrl) {
    try {
      new URL(tidbUrl);
    } catch {
      throw new Error("TiDB URLの形式が正しくありません");
    }
  }
  if (notionUrl) {
    try {
      new URL(notionUrl);
    } catch {
      throw new Error("Notion URLの形式が正しくありません");
    }
  }

  const type = normalizeType(body.type || "site");
  const tool = {
    title,
    url,
    platformLabel: normalizePlatformLabel(platformLabel, { title, url, repositoryUrl, vercelUrl }),
    repositoryUrl,
    vercelUrl,
    tidbUrl,
    notionUrl,
    category: normalizeCategory(body.category, type),
    type,
    status: normalizeStatus(body.status || "active"),
    description: String(body.description || "").trim(),
  };

  if (Object.hasOwn(body, "pinned")) {
    tool.pinned = Boolean(body.pinned);
  }

  if (Object.hasOwn(body, "displayOrder")) {
    tool.displayOrder = normalizeDisplayOrder(body.displayOrder);
  }

  if (Object.hasOwn(body, "cardOrder")) {
    tool.cardOrder = normalizeCardOrder(body.cardOrder);
  }

  return tool;
}

function normalizeCategory(value, type = "") {
  const fallback = type === "sheet" ? "税理士" : "その他";
  const category = String(value || fallback).trim() || fallback;
  if (type === "sheet" && category === "未分類") return "税理士";
  if (["コミュニケーション", "市場調査", "取引管理", "申請・見積もり", "申請見積もり"].includes(category)) {
    return "共有";
  }
  if (category === "OEM・輸入") return "中国輸入";
  return category;
}

function normalizePlatformLabel(value, tool = {}) {
  const label = String(value || "").trim();
  if (platformLabelOptions.includes(label)) return label;
  return inferPlatformLabel(tool);
}

function inferPlatformLabel(tool = {}) {
  const repositoryUrl = String(tool.repositoryUrl || "").trim();
  try {
    const url = new URL(repositoryUrl);
    const owner = url.pathname.split("/").filter(Boolean)[0] || "";
    if (owner.toLowerCase() === "hajime-tokyo-1213") return "01mur";
    if (owner.toLowerCase() === "07-hajime-tokyo") return "07haj";
  } catch {
    // Optional URL. Fall through to the title rule.
  }
  const title = String(tool.title || "");
  if (title.includes("チームワークスペース") || title.includes("チームワーク")) return "01mur";
  return "07haj";
}

function normalizeDisplayOrder(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeCardOrder(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
  if (visibility && !["共有", "公開", "shared", "public"].includes(String(visibility).toLowerCase())) {
    return null;
  }

  const title = readProperty(props, ["名前", "Name", "タイトル", "Title"]) || "無題";
  const url = readProperty(props, ["URL", "Url", "リンク", "Link"]);
  if (!url) return null;
  const type = normalizeType(readProperty(props, ["種類", "Type"]) || "site");
  const category = normalizeCategory(
    readProperty(props, ["カテゴリ", "カテゴリー", "Category"]) || (type === "sheet" ? "税理士" : "未分類"),
    type,
  );
  const repositoryUrl =
    readProperty(props, [
      "リポジトリURL",
      "Repository URL",
      "Repo URL",
      "GitHub",
      "Github",
      "Repository",
    ]) || "";
  const vercelUrl = readProperty(props, ["Vercel URL", "Vercel", "Deployment URL"]) || "";
  const tidbUrl = readProperty(props, ["TiDB URL", "TiDB", "TiDB Cloud URL"]) || "";
  const notionUrl = readProperty(props, ["Notion URL", "Notion", "Notion Page URL"]) || "";

  return {
    id: `notion-${page.id}`,
    title,
    url,
    platformLabel: normalizePlatformLabel(readProperty(props, ["表示名", "Display Name", "Account Label"]), {
      title,
      url,
      repositoryUrl,
      vercelUrl,
    }),
    repositoryUrl,
    vercelUrl,
    tidbUrl,
    notionUrl,
    category,
    type,
    status: normalizeStatus(readProperty(props, ["状態", "Status"]) || "active"),
    description: readProperty(props, ["説明", "Description", "メモ", "Memo"]) || "",
    displayOrder: normalizeDisplayOrder(readProperty(props, ["表示順", "Order", "Sort"])),
    cardOrder: normalizeCardOrder(readProperty(props, ["カード表示順", "Card Order", "Card Sort"])),
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
  if (prop.type === "number") return prop.number;
  if (prop.type === "multi_select") return prop.multi_select?.map((item) => item.name).join(", ") || "";
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
  if (["スプレッドシート", "sheet", "sheets", "spreadsheet"].includes(type)) return "sheet";
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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}
