const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Tạo schema cho CartItem
const CartItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  weight: { // Thêm trường weight để lưu trọng lượng đã chọn
    type: Number,
    required: true,
  },
});

// Tạo schema cho Cart
const CartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [CartItemSchema],
    totalPrice: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["chưa giải quyết", "trả trước", "đơn vị vận chuyển lấy hàng thành công", "delivered", "chưa thanh toán"],
      default: "chưa giải quyết",
    },
  },
  { timestamps: true }
);

// Tính tổng giá khi giỏ hàng thay đổi
CartSchema.pre("save", function (next) {
  this.totalPrice = this.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  next();
});

const Cart = mongoose.model("Cart", CartSchema);


module.exports = Cart;
