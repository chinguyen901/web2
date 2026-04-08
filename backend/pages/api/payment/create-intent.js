const applyCors = require("../../../middleware/cors");
const catchAsync = require("../../../utils/catchAsync");
const { protect } = require("../../../middleware/auth");
const { createPaymentIntent } = require("../../../controllers/paymentController");

async function handler(req, res) {
  await applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }
  await protect(req);
  return createPaymentIntent(req, res);
}

module.exports = catchAsync(handler);
