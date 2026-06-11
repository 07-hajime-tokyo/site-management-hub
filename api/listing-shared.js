const {
  batchUpdateValues,
  ensureHeaders,
  extractSpreadsheetId,
  quoteSheetName,
  readSheetRows,
} = require("./google-sheets");

const DEFAULT_QUEUE_SPREADSHEET_ID = "1qUnfHVKsyYtUCpnXfHGX-H5RSehFVL-_JDvH0CfLBWU";
const QUEUE_HEADERS = [
  "チェックID",
  "確認日",
  "担当",
  "候補タイトル",
  "eBay Item ID/URL",
  "仕入URL",
  "ブランド",
  "型番/商品KW",
  "状態",
  "予定価格USD",
  "判定",
  "既存Item ID",
  "一致タイプ",
  "既存タイトル",
  "既存URL",
  "推奨アクション",
  "作業ステータス",
  "確認メモ",
  "正規化候補",
  "抽出Item ID",
  "sourceId",
  "sourceRow",
  "sellerName",
  "Sellsta listing ID",
  "Sellsta URL",
  "下書き保存日時",
  "eBay厳密検索URL",
];
const SOURCE_HEADERS = [
  "sourceId",
  "sellerName",
  "researchSheetUrl",
  "sourceSheetName",
  "researchViewUrl",
  "enabled",
  "lastImportedAt",
  "notes",
];

function getListingConfig() {
  const queueSpreadsheetId =
    process.env.LISTING_QUEUE_SPREADSHEET_ID || DEFAULT_QUEUE_SPREADSHEET_ID;
  return {
    queueSpreadsheetId,
    queueSheetName: process.env.LISTING_QUEUE_SHEET_NAME || "出品前チェック",
    activeSheetName: process.env.LISTING_ACTIVE_SHEET_NAME || "既存Activeマスター",
    sourcesSpreadsheetId:
      process.env.LISTING_SOURCES_SPREADSHEET_ID || queueSpreadsheetId,
    sourcesSheetName: process.env.LISTING_SOURCES_SHEET_NAME || "出品ソース管理",
  };
}

async function readListingSources(config = getListingConfig()) {
  await ensureHeaders(config.sourcesSpreadsheetId, config.sourcesSheetName, SOURCE_HEADERS);
  const { rows } = await readSheetRows(
    config.sourcesSpreadsheetId,
    config.sourcesSheetName,
    "A:H",
  );
  return rows
    .map((row) => ({
      rowNumber: row.__rowNumber,
      sourceId: stringValue(row.sourceId),
      sellerName: stringValue(row.sellerName),
      researchSheetUrl: stringValue(row.researchSheetUrl),
      sourceSheetName: stringValue(row.sourceSheetName),
      researchViewUrl: stringValue(row.researchViewUrl),
      enabled: isEnabled(row.enabled),
      lastImportedAt: stringValue(row.lastImportedAt),
      notes: stringValue(row.notes),
    }))
    .filter((source) => source.sourceId || source.researchSheetUrl);
}

async function ensureQueueHeaders(config = getListingConfig()) {
  return ensureHeaders(config.queueSpreadsheetId, config.queueSheetName, QUEUE_HEADERS);
}

async function readQueue(config = getListingConfig()) {
  await ensureQueueHeaders(config);
  const { rows } = await readSheetRows(config.queueSpreadsheetId, config.queueSheetName, "A:AB");
  return rows.filter((row) => stringValue(row["候補タイトル"]) || stringValue(row.sourceId));
}

