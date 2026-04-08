const { z } = require("zod");
const prisma = require("../lib/prisma");
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
  const body = validate(createIntentSchema, req.body);
  const order = await prisma.order.findFirst({
    where: { id: body.orderId, userId: req.user.id }
  });

  if (!order) throw new ApiError("Order not found.", 404);
  if (order.paymentStatus === "paid") {
    throw new ApiError("Order already paid.", 400);
  }

  const amountCents = Math.round(Number(order.total) * 100);
  if (amountCents < 50) {
    throw new ApiError("Order total too small for Stripe.", 400);
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId: order.id,
      userId: req.user.id
    },
    description: `Streetwear order ${order.id}`
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentIntentId: paymentIntent.id,
      paymentStatus: "pending"
    }
  });

  return res.status(200).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    orderId: order.id
  });
}

/**
 * Success redirect target after client-side confirmation (optional).
 * Stripe may append payment_intent / payment_intent_client_secret as query params.
 */
async function paymentSuccess(req, res) {
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
