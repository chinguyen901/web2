const getStripe = require("../../../lib/stripe");
const getRawBody = require("../../../utils/getRawBody");
const connectDB = require("../../../lib/db");
const Order = require("../../../models/Order");
const Product = require("../../../models/Product");
const User = require("../../../models/User");

/**
 * Stripe webhook: verify signature with raw body, then update order + inventory.
 * Configure endpoint URL in Stripe Dashboard (test mode) to:
 *   https://<your-vercel-domain>/api/payment/webhook
 */
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET is not set" });
  }

  let event;
  try {
    const buf = await getRawBody(req);
    const sig = req.headers["stripe-signature"];
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  await connectDB();

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.paymentStatus !== "paid") {
          order.paymentStatus = "paid";
          order.status = "paid";
          order.paymentIntentId = pi.id;
          await order.save();

          for (const line of order.items) {
            await Product.findByIdAndUpdate(line.product, {
              $inc: { stock: -line.quantity }
            });
          }

          await User.findByIdAndUpdate(order.user, { $set: { cart: [] } });
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: "failed",
          paymentIntentId: pi.id
        });
      }
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ received: true });
}

handler.config = {
  api: {
    bodyParser: false
  }
};

module.exports = handler;
