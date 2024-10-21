const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Tạo schema cho OrderDetail
const OrderDetailSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    weight: {
      type: Number, // Thêm trường weight để lưu thông tin về cân nặng đã chọn
      required: true,
    },
    images: [String], // Thêm trường images để lưu hình ảnh sản phẩm trong OrderDetail
  },
  { timestamps: true }
);

const OrderDetail = mongoose.model("OrderDetail", OrderDetailSchema);

module.exports = OrderDetail;
