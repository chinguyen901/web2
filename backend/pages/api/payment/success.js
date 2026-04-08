const applyCors = require("../../../middleware/cors");
const catchAsync = require("../../../utils/catchAsync");
const { paymentSuccess } = require("../../../controllers/paymentController");

async function handler(req, res) {
  await applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }
  return paymentSuccess(req, res);
}

module.exports = catchAsync(handler);
