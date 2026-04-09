const applyCors = require("../../../middleware/cors");
const catchAsync = require("../../../utils/catchAsync");
const { protect } = require("../../../middleware/auth");
const {
  getOrderById,
  updateOrderStatus
} = require("../../../controllers/orderController");

async function handler(req, res) {
  await applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  await protect(req);

  if (req.method === "GET") {
    return getOrderById(req, res);
  }
  if (req.method === "PATCH" || req.method === "PUT") {
    return updateOrderStatus(req, res);
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}

module.exports = catchAsync(handler);
module.exports.default = module.exports;
