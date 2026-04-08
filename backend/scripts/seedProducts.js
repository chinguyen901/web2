/**
 * Seed 2000–3000 fake streetwear products into Neon/Postgres via Prisma.
 *
 * 1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
 * 2. Run: `npx prisma generate`
 * 3. Run: `npm run seed` or `node scripts/seedProducts.js`
 *
 * Optional: `SEED_COUNT=2800 node scripts/seedProducts.js`
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { faker } = require("@faker-js/faker");
const prisma = require("../lib/prisma");

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
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("Set DATABASE_URL in .env");
    process.exit(1);
  }

  const target = Math.min(
    Math.max(Number(process.env.SEED_COUNT || 2500), 2000),
    3000
  );

  console.log("Connected. Seeding", target, "products (replaces all existing)...");
  await prisma.product.deleteMany();

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
    await prisma.product.createMany({ data: chunk });
    inserted += n;
    console.log("Inserted", inserted, "/", target);
  }

  console.log("Done. Total products:", await prisma.product.count());
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma
    .$disconnect()
    .catch(() => undefined)
    .finally(() => process.exit(1));
});
