const Stripe = require("stripe");

let stripeInstance = null;

/**
 * Lazy Stripe client so routes that do not need Stripe still load without keys.
 */
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

module.exports = getStripe;
