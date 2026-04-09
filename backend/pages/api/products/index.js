const applyCors = require("../../../middleware/cors");
const catchAsync = require("../../../utils/catchAsync");
const { protect } = require("../../../middleware/auth");
const {
  createProduct,
  getProducts
} = require("../../../controllers/productController");

async function handler(req, res) {
  await applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return getProducts(req, res);
  }

  if (req.method === "POST") {
    await protect(req);
    return createProduct(req, res);
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}

module.exports = catchAsync(handler);
module.exports.default = module.exports;
