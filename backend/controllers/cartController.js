const { z } = require("zod");
const prisma = require("../lib/prisma");
const ApiError = require("../utils/apiError");
const validate = require("../middleware/validate");

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1)
});

const updateQtySchema = z.object({
  quantity: z.coerce.number().int().positive()
});

async function getSafeCart(userId) {
  const rows = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" }
  });
  if (!rows.length) return [];

  const productIds = [...new Set(rows.map((r) => r.productId).filter(Boolean))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } }
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const orphanIds = rows.filter((r) => !productMap.has(r.productId)).map((r) => r.id);
  if (orphanIds.length) {
    // Self-heal old/invalid cart rows to avoid 500 on include product.
    await prisma.cartItem.deleteMany({
      where: { id: { in: orphanIds } }
    });
  }

  return rows
    .filter((r) => productMap.has(r.productId))
    .map((r) => ({ ...r, product: productMap.get(r.productId) }));
}

async function getCart(req, res) {
  const cart = await getSafeCart(req.user.id);
  return res.status(200).json({ success: true, cart });
}

async function addToCart(req, res) {
  const body = validate(addSchema, req.body);
  const product = await prisma.product.findUnique({
    where: { id: body.productId }
  });
  if (!product) throw new ApiError("Product not found.", 404);
  if (product.stock < body.quantity) {
    throw new ApiError("Not enough stock.", 400);
  }

  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: { userId: req.user.id, productId: body.productId }
    }
  });

  if (existing) {
    const newQty = existing.quantity + body.quantity;
    if (newQty > product.stock) {
      throw new ApiError("Not enough stock.", 400);
    }
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty }
    });
  } else {
    await prisma.cartItem.create({
      data: { userId: req.user.id, productId: body.productId, quantity: body.quantity }
    });
  }

  const cart = await getSafeCart(req.user.id);
  return res.status(200).json({ success: true, cart });
}

async function updateCartItem(req, res) {
  const body = validate(updateQtySchema, req.body);
  const productId = String(req.query.productId || "");
  if (!productId) {
    throw new ApiError("Invalid product id.", 400);
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError("Product not found.", 404);
  if (body.quantity > product.stock) {
    throw new ApiError("Not enough stock.", 400);
  }

  const item = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: req.user.id, productId } }
  });
  if (!item) throw new ApiError("Item not in cart.", 404);

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: body.quantity }
  });

  const cart = await getSafeCart(req.user.id);
  return res.status(200).json({ success: true, cart });
}

async function removeCartItem(req, res) {
  const productId = String(req.query.productId || "");
  if (!productId) {
    throw new ApiError("Invalid product id.", 400);
  }

  await prisma.cartItem.deleteMany({
    where: { userId: req.user.id, productId }
  });

  const cart = await getSafeCart(req.user.id);
  return res.status(200).json({ success: true, cart });
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem
};
