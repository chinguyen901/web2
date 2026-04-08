const { z } = require("zod");
const mongoose = require("mongoose");
const connectDB = require("../lib/db");
const User = require("../models/User");
const Product = require("../models/Product");
const ApiError = require("../utils/apiError");
const validate = require("../middleware/validate");

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1)
});

const updateQtySchema = z.object({
  quantity: z.coerce.number().int().positive()
});

async function getCart(req, res) {
  await connectDB();
  const user = await User.findById(req.user._id).populate("cart.product");
  return res.status(200).json({ success: true, cart: user.cart });
}

async function addToCart(req, res) {
  await connectDB();
  const body = validate(addSchema, req.body);

  if (!mongoose.Types.ObjectId.isValid(body.productId)) {
    throw new ApiError("Invalid product id.", 400);
  }

  const product = await Product.findById(body.productId);
  if (!product) throw new ApiError("Product not found.", 404);
  if (product.stock < body.quantity) {
    throw new ApiError("Not enough stock.", 400);
  }

  const user = await User.findById(req.user._id);
  const existing = user.cart.find(
    (item) => item.product.toString() === body.productId
  );

  if (existing) {
    existing.quantity += body.quantity;
    if (existing.quantity > product.stock) {
      throw new ApiError("Not enough stock.", 400);
    }
  } else {
    user.cart.push({ product: body.productId, quantity: body.quantity });
  }

  await user.save();
  const populated = await User.findById(user._id).populate("cart.product");
  return res.status(200).json({ success: true, cart: populated.cart });
}

async function updateCartItem(req, res) {
  await connectDB();
  const body = validate(updateQtySchema, req.body);
  const { productId } = req.query;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product id.", 400);
  }

  const product = await Product.findById(productId);
  if (!product) throw new ApiError("Product not found.", 404);
  if (body.quantity > product.stock) {
    throw new ApiError("Not enough stock.", 400);
  }

  const user = await User.findById(req.user._id);
  const item = user.cart.find((c) => c.product.toString() === productId);
  if (!item) throw new ApiError("Item not in cart.", 404);

  item.quantity = body.quantity;
  await user.save();

  const populated = await User.findById(user._id).populate("cart.product");
  return res.status(200).json({ success: true, cart: populated.cart });
}

async function removeCartItem(req, res) {
  await connectDB();
  const { productId } = req.query;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError("Invalid product id.", 400);
  }

  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter((c) => c.product.toString() !== productId);
  await user.save();

  const populated = await User.findById(user._id).populate("cart.product");
  return res.status(200).json({ success: true, cart: populated.cart });
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem
};
