const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Tạo schema cho Payment
const PaymentSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "paypal", "bank_transfer", "cash"],
      required: true,
    },
    status: {
      type: String,
      enum: ["chưa giải quyết", "đơn hàng đã hoàn thành", "failed"],
      required: true,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", PaymentSchema);

module.exports = Payment;
