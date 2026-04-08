const applyCors = require("../../../middleware/cors");
const catchAsync = require("../../../utils/catchAsync");
const { paymentCancel } = require("../../../controllers/paymentController");

async function handler(req, res) {
  await applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }
  return paymentCancel(req, res);
}

module.exports = catchAsync(handler);
