const mongoose = require("mongoose");

// Product Schema
const ProductSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      unique: true,
      required: true,
      auto: true,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
    },
    // Trường price bên ngoài - dùng làm giá mặc định hoặc giá chung
    price: {
      type: mongoose.Types.Decimal128, // Giá mặc định của sản phẩm
      required: true,
      min: 0,
    },
    // Mảng prices_by_weight - giá theo từng cân nặng khác nhau
    prices_by_weight: [
      {
        weight: {
          type: Number, // Cân nặng tương ứng
          required: true,
          min: 0,
        },
        price: {
          type: mongoose.Types.Decimal128, // Giá cho cân nặng tương ứng
          required: true,
          min: 0,
        },
      },
    ],
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    displayImage: {
      type: String,
      maxlength: 255,
    },
    image: {
      type: String,
      maxlength: 255,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;
