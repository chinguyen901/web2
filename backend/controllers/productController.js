const { z } = require("zod");
const prisma = require("../lib/prisma");
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
  const body = validate(productSchema, req.body);
  const product = await prisma.product.create({
    data: {
      ...body,
      price: body.price,
      rating: body.rating
    }
  });
  return res.status(201).json({ success: true, product });
}

async function getProducts(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 100);
  const skip = (page - 1) * limit;

  const where = {};
  if (req.query.search) {
    where.name = { contains: String(req.query.search), mode: "insensitive" };
  }
  if (req.query.category) {
    where.category = String(req.query.category);
  }
  if (req.query.minPrice || req.query.maxPrice) {
    where.price = {};
    if (req.query.minPrice) where.price.gte = Number(req.query.minPrice);
    if (req.query.maxPrice) where.price.lte = Number(req.query.maxPrice);
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.product.count({ where })
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
  const product = await prisma.product.findUnique({
    where: { id: String(req.query.id) }
  });
  if (!product) throw new ApiError("Product not found.", 404);
  return res.status(200).json({ success: true, product });
}

async function updateProduct(req, res) {
  const body = validate(productSchema.partial(), req.body);
  const exists = await prisma.product.findUnique({
    where: { id: String(req.query.id) },
    select: { id: true }
  });
  if (!exists) throw new ApiError("Product not found.", 404);
  const product = await prisma.product.update({
    where: { id: String(req.query.id) },
    data: body
  });
  return res.status(200).json({ success: true, product });
}

async function deleteProduct(req, res) {
  const exists = await prisma.product.findUnique({
    where: { id: String(req.query.id) },
    select: { id: true }
  });
  if (!exists) throw new ApiError("Product not found.", 404);
  await prisma.product.delete({ where: { id: String(req.query.id) } });
  return res.status(200).json({ success: true, message: "Product deleted." });
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
