const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/order");
const OrderDetail = require("../models/orderdetail");
const Cart = require("../models/cart");
const User = require("../models/user"); // Thêm User model để cập nhật thông tin người dùng nếu cần
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const { sendInvoiceEmail } = require("../utils/emailUtils");
// Xử lý webhook từ Stripe
router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      console.log("Nhận sự kiện webhook từ Stripe");
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log("Xác thực chữ ký webhook thành công");
    } catch (err) {
      console.error("Xác thực chữ ký webhook thất bại.", err.message);
      return res.sendStatus(400);
    }

    console.log(`Xử lý sự kiện loại ${event.type}`);
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        console.log("Phiên thanh toán đã hoàn tất:", session);
        await handleCheckoutSession(session);
        break;
      case "charge.refunded":
        const refund = event.data.object;
        console.log("Khoản hoàn tiền:", refund);
        await handleRefund(refund);
        break;
      case "checkout.session.expired": // Sự kiện khi phiên hết hạn
      case "payment_intent.canceled": // Sự kiện khi thanh toán bị hủy
        const canceledSession = event.data.object;
        console.log("Phiên thanh toán đã bị hủy hoặc hết hạn:", canceledSession);
        await handleCanceledSession(canceledSession);
        break;
      default:
        console.log(`Loại sự kiện không được xử lý ${event.type}`);
    }

    res.sendStatus(200);
  }
);

async function handleCanceledSession(session) {
  const stripeSessionId = session.id;
  const order = await Order.findOne({ stripeSessionId: stripeSessionId });

  if (order) {
    console.log(`Đơn hàng ${order._id} đã bị hủy, xóa các sản phẩm từ giỏ hàng.`);
    const selectedItems = session.metadata.selectedItems.split(",");
    await Cart.findOneAndUpdate(
      { user: order.user },
      { $pull: { items: { _id: { $in: selectedItems } } } }
    );
    console.log("Đã xóa các sản phẩm được chọn từ giỏ hàng sau khi hủy đơn hàng.");
  } else {
    console.log("Không tìm thấy đơn hàng với stripeSessionId:", stripeSessionId);

    // Xóa sản phẩm khỏi giỏ hàng ngay cả khi không có đơn hàng (trường hợp phiên bị hủy trước khi đơn hàng được tạo)
    const selectedItems = session.metadata.selectedItems.split(",");
    await Cart.findOneAndUpdate(
      { user: session.metadata.userId },
      { $pull: { items: { _id: { $in: selectedItems } } } }
    );
    console.log("Đã xóa các sản phẩm được chọn từ giỏ hàng sau khi hủy phiên thanh toán.");
  }
}

async function handleCheckoutSession(session) {
  try {
    const userId = session.metadata.userId;
    const total = parseFloat(session.metadata.total);
    const shippingFee = parseFloat(session.metadata.shippingFee) || 0;
    const email = session.customer_details.email;
    const address = session.customer_details.address;
    const paymentMethod = session.metadata.paymentMethod;

    if (isNaN(total) || isNaN(shippingFee)) {
      console.error("Tổng số tiền hoặc phí vận chuyển không hợp lệ");
      return;
    }

    const formattedAddress = [
      address.line1,
      address.city,
      address.state,
      address.country,
      address.postal_code,
    ]
      .filter(Boolean)
      .join(", ");

    // Kiểm tra đơn hàng đã tồn tại với paymentIntentId
    let order = await Order.findOne({ paymentIntentId: session.payment_intent });

    if (order) {
      console.log("Đơn hàng đã được xử lý trước đó với ID:", order._id);
      return order._id;
    }

    // Kiểm tra đơn hàng "chưa giải quyết" với userId và không có paymentIntentId
    order = await Order.findOne({
      user: userId,
      status: "chưa giải quyết",
      paymentIntentId: "",
    });

    if (!order) {
      order = new Order({
        user: userId,
        items: [],
        total: total + shippingFee,
        status: "chưa giải quyết",
        paymentStatus: "trả trước",
        email,
        address: formattedAddress,
        paymentIntentId: session.payment_intent,
        shippingMethod: session.metadata.shippingMethod,
        shippingFee,
      });
    } else {
      order.status = "chưa giải quyết";
      order.paymentStatus = "trả trước";
      order.paymentIntentId = session.payment_intent;
      order.shippingFee = shippingFee;
      order.total = total + shippingFee;
    }

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart) {
      console.error("Không tìm thấy giỏ hàng.");
      return;
    }

    const selectedItems = session.metadata.selectedItems.split(",");
    const filteredItems = cart.items.filter(item => {
      return selectedItems.includes(paymentMethod === "stripe" ? item._id.toString() : item.product._id.toString());
    });

    order.items = filteredItems.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.price,
      images: [item.product.image],
      weight: item.weight, // Lưu trọng lượng của sản phẩm
    }));

    await order.save();

     // Xóa các sản phẩm đã chọn khỏi giỏ hàng sau khi thanh toán thành công
     await Cart.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { _id: { $in: selectedItems } } } }
    );

    console.log("Đã xóa các mặt hàng đã chọn từ giỏ hàng");

    // Tùy chọn: Gửi email hóa đơn cho khách hàng
    const orderDetails = await OrderDetail.find({ order: order._id }).populate("product");
    await sendInvoiceEmail(order.email, order, orderDetails);
    
    return order._id;
  } catch (error) {
    console.error("Lỗi khi xử lý phiên thanh toán:", error);
  }
}


async function handleRefund(refund) {
  try {
    const paymentIntentId = refund.payment_intent;

    // Tìm đơn hàng theo paymentIntentId
    const order = await Order.findOne({ paymentIntentId: paymentIntentId });

    if (order) {
      order.status = "hoàn trả";
      order.total = 0;
      await order.save();
      console.log("Đơn hàng đã được cập nhật thành trạng thái hoàn tiền");
    } else {
      console.log("Không tìm thấy đơn hàng để hoàn tiền");
    }
  } catch (error) {
    console.error("Lỗi khi xử lý hoàn tiền:", error);
  }
}

module.exports = router;
