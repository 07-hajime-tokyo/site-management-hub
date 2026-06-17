const {
  batchUpdateValues,
  columnLetter,
  ensureHeaders,
  isSheetsConfigured,
  quoteSheetName,
  readSheetRows,
} = require("./google-sheets");
const { getListingConfig, readQueue, stringValue } = require("./listing-shared");

const RESEARCH_REVIEW_HEADERS = [
  "目視判断",
  "目視メモ1st",
  "情報再取得",
  "再取得理由",
  "参照URL",
  "目視更新日時",
  "Codex Item ID",
  "Codex Title",
];

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isSheetsConfigured()) {
    res.status(200).json({
      configured: false,
      saved: false,
      message:
        "Google Sheets service account env vars are not configured. Status was not saved.",
    });
    return;
  }

  try {
    const body = req.body || {};
    if (body.mode === "research-review-load") {
      await handleResearchReviewLoad(res, body);
      return;
    }
    if (body.mode === "research-link-load") {
      await handleResearchLinkLoad(res, body);
      return;
    }
    if (body.mode === "research-review-batch") {
      await handleResearchReviewBatch(res, body);
      return;
    }

    const config = getListingConfig();
    const rowNumber = await resolveRowNumber(config, body);
    const status = stringValue(body?.status) || "下書き作成済み";
    const memo = stringValue(body?.memo);
    const sellstaListingId = stringValue(body?.sellstaListingId);
    const sellstaUrl =
      stringValue(body?.sellstaUrl) ||
      (sellstaListingId ? `https://sellsta.jp/listings/${encodeURIComponent(sellstaListingId)}/edit` : "");
    const draftSavedAt =
      stringValue(body?.draftSavedAt) || new Date().toISOString();

    const data = [
      {
        range: `${quoteSheetName(config.queueSheetName)}!Q${rowNumber}:R${rowNumber}`,
        values: [[status, memo]],
      },
    ];

    if (sellstaListingId || sellstaUrl || status === "下書き作成済み") {
      data.push({
        range: `${quoteSheetName(config.queueSheetName)}!X${rowNumber}:Z${rowNumber}`,
        values: [[sellstaListingId, sellstaUrl, draftSavedAt]],
      });
    }

    await batchUpdateValues(config.queueSpreadsheetId, data);

    res.status(200).json({
      configured: true,
      saved: true,
      rowNumber,
      status,
      sellstaListingId,
      sellstaUrl,
      draftSavedAt,
    });
  } catch (error) {
    res.status(500).json({
      configured: true,
      saved: false,
      error: error instanceof Error ? error.message : "Status could not be saved.",
    });
  }
};

async function handleResearchLinkLoad(res, body) {
  const spreadsheetId = stringValue(body.sourceSpreadsheetId);
  const sheetName = stringValue(body.sourceSheetName);
  if (!spreadsheetId || !sheetName) {
    res.status(400).json({
      configured: true,
      loaded: false,
      error: "sourceSpreadsheetId and sourceSheetName are required.",
    });
    return;
  }

  const { rows } = await readSheetRows(spreadsheetId, sheetName, "A:ZZ");
  const links = {};
  for (const row of rows) {
    const itemNo = stringValue(row["#"] || row["No"] || row.no || row.itemNo);
    const itemId = stringValue(row["Codex Item ID"] || row.itemId) || (itemNo ? `item-${itemNo}` : "");
    const title = stringValue(row["商品名"] || row["タイトル"] || row["Codex Title"] || row.title);
    const competitorItemUrl = findEbayItemUrl([
      row["競合出品URL"],
      row["eBay出品"],
      row["eBay URL"],
      row.eBayURL,
      row["eBayリンク"],
      row["eBay Item ID/URL"],
      ...(Array.isArray(row.__cells) ? row.__cells : []),
    ]);
    if (!itemId || !competitorItemUrl) continue;
    links[itemId] = {
      itemId,
      itemNo,
      title,
      competitorItemUrl,
      rowNumber: row.__rowNumber,
    };
  }

  res.status(200).json({
    configured: true,
    loaded: true,
    linkCount: Object.keys(links).length,
    links,
  });
}

