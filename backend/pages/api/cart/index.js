const applyCors = require("../../../middleware/cors");
const catchAsync = require("../../../utils/catchAsync");
const { protect } = require("../../../middleware/auth");
const {
  getCart,
  addToCart
} = require("../../../controllers/cartController");

async function handler(req, res) {
  await applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  await protect(req);

  if (req.method === "GET") {
    return getCart(req, res);
  }
  if (req.method === "POST") {
    return addToCart(req, res);
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}

module.exports = catchAsync(handler);
