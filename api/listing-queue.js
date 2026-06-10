const { isSheetsConfigured } = require("./google-sheets");
const { getListingConfig, mapQueueRow, readQueue } = require("./listing-shared");

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
      items: [],
      message:
        "Google Sheets service account env vars are not configured. Listing queue is unavailable locally.",
    });
    return;
  }

  try {
    const rows = await readQueue(getListingConfig());
    const items = rows.map(mapQueueRow);
    res.status(200).json({
      configured: true,
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    res.status(500).json({
      configured: true,
      error: error instanceof Error ? error.message : "Queue could not be loaded.",
    });
  }
};
