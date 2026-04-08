const getStripe = require("../../../lib/stripe");
const getRawBody = require("../../../utils/getRawBody");
const prisma = require("../../../lib/prisma");

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

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true }
        });
        if (order && order.paymentStatus !== "paid") {
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: "paid",
                status: "paid",
                paymentIntentId: pi.id
              }
            });

            for (const line of order.items) {
              await tx.product.update({
                where: { id: line.productId },
                data: { stock: { decrement: line.quantity } }
              });
            }

            await tx.cartItem.deleteMany({ where: { userId: order.userId } });
          });
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "failed",
            paymentIntentId: pi.id
          }
        });
      }
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ received: true });
}

const config = {
  api: {
    bodyParser: false
  }
};

module.exports = handler;
module.exports.config = config;
