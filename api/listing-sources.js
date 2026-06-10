const { isSheetsConfigured } = require("./google-sheets");
const { getListingConfig, readListingSources } = require("./listing-shared");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isSheetsConfigured()) {
    res.status(200).json({
      configured: false,
      sources: [],
      message:
        "Google Sheets service account env vars are not configured. Set them in Vercel env vars only.",
    });
    return;
  }

  try {
    const config = getListingConfig();
    const sources = await readListingSources(config);
    res.status(200).json({
      configured: true,
      sources,
      enabledCount: sources.filter((source) => source.enabled).length,
      config: {
        sourcesSpreadsheetId: config.sourcesSpreadsheetId,
        sourcesSheetName: config.sourcesSheetName,
        queueSpreadsheetId: config.queueSpreadsheetId,
        queueSheetName: config.queueSheetName,
      },
    });
  } catch (error) {
    res.status(500).json({
      configured: true,
      error: error instanceof Error ? error.message : "Sources could not be loaded.",
    });
  }
};
