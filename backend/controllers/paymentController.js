const { z } = require("zod");
const mongoose = require("mongoose");
const connectDB = require("../lib/db");
const Order = require("../models/Order");
const getStripe = require("../lib/stripe");
const ApiError = require("../utils/apiError");
const validate = require("../middleware/validate");

const createIntentSchema = z.object({
  orderId: z.string().min(1)
});

/**
 * Create a Stripe PaymentIntent for an existing unpaid order.
 * Amount is taken from order.total (USD, converted to smallest currency unit).
 */
async function createPaymentIntent(req, res) {
  await connectDB();
  const body = validate(createIntentSchema, req.body);

  if (!mongoose.Types.ObjectId.isValid(body.orderId)) {
    throw new ApiError("Invalid order id.", 400);
  }

  const order = await Order.findOne({
    _id: body.orderId,
    user: req.user._id
  });

  if (!order) throw new ApiError("Order not found.", 404);
  if (order.paymentStatus === "paid") {
    throw new ApiError("Order already paid.", 400);
  }

  const amountCents = Math.round(order.total * 100);
  if (amountCents < 50) {
    throw new ApiError("Order total too small for Stripe.", 400);
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId: order._id.toString(),
      userId: req.user._id.toString()
    },
    description: `Streetwear order ${order._id}`
  });

  order.paymentIntentId = paymentIntent.id;
  order.paymentStatus = "pending";
  await order.save();

  return res.status(200).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    orderId: order._id.toString()
  });
}

/**
 * Success redirect target after client-side confirmation (optional).
 * Stripe may append payment_intent / payment_intent_client_secret as query params.
 */
async function paymentSuccess(req, res) {
  await connectDB();
  const paymentIntentId =
    req.query.payment_intent || req.query.payment_intent_client_secret;

  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  const redirectUrl = new URL("/checkout/success", frontend);

  if (paymentIntentId && typeof paymentIntentId === "string") {
    redirectUrl.searchParams.set("payment_intent", paymentIntentId);
  }

  res.redirect(302, redirectUrl.toString());
}

/**
 * Cancel redirect: send user back to storefront checkout.
 */
async function paymentCancel(req, res) {
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  const redirectUrl = new URL("/checkout/cancel", frontend);
  if (req.query.orderId) {
    redirectUrl.searchParams.set("orderId", String(req.query.orderId));
  }
  res.redirect(302, redirectUrl.toString());
}

module.exports = {
  createPaymentIntent,
  paymentSuccess,
  paymentCancel
};
