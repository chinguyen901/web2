/**
 * Seed 2000–3000 fake streetwear products into MongoDB (same collection as API).
 *
 * 1. Copy `.env.example` to `.env` and set `MONGODB_URI`.
 * 2. Run: `npm run seed` or `node scripts/seedProducts.js`
 *
 * Optional: `SEED_COUNT=2800 node scripts/seedProducts.js`
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const Product = require("../models/Product");

const CATEGORIES = [
  "hoodies",
  "tees",
  "sneakers",
  "jackets",
  "pants",
  "accessories",
  "caps",
  "collabs"
];

const ADJECTIVES = [
  "Neon",
  "Urban",
  "Vintage",
  "Limited",
  "Oversized",
  "Tech",
  "Raw",
  "Night",
  "Concrete",
  "Signal"
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
  }

  const target = Math.min(
    Math.max(Number(process.env.SEED_COUNT || 2500), 2000),
    3000
  );

  await mongoose.connect(uri, { dbName: "streetwear" });
  console.log("Connected. Seeding", target, "products (replaces all existing)...");

  await Product.deleteMany({});

  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < target; i += batchSize) {
    const chunk = [];
    const n = Math.min(batchSize, target - i);
    for (let j = 0; j < n; j++) {
      const category = faker.helpers.arrayElement(CATEGORIES);
      const name = `${faker.helpers.arrayElement(ADJECTIVES)} ${faker.commerce.productName()}`;
      const slug = faker.string.alphanumeric(10);
      const rating = faker.number.int({ min: 30, max: 50 }) / 10;
      chunk.push({
        name,
        price: Number(faker.commerce.price({ min: 15, max: 350, dec: 2 })),
        images: [
          `https://picsum.photos/seed/${slug}-1/800/1000`,
          `https://picsum.photos/seed/${slug}-2/800/1000`
        ],
        description: faker.commerce.productDescription(),
        category,
        stock: faker.number.int({ min: 0, max: 80 }),
        rating
      });
    }
    await Product.insertMany(chunk, { ordered: false });
    inserted += n;
    console.log("Inserted", inserted, "/", target);
  }

  console.log("Done. Total products:", await Product.countDocuments());
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