function mapQueueRow(row) {
  const existingItemId = stringValue(row["既存Item ID"]);
  const existingUrl =
    extractFirstUrl(row["既存URL"]) ||
    extractFirstUrl(row["eBay Item ID/URL"]) ||
    (existingItemId ? ebayItemUrl(existingItemId) : "");
  const rowNumber = row.__rowNumber;
  const sourceId = stringValue(row.sourceId);
  const sourceRow = stringValue(row.sourceRow);
  return {
    id: sourceId && sourceRow ? `${sourceId}:${sourceRow}` : `row-${rowNumber}`,
    rowNumber,
    checkId: stringValue(row["チェックID"]),
    checkedAt: stringValue(row["確認日"]),
    owner: stringValue(row["担当"]),
    title: stringValue(row["候補タイトル"]),
    ebayReference: stringValue(row["eBay Item ID/URL"]),
    supplierUrl: stringValue(row["仕入URL"]),
    brand: stringValue(row["ブランド"]),
    keyword: stringValue(row["型番/商品KW"]),
    condition: stringValue(row["状態"]),
    priceUsd: stringValue(row["予定価格USD"]),
    duplicateStatus: stringValue(row["判定"]) || "未判定",
    existingItemId,
    matchType: stringValue(row["一致タイプ"]),
    existingTitle: stringValue(row["既存タイトル"]),
    existingUrl,
    recommendedAction: stringValue(row["推奨アクション"]),
    workStatus: stringValue(row["作業ステータス"]) || "未着手",
    memo: stringValue(row["確認メモ"]),
    normalizedCandidate: stringValue(row["正規化候補"]),
    extractedItemId: stringValue(row["抽出Item ID"]),
    sourceId,
    sourceRow,
    sellerName: stringValue(row.sellerName),
    sellstaListingId: stringValue(row["Sellsta listing ID"]),
    sellstaUrl: stringValue(row["Sellsta URL"]),
    draftSavedAt: stringValue(row["下書き保存日時"]),
    exactSearchUrl: stringValue(row["eBay厳密検索URL"]),
  };
}

// ゴルフ用品: 表記ゆれの激しいスペック語（番手構成・本数・シャフト名・フレックス・利き手など）を
// 落とした「市場全体」検索キーワードを作る。ゴルフ以外の商品はそのまま返す。
const GOLF_INDICATORS = /\b(golf|irons?|driver|wedge|putter|fairway|hybrid|utility|wood)\b/i;
const GOLF_NOISE_TOKENS = new Set([
  "flex", "stiff", "regular", "senior", "ladies",
  "s", "r", "sr", "x", "l", "a",
  "right", "left", "hand", "handed", "rh", "lh",
  "used", "new", "mint",
  "japan", "japanese", "genuine",
  "graphite", "steel", "carbon", "shaft", "shafts",
  "fubuki", "tensei", "diamana", "speeder", "attas", "ventus",
  "modus", "zelos", "kbs", "nspro", "recoil", "tm6", "tm5",
]);

function buildEbayMarketKeyword(keyword) {
  const text = String(keyword || "").trim();
  if (!text || !GOLF_INDICATORS.test(text)) return text;
  const kept = text.split(/\s+/).filter((token) => {
    const plain = token.toLowerCase().replace(/[^a-z0-9+.-]/g, "");
    if (!plain) return false;
    if (GOLF_NOISE_TOKENS.has(plain.replace(/[+.-]/g, ""))) return false;
    if (/^\d{1,2}pcs?$/i.test(plain)) return false;
    if (/^\d{1,2}[-+]\d{0,2}(pw|aw|sw|gw|lw|uw|i|irons?)?$/i.test(plain)) return false;
    if (/^(pw|aw|sw|gw|lw)$/i.test(plain)) return false;
    return true;
  });
  return kept.join(" ") || text;
}