async function handleResearchReviewLoad(res, body) {
  const spreadsheetId = stringValue(body.sourceSpreadsheetId);
  const sheetName = stringValue(body.sourceSheetName);
  if (!spreadsheetId || !sheetName) {
    res.status(400).json({
      configured: true,
      loaded: false,
      error: "sourceSpreadsheetId and sourceSheetName are required.",
    });
    return;
  }

  const { rows } = await readSheetRows(spreadsheetId, sheetName, "A:ZZ");
  const reviews = {};
  for (const row of rows) {
    const itemNo = stringValue(row["#"] || row["Codex Item No"] || row.itemNo);
    const itemId = stringValue(row["Codex Item ID"] || row.itemId) || (itemNo ? `item-${itemNo}` : "");
    if (!itemId) continue;
    reviews[itemId] = {
      itemId,
      itemNo,
      title: stringValue(row["Codex Title"] || row["商品名"] || row.title),
      decision: normalizeResearchDecision(row["目視判断"] || row.manualDecision || row.visualDecision),
      memo: stringValue(row["目視メモ1st"] || row.manualMemo || row.memo),
      refreshRequested: booleanValue(row["情報再取得"] || row.refreshRequested),
      refreshReason: stringValue(row["再取得理由"] || row.refreshReason),
      refreshReferenceUrl: stringValue(row["参照URL"] || row.refreshReferenceUrl),
      updatedAt: stringValue(row["目視更新日時"] || row.reviewUpdatedAt),
      rowNumber: row.__rowNumber,
    };
  }

  res.status(200).json({
    configured: true,
    loaded: true,
    reviewCount: Object.keys(reviews).length,
    reviews,
  });
}

async function handleResearchReviewBatch(res, body) {
  const spreadsheetId = stringValue(body.sourceSpreadsheetId);
  const sheetName = stringValue(body.sourceSheetName);
  const reviews = Array.isArray(body.reviews) ? body.reviews : [];
  if (!spreadsheetId || !sheetName) {
    res.status(400).json({
      configured: true,
      saved: false,
      error: "sourceSpreadsheetId and sourceSheetName are required.",
    });
    return;
  }
  if (!reviews.length) {
    res.status(200).json({
      configured: true,
      saved: true,
      savedCount: 0,
      savedItems: [],
      errors: [],
    });
    return;
  }

  await ensureHeaders(spreadsheetId, sheetName, RESEARCH_REVIEW_HEADERS);
  const { headers, rows } = await readSheetRows(spreadsheetId, sheetName, "A:ZZ");
  const headerIndex = buildHeaderIndex(headers);
  const updates = [];
  const savedItems = [];
  const errors = [];
  const updatedAt = new Date().toISOString();

  for (const review of reviews) {
    const rowNumber = findResearchReviewRow(rows, review);
    const itemId = stringValue(review.itemId);
    if (!rowNumber) {
      errors.push({ itemId, error: "Matching source row was not found." });
      continue;
    }

    addReviewUpdate(updates, sheetName, headerIndex, rowNumber, "目視判断", normalizeResearchDecision(review.decision));
    addReviewUpdate(updates, sheetName, headerIndex, rowNumber, "目視メモ1st", stringValue(review.memo));
    addReviewUpdate(updates, sheetName, headerIndex, rowNumber, "情報再取得", booleanValue(review.refreshRequested) ? "TRUE" : "");
    addReviewUpdate(updates, sheetName, headerIndex, rowNumber, "再取得理由", stringValue(review.refreshReason));
    addReviewUpdate(updates, sheetName, headerIndex, rowNumber, "参照URL", stringValue(review.refreshReferenceUrl));
    addReviewUpdate(updates, sheetName, headerIndex, rowNumber, "目視更新日時", updatedAt);
    addReviewUpdate(updates, sheetName, headerIndex, rowNumber, "Codex Item ID", itemId);
    addReviewUpdate(updates, sheetName, headerIndex, rowNumber, "Codex Title", stringValue(review.title));

    savedItems.push({
      itemId,
      itemNo: stringValue(review.itemNo),
      rowNumber,
      updatedAt,
    });
  }

  if (updates.length) {
    await batchUpdateValues(spreadsheetId, updates);
  }

  res.status(200).json({
    configured: true,
    saved: savedItems.length > 0 || errors.length === 0,
    savedCount: savedItems.length,
    savedItems,
    errors,
  });
}

