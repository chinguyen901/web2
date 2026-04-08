const applyCors = require("../../middleware/cors");

async function handler(req, res) {
  await applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }
  return res.status(200).json({ success: true, status: "ok" });
}

module.exports = handler;
