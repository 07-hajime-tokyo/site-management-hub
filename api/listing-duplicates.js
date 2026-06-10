const { isSheetsConfigured, readSheetRows } = require("./google-sheets");
const {
  computeDuplicateCheck,
  getListingConfig,
  stringValue,
} = require("./listing-shared");

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
      results: {},
      message:
        "Google Sheets service account env vars are not configured. Duplicate check was not run.",
    });
    return;
  }

  try {
    const config = getListingConfig();
    const { rows: activeRows } = await readSheetRows(
      config.queueSpreadsheetId,
      config.activeSheetName,
      "A:Q",
    );
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const limitedItems = items.slice(0, 1500);
    const results = {};
    for (const item of limitedItems) {
      const id = stringValue(item.id || item.title);
      if (!id) continue;
      results[id] = computeDuplicateCheck(item, activeRows);
    }

    res.status(200).json({
      configured: true,
      generatedAt: new Date().toISOString(),
      activeCount: activeRows.length,
      count: Object.keys(results).length,
      results,
    });
  } catch (error) {
    res.status(500).json({
      configured: true,
      results: {},
      error: error instanceof Error ? error.message : "Duplicate check failed.",
    });
  }
};
