const { z } = require("zod");
const prisma = require("../lib/prisma");
const ApiError = require("../utils/apiError");
const validate = require("../middleware/validate");

const createOrderSchema = z.object({
  shippingFee: z.coerce.number().nonnegative().default(0)
});

async function createOrder(req, res) {
  const { shippingFee } = validate(createOrderSchema, req.body);

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: { product: true },
    orderBy: { createdAt: "asc" }
  });
  if (!cartItems.length) {
    throw new ApiError("Cart is empty.", 400);
  }

  const items = [];
  let subtotal = 0;

  for (const line of cartItems) {
    const p = line.product;
    if (!p) throw new ApiError("Invalid cart item.", 400);
    if (p.stock < line.quantity) {
      throw new ApiError(`Insufficient stock for ${p.name}.`, 400);
    }
    const unitPrice = Number(p.price);
    const lineTotal = unitPrice * line.quantity;
    subtotal += lineTotal;
    items.push({
      product: p.id,
      name: p.name,
      image: p.images && p.images[0] ? p.images[0] : "",
      price: unitPrice,
      quantity: line.quantity
    });
  }

  const total = subtotal + shippingFee;

  const order = await prisma.order.create({
    data: {
      userId: req.user.id,
      subtotal,
      shippingFee,
      total,
      status: "pending",
      paymentStatus: "unpaid",
      items: {
        create: items.map((item) => ({
          productId: item.product,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity
        }))
      }
    },
    include: { items: true }
  });

  return res.status(201).json({ success: true, order });
}

async function getMyOrders(req, res) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { items: { include: { product: true } } }
    }),
    prisma.order.count({ where: { userId: req.user.id } })
  ]);

  return res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
}

async function getOrderById(req, res) {
  const order = await prisma.order.findFirst({
    where: { id: String(req.query.id), userId: req.user.id },
    include: { items: { include: { product: true } } }
  });

  if (!order) throw new ApiError("Order not found.", 404);
  return res.status(200).json({ success: true, order });
}

/** Admin-style: update order fulfillment status (e.g. shipped). */
async function updateOrderStatus(req, res) {
  const statusSchema = z.object({
    status: z.enum(["pending", "paid", "shipped"])
  });
  const body = validate(statusSchema, req.body);

  const existing = await prisma.order.findFirst({
    where: { id: String(req.query.id), userId: req.user.id },
    select: { id: true }
  });
  if (!existing) throw new ApiError("Order not found.", 404);
  const order = await prisma.order.update({
    where: { id: existing.id },
    data: { status: body.status }
  });
  if (!order) throw new ApiError("Order not found.", 404);
  return res.status(200).json({ success: true, order });
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus
};
