const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0, index: true },
    images: [{ type: String }],
    description: { type: String, default: "" },
    category: { type: String, required: true, index: true },
    stock: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 }
  },
  { timestamps: true }
);

// Compound index for common filters (category + price range) at scale.
productSchema.index({ category: 1, price: 1 });

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
