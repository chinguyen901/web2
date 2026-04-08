const applyCors = require("../../../middleware/cors");
const catchAsync = require("../../../utils/catchAsync");
const { protect } = require("../../../middleware/auth");
const {
  getProductById,
  updateProduct,
  deleteProduct
} = require("../../../controllers/productController");

async function handler(req, res) {
  await applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return getProductById(req, res);
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    await protect(req);
    return updateProduct(req, res);
  }

  if (req.method === "DELETE") {
    await protect(req);
    return deleteProduct(req, res);
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}

module.exports = catchAsync(handler);
