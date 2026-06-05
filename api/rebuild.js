module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && !["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.status(200).json({
    ok: true,
    rebuiltAt: new Date().toISOString(),
    message: "進捗データはGitHub/Notion/APIから都度読み込みます。",
  });
};
