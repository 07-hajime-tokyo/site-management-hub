const { batchUpdateValues, isSheetsConfigured, quoteSheetName } = require("./google-sheets");
const { getListingConfig, readQueue, stringValue } = require("./listing-shared");

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
    const config = getListingConfig();
    const rowNumber = await resolveRowNumber(config, req.body || {});
    const status = stringValue(req.body?.status) || "下書き作成済み";
    const memo = stringValue(req.body?.memo);
    const sellstaListingId = stringValue(req.body?.sellstaListingId);
    const sellstaUrl =
      stringValue(req.body?.sellstaUrl) ||
      (sellstaListingId ? `https://sellsta.jp/listings/${encodeURIComponent(sellstaListingId)}/edit` : "");
    const draftSavedAt =
      stringValue(req.body?.draftSavedAt) || new Date().toISOString();

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
