const { z } = require("zod");
const connectDB = require("../lib/db");
const Product = require("../models/Product");
const ApiError = require("../utils/apiError");
const validate = require("../middleware/validate");

const productSchema = z.object({
  name: z.string().min(2),
  price: z.coerce.number().nonnegative(),
  // Allow CDN paths or relative URLs from your frontend, not only https://
  images: z.array(z.string().min(1)).default([]),
  description: z.string().default(""),
  category: z.string().min(2),
  stock: z.coerce.number().int().nonnegative(),
  rating: z.coerce.number().min(0).max(5).default(0)
});

async function createProduct(req, res) {
  await connectDB();
  const body = validate(productSchema, req.body);
  const product = await Product.create(body);
  return res.status(201).json({ success: true, product });
}

async function getProducts(req, res) {
  await connectDB();

  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 100);
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
  }
  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
  }

  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(query)
  ]);

  return res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
}

async function getProductById(req, res) {
  await connectDB();
  const product = await Product.findById(req.query.id);
  if (!product) throw new ApiError("Product not found.", 404);
  return res.status(200).json({ success: true, product });
}

async function updateProduct(req, res) {
  await connectDB();
  const body = validate(productSchema.partial(), req.body);
  const product = await Product.findByIdAndUpdate(req.query.id, body, {
    new: true,
    runValidators: true
  });
  if (!product) throw new ApiError("Product not found.", 404);
  return res.status(200).json({ success: true, product });
}

async function deleteProduct(req, res) {
  await connectDB();
  const product = await Product.findByIdAndDelete(req.query.id);
  if (!product) throw new ApiError("Product not found.", 404);
  return res.status(200).json({ success: true, message: "Product deleted." });
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
