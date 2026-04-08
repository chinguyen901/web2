const { z } = require("zod");
const connectDB = require("../lib/db");
const User = require("../models/User");
const Order = require("../models/Order");
const ApiError = require("../utils/apiError");
const validate = require("../middleware/validate");

const createOrderSchema = z.object({
  shippingFee: z.coerce.number().nonnegative().default(0)
});

async function createOrder(req, res) {
  await connectDB();
  const { shippingFee } = validate(createOrderSchema, req.body);

  const user = await User.findById(req.user._id).populate("cart.product");
  if (!user.cart.length) {
    throw new ApiError("Cart is empty.", 400);
  }

  const items = [];
  let subtotal = 0;

  for (const line of user.cart) {
    const p = line.product;
    if (!p) throw new ApiError("Invalid cart item.", 400);
    if (p.stock < line.quantity) {
      throw new ApiError(`Insufficient stock for ${p.name}.`, 400);
    }
    const lineTotal = p.price * line.quantity;
    subtotal += lineTotal;
    items.push({
      product: p._id,
      name: p.name,
      image: p.images && p.images[0] ? p.images[0] : "",
      price: p.price,
      quantity: line.quantity
    });
  }

  const total = subtotal + shippingFee;

  const order = await Order.create({
    user: user._id,
    items,
    subtotal,
    shippingFee,
    total,
    status: "pending",
    paymentStatus: "unpaid"
  });

  return res.status(201).json({ success: true, order });
}

async function getMyOrders(req, res) {
  await connectDB();

  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("items.product"),
    Order.countDocuments({ user: req.user._id })
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
  await connectDB();
  const order = await Order.findOne({
    _id: req.query.id,
    user: req.user._id
  }).populate("items.product");

  if (!order) throw new ApiError("Order not found.", 404);
  return res.status(200).json({ success: true, order });
}

/** Admin-style: update order fulfillment status (e.g. shipped). */
async function updateOrderStatus(req, res) {
  await connectDB();
  const statusSchema = z.object({
    status: z.enum(["pending", "paid", "shipped"])
  });
  const body = validate(statusSchema, req.body);

  const order = await Order.findOneAndUpdate(
    { _id: req.query.id, user: req.user._id },
    { status: body.status },
    { new: true, runValidators: true }
  );

  if (!order) throw new ApiError("Order not found.", 404);
  return res.status(200).json({ success: true, order });
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus
};
