const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Tạo schema cho Order
const OrderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    items: [
      {
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
          // required: true,
        },
        images: [String], // Thêm trường images để lưu các hình ảnh sản phẩm
      },
    ],
    orderDate: {
      type: Date,
      default: Date.now,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "chưa giải quyết",
        "đơn hàng đã hoàn thành",
        "hủy bỏ",
        "đã bàn giao cho đơn vị vận chuyển",
        "không liên lạc được người nhận",
        "đang vận chuyển",
        "đã giao hàng",
        "đã nhận hàng",
        "từ chối đơn hàng",
        "đang xử lý",
        "chưa thanh toán",
        "trả trước",
        "hoàn trả",
        "Waiting for goods",
        "yêu cầu hoàn trả",
      ],
      default: "chưa giải quyết",
    },
    paymentStatus: {
      type: String,
      enum: [
        "chưa giải quyết",
        "trả trước",
        "đã nhận thanh toán",
        "failed",
        "chưa thanh toán",
        "cod",
        "Online",
      ],
      required: true,
      default: "chưa giải quyết",
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "cod", "Online", "vnpay"],
      default: "stripe",
    },
    email: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    paymentIntentId: {
      type: String, // Payment Intent ID from Stripe
      required: false,
    },
    stripeSessionId: {
      type: String, // Session ID from Stripe
      required: false,
    },
    refundReason: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      maxlength: 255,
    },
    shippingMethod: {
      type: String,
      enum: ["GHN", "GHTK"],
      required: true,
      default: "GHN",
    },
    shippingFee: { type: Number, default: 0 },

    interactions: [
      {
        staff: {
          type: Schema.Types.ObjectId,
          ref: "User", // Tham chiếu đến bảng User (nhân viên)
          required: true,
        },
        action: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },

  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