async function resolveRowNumber(config, body) {
  const numericRow = Number(body.rowNumber);
  if (Number.isInteger(numericRow) && numericRow >= 2) return numericRow;

  const sourceId = stringValue(body.sourceId);
  const sourceRow = stringValue(body.sourceRow);
  if (sourceId && sourceRow) {
    const rows = await readQueue(config);
    const match = rows.find(
      (row) => stringValue(row.sourceId) === sourceId && stringValue(row.sourceRow) === sourceRow,
    );
    if (match) return match.__rowNumber;
  }

  throw new Error("rowNumber or sourceId/sourceRow is required.");
}

function buildHeaderIndex(headers) {
  return headers.reduce((acc, header, index) => {
    if (header) acc[header] = index;
    return acc;
  }, {});
}

function addReviewUpdate(updates, sheetName, headerIndex, rowNumber, header, value) {
  const columnIndex = headerIndex[header];
  if (columnIndex === undefined) return;
  const column = columnLetter(columnIndex);
  updates.push({
    range: `${quoteSheetName(sheetName)}!${column}${rowNumber}:${column}${rowNumber}`,
    values: [[value]],
  });
}

function findResearchReviewRow(rows, review) {
  const itemId = stringValue(review.itemId);
  const itemNo = stringValue(review.itemNo);
  const title = stringValue(review.title).toLowerCase();
  const byCodexId = itemId
    ? rows.find((row) => stringValue(row["Codex Item ID"] || row.itemId) === itemId)
    : null;
  if (byCodexId) return byCodexId.__rowNumber;

  const byNumber = itemNo
    ? rows.find((row) => stringValue(row["#"] || row["Codex Item No"] || row.itemNo) === itemNo)
    : null;
  if (byNumber) return byNumber.__rowNumber;

  const byTitle = title
    ? rows.find((row) => stringValue(row["商品名"] || row["Codex Title"] || row.title).toLowerCase() === title)
    : null;
  return byTitle?.__rowNumber || 0;
}

function normalizeResearchDecision(value) {
  const text = stringValue(value);
  if (["○", "〇"].includes(text)) return "◯";
  if (/^(ok|yes|true)$/i.test(text)) return "◯";
  if (/^(ng|no|false|x)$/i.test(text)) return "✗";
  return text;
}

function booleanValue(value) {
  if (value === true) return true;
  const text = stringValue(value).toLowerCase();
  return ["1", "true", "yes", "y", "on", "checked", "ok", "◯", "○", "〇"].includes(text);
}

function findEbayItemUrl(values) {
  for (const value of values) {
    const url = normalizeEbayItemUrl(value);
    if (url) return url;
  }
  return "";
}

function normalizeEbayItemUrl(value) {
  const text = stringValue(value);
  if (!text) return "";
  const itemUrlMatch = text.match(/\/itm\/(?:[^/?#]+\/)?(\d{10,15})/i);
  if (itemUrlMatch) return `https://www.ebay.com/itm/${itemUrlMatch[1]}`;
  if (/^\d{10,15}$/.test(text)) return `https://www.ebay.com/itm/${text}`;
  return "";
}
