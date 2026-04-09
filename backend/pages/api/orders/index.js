const applyCors = require("../../../middleware/cors");
const catchAsync = require("../../../utils/catchAsync");
const { protect } = require("../../../middleware/auth");
const {
  createOrder,
  getMyOrders
} = require("../../../controllers/orderController");

async function handler(req, res) {
  await applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  await protect(req);

  if (req.method === "POST") {
    return createOrder(req, res);
  }
  if (req.method === "GET") {
    return getMyOrders(req, res);
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}

module.exports = catchAsync(handler);
module.exports.default = module.exports;