function ebaySearchUrl(keyword, condition) {
  const text = String(keyword || "").trim();
  if (!text) return "";
  const params = new URLSearchParams({ _nkw: text, LH_BIN: "1" });
  const conditionText = String(condition || "");
  if (/中古|used/i.test(conditionText)) params.set("LH_ItemCondition", "3000");
  else if (/新品|未使用|new/i.test(conditionText)) params.set("LH_ItemCondition", "1000|1500");
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

function sourceRowToQueuePatch(source, sourceRow) {
  const title = pick(sourceRow, [
    "商品名",
    "タイトル",
    "候補タイトル",
    "eBayタイトル",
    "出品タイトル",
    "title",
  ]);
  const keyword = pick(sourceRow, [
    "eBay検索KW",
    "型番/商品KW",
    "国内検索KW",
    "検索KW",
    "キーワード",
  ]);
  const priceUsd = pick(sourceRow, [
    "eBay売価(USD)",
    "eBay総額(USD)",
    "予定価格USD",
    "priceUSD",
    "売価USD",
  ]);
  const condition = pick(sourceRow, ["状態", "condition"]) || "未確認";
  const sheetEbayUrl = pick(sourceRow, [
    "競合出品URL",
    "eBay出品",
    "eBay URL",
    "eBayURL",
    "eBayリンク",
  ]);
  // 参考eBayは「市場全体」検索（ブランド+モデル+種別、状態フィルタ付き）。
  // 元の完全一致KW/シートのURLは日本スペック確認用として別列に残す。
  const ebayReference =
    ebaySearchUrl(buildEbayMarketKeyword(keyword || title), condition) || sheetEbayUrl;
  const exactSearchUrl = sheetEbayUrl || ebaySearchUrl(keyword, condition);
  const supplierUrl = firstUrl(
    [
      sourceRow["仕入URL"],
      sourceRow.Amazon,
      sourceRow["メルカリ"],
      sourceRow["Yahooオークション"],
      sourceRow["ヤフオク"],
      sourceRow["楽天"],
      sourceRow["国内URL"],
    ].filter(Boolean),
  );
  const memoBits = [
    pick(sourceRow, ["判定理由", "AIメモ", "メモ"]),
    pick(sourceRow, ["Sold30", "30日Sold", "販売数30日"])
      ? `Sold: ${pick(sourceRow, ["Sold30", "30日Sold", "販売数30日"])}`
      : "",
    source.researchViewUrl ? `判定ビュー: ${source.researchViewUrl}` : "",
  ].filter(Boolean);

  return {
    checkedAt: todayJst(),
    title,
    ebayReference,
    exactSearchUrl,
    supplierUrl,
    brand: pick(sourceRow, ["ブランド", "Brand", "brand"]),
    keyword,
    condition,
    priceUsd,
    workStatus: "未着手",
    memo: memoBits.join(" / "),
    sourceId: source.sourceId,
    sourceRow: String(sourceRow.__rowNumber),
    sellerName: source.sellerName,
  };
}

async function upsertQueueRow(config, source, sourceRow) {
  const patch = sourceRowToQueuePatch(source, sourceRow);
  if (!patch.title) {
    return { action: "skipped", reason: "title missing", rowNumber: sourceRow.__rowNumber };
  }

  const rows = await readQueue(config);
  const existing = rows.find(
    (row) =>
      stringValue(row.sourceId) === patch.sourceId &&
      String(row.sourceRow || "") === String(patch.sourceRow),
  );
  const rowNumber = existing?.__rowNumber || findAvailableQueueRow(rows);

  await batchUpdateValues(config.queueSpreadsheetId, [
    {
      range: `${quoteSheetName(config.queueSheetName)}!B${rowNumber}:J${rowNumber}`,
      values: [
        [
          patch.checkedAt,
          "",
          patch.title,
          patch.ebayReference,
          patch.supplierUrl,
          patch.brand,
          patch.keyword,
          patch.condition,
          patch.priceUsd,
        ],
      ],
    },
    {
      range: `${quoteSheetName(config.queueSheetName)}!Q${rowNumber}:R${rowNumber}`,
      values: [[existing ? stringValue(existing["作業ステータス"]) || patch.workStatus : patch.workStatus, patch.memo]],
    },
    {
      range: `${quoteSheetName(config.queueSheetName)}!U${rowNumber}:W${rowNumber}`,
      values: [[patch.sourceId, patch.sourceRow, patch.sellerName]],
    },
    {
      range: `${quoteSheetName(config.queueSheetName)}!AA${rowNumber}`,
      values: [[patch.exactSearchUrl]],
    },
  ]);

  return {
    action: existing ? "updated" : "inserted",
    rowNumber,
    title: patch.title,
    sourceId: patch.sourceId,
    sourceRow: patch.sourceRow,
  };
}

function findAvailableQueueRow(rows) {
  const occupied = new Set(
    rows
      .filter((row) => stringValue(row["候補タイトル"]) || stringValue(row.sourceId))
      .map((row) => row.__rowNumber),
  );
  for (let rowNumber = 2; rowNumber <= 1000; rowNumber += 1) {
    if (!occupied.has(rowNumber)) return rowNumber;
  }
  return 1001;
}

function computeDuplicateCheck(candidate, activeRows) {
  const candidateTitle = stringValue(candidate.title || candidate["候補タイトル"]);
  const candidateKeyword = stringValue(candidate.keyword || candidate.ebayKeyword);
  const candidateItemId = extractItemId(candidate.itemId || candidate.url || candidate.ebayReference);
  const normalizedCandidate =
    normalizeTitle(candidate.normalizedTitle || candidateTitle || candidateKeyword);
  const normalizedKeyword = normalizeTitle(candidateKeyword);

  if (!normalizedCandidate && !normalizedKeyword && !candidateItemId) {
    return {
      status: "未照合",
      matchType: "",
      itemId: "",
      title: "",
      url: "",
      note: "比較用タイトルまたはキーワードがありません。",
    };
  }

  const active = activeRows.map((row) => ({
    itemId: stringValue(row.itemId || row["Item ID"] || row["eBay Item ID"]),
    title: stringValue(row.title || row["タイトル"]),
    normalizedTitle: normalizeTitle(row.normalizedTitle || row.title || row["タイトル"]),
    url: stringValue(row.url || row["URL"]),
  }));

  const itemMatch = active.find((row) => row.itemId && row.itemId === candidateItemId);
  if (itemMatch) return duplicateResult("重複あり", "Item ID一致", itemMatch);

  const exactMatch = active.find(
    (row) => row.normalizedTitle && row.normalizedTitle === normalizedCandidate,
  );
  if (exactMatch) return duplicateResult("重複あり", "タイトル完全一致", exactMatch);

  const tokenMatch = active
    .map((row) => ({
      row,
      score: similarityScore(normalizedCandidate, row.normalizedTitle),
    }))
    .filter(({ score }) => score >= 0.72)
    .sort((a, b) => b.score - a.score)[0];
  if (tokenMatch) {
    return duplicateResult(
      "類似あり",
      `タイトル類似 ${Math.round(tokenMatch.score * 100)}%`,
      tokenMatch.row,
    );
  }

  if (normalizedKeyword) {
    const keywordMatch = active.find(
      (row) =>
        row.normalizedTitle &&
        (row.normalizedTitle.includes(normalizedKeyword) ||
          normalizedKeyword.includes(row.normalizedTitle)),
    );
    if (keywordMatch) return duplicateResult("類似あり", "キーワード包含", keywordMatch);
  }

  return {
    status: "重複なし",
    matchType: "Active 115件内に高一致なし",
    itemId: "",
    title: "",
    url: "",
    note: "既存Activeマスターと照合済みです。",
  };
}

function duplicateResult(status, matchType, row) {
  const itemId = stringValue(row.itemId);
  return {
    status,
    matchType,
    itemId,
    title: stringValue(row.title),
    url: stringValue(row.url) || (itemId ? ebayItemUrl(itemId) : ""),
    note:
      status === "重複あり"
        ? "同一の可能性が高いため出品前に既存ページを確認してください。"
        : "同一とは限りませんが、型番・状態・付属品を確認してください。",
  };
}

function similarityScore(left, right) {
  const leftTokens = new Set(String(left || "").split(" ").filter(Boolean));
  const rightTokens = new Set(String(right || "").split(" ").filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / Math.max(leftTokens.size, rightTokens.size);
}

function normalizeTitle(value) {
  const stopWords = new Set([
    "used",
    "new",
    "japan",
    "japanese",
    "right",
    "hand",
    "handed",
    "rh",
    "with",
    "from",
    "for",
    "the",
    "and",
  ]);
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token && !stopWords.has(token))
    .join(" ");
}

function pick(row, names) {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function firstUrl(values) {
  for (const value of values) {
    const url = extractFirstUrl(value);
    if (url) return url;
  }
  return "";
}

function extractFirstUrl(value) {
  const match = String(value || "").match(/https?:\/\/[^\s"'<>]+/);
  return match ? match[0] : "";
}

function extractItemId(value) {
  const text = String(value || "");
  const itemUrlMatch = text.match(/\/itm\/(?:[^/]+\/)?(\d{10,15})/);
  if (itemUrlMatch) return itemUrlMatch[1];
  const plainIdMatch = text.match(/\b(\d{10,15})\b/);
  return plainIdMatch ? plainIdMatch[1] : "";
}

function ebayItemUrl(itemId) {
  return itemId ? `https://www.ebay.com/itm/${encodeURIComponent(itemId)}` : "";
}

function isEnabled(value) {
  const text = stringValue(value).toLowerCase();
  return ["true", "1", "yes", "y", "on", "enabled", "◯", "○"].includes(text);
}

function stringValue(value) {
  return String(value ?? "").trim();
}

function todayJst() {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("/", "-");
}

function parseSpreadsheetId(value) {
  return extractSpreadsheetId(value);
}

module.exports = {
  QUEUE_HEADERS,
  SOURCE_HEADERS,
  buildEbayMarketKeyword,
  computeDuplicateCheck,
  ebayItemUrl,
  ebaySearchUrl,
  ensureQueueHeaders,
  extractItemId,
  extractFirstUrl,
  getListingConfig,
  isEnabled,
  mapQueueRow,
  normalizeTitle,
  parseSpreadsheetId,
  readListingSources,
  readQueue,
  sourceRowToQueuePatch,
  stringValue,
  upsertQueueRow,
};
