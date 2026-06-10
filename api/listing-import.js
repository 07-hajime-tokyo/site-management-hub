const { ensureHeaders, readSheetRows } = require("./google-sheets");
const {
  getListingConfig,
  parseSpreadsheetId,
  readListingSources,
  stringValue,
  upsertQueueRow,
} = require("./listing-shared");
const { isSheetsConfigured } = require("./google-sheets");

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
      imported: 0,
      updated: 0,
      skipped: 0,
      message:
        "Google Sheets service account env vars are not configured. Import was not run.",
    });
    return;
  }

  try {
    const config = getListingConfig();
    const sources = (await readListingSources(config)).filter((source) => source.enabled);
    const requestedSourceId = stringValue(req.body?.sourceId);
    const targets = requestedSourceId
      ? sources.filter((source) => source.sourceId === requestedSourceId)
      : sources;
    const results = [];

    for (const source of targets) {
      const spreadsheetId = parseSpreadsheetId(source.researchSheetUrl);
      if (!spreadsheetId || !source.sourceSheetName) {
        results.push({
          sourceId: source.sourceId,
          action: "skipped",
          reason: "researchSheetUrl or sourceSheetName missing",
        });
        continue;
      }

      await ensureHeaders(spreadsheetId, source.sourceSheetName, ["目視判断"]);
      const { rows } = await readSheetRows(spreadsheetId, source.sourceSheetName);
      const approvedRows = rows.filter((row) => isVisualApproved(row["目視判断"]));
      for (const row of approvedRows) {
        results.push(await upsertQueueRow(config, source, row));
      }
    }

    const summary = results.reduce(
      (acc, result) => {
        if (result.action === "inserted") acc.imported += 1;
        else if (result.action === "updated") acc.updated += 1;
        else acc.skipped += 1;
        return acc;
      },
      { imported: 0, updated: 0, skipped: 0 },
    );

    res.status(200).json({
      configured: true,
      ...summary,
      totalSources: targets.length,
      results,
    });
  } catch (error) {
    res.status(500).json({
      configured: true,
      error: error instanceof Error ? error.message : "Import failed.",
    });
  }
};

function isVisualApproved(value) {
  const text = String(value || "").trim();
  return text === "◯" || text === "○";
}
