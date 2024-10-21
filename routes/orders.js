const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const OrderDetail = require("../models/orderdetail");
const { isAuthenticated } = require("../middleware/auth");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Fetch an order by its ID
// Lấy thông tin đơn hàng theo ID
router.get("/:orderId", isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params; // Lấy ID đơn hàng từ tham số đường dẫn
    const userId = req.user._id; // Lấy ID người dùng từ đối tượng người dùng đã xác thực

    // Tìm đơn hàng của người dùng theo ID
    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      return res.status(404).json({ msg: "Order not found" }); // Xử lý trường hợp không tìm thấy đơn hàng
    }

    // Tìm chi tiết đơn hàng theo ID đơn hàng
    const orderDetails = await OrderDetail.find({ order: orderId }).populate({
      path: "product",
      populate: {
        path: "category_id", // Chỉ ra đúng field 'category_id' đã được định nghĩa trong Product schema
        select: "Name", // Chỉ lấy trường Name của Category
      },
    });
    console.log("Order Details:", orderDetails);

    res.status(200).json({ order, orderDetails }); // Trả về đơn hàng và chi tiết đơn hàng
  } catch (err) {
    console.error("Error fetching order:", err); // Ghi lại lỗi nếu có
    res.status(500).json({ msg: "Error fetching order" }); // Phản hồi lỗi server
  }
});

// Fetch order details by orderId
// Lấy thông tin chi tiết đơn hàng theo orderId
router.get("/order/:orderId", async (req, res) => {
  try {
    const orderId = req.params.orderId; // Lấy ID đơn hàng từ tham số đường dẫn

    // Tìm đơn hàng theo ID và nạp thông tin sản phẩm
    const order = await Order.findById(orderId).populate("items.product");

    if (!order) {
      return res.status(404).json({ msg: "Order not found" }); // Xử lý trường hợp không tìm thấy đơn hàng
    }

    // Tìm chi tiết đơn hàng theo ID đơn hàng
    const orderDetails = await OrderDetail.find({ order: orderId }).populate({
      path: "product",
      populate: {
        path: "category_id", // Chỉ ra đúng field 'category_id' đã được định nghĩa trong Product schema
        select: "Name", // Chỉ lấy trường Name của Category
      },
    });
    console.log("Order Details:", orderDetails);

    res.status(200).json(order); // Trả về đơn hàng
  } catch (error) {
    console.error("Error fetching order details:", error); // Ghi lại lỗi nếu có
    res.status(500).json({ msg: "Error fetching order details" }); // Phản hồi lỗi server
  }
});

// Fetch all orders for a user
// Lấy tất cả đơn hàng của người dùng
router.get("/user/:userId", isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params; // Lấy ID người dùng từ tham số đường dẫn

    // Kiểm tra quyền truy cập, đảm bảo người dùng đang yêu cầu đơn hàng của chính mình
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ msg: "Unauthorized" }); // Xử lý trường hợp không được phép truy cập
    }

    // Tìm tất cả đơn hàng của người dùng, nạp thông tin sản phẩm và sắp xếp theo ngày tạo giảm dần
    const orders = await Order.find({ user: userId })
      .populate({
        path: "items.product",
        populate: {
          path: "category_id", // Chỉ ra đúng field 'category_id' đã được định nghĩa trong Product schema
          select: "Name", // Chỉ lấy trường Name của Category
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(orders); // Trả về danh sách đơn hàng
  } catch (err) {
    console.error("Error fetching user orders:", err); // Ghi lại lỗi nếu có
    res.status(500).json({ msg: "Error fetching user orders" }); // Phản hồi lỗi server
  }
});

// Handle checkout cancellation
// Xử lý hủy thanh toán
router.get("/checkout/cancel", isAuthenticated, async (req, res) => {
  try {
    const { order_id } = req.query; // Lấy ID đơn hàng từ query parameters

    if (!order_id) {
      return res.status(400).json({ error: "Order ID is required" }); // Xử lý trường hợp thiếu ID đơn hàng
    }

    // Tìm đơn hàng và cập nhật trạng thái thành 'unpaid'
    const order = await Order.findByIdAndUpdate(
      order_id,
      { status: "chưa thanh toán" },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" }); // Xử lý trường hợp không tìm thấy đơn hàng
    }

    res.status(200).json({ message: "Order status updated to unpaid", order }); // Trả về thông báo thành công
  } catch (error) {
    console.error("Error updating order status:", error); // Ghi lại lỗi nếu có
    res
      .status(500)
      .json({ error: "An error occurred while updating order status" }); // Phản hồi lỗi server
  }
});

// Process a refund
// Xử lý hoàn tiền
router.post("/refund", async (req, res) => {
  const { orderId, paymentIntentId } = req.body; // Lấy thông tin đơn hàng và paymentIntentId từ request body

  console.log("Received orderId:", orderId);
  console.log("Received paymentIntentId:", paymentIntentId);

  if (!paymentIntentId) {
    return res
      .status(400)
      .json({ msg: "Payment Intent ID is required for refund" }); // Xử lý trường hợp thiếu paymentIntentId
  }

  try {
    // Tạo hoàn tiền trên Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });

    // Cập nhật trạng thái đơn hàng thành "refund" và đặt tổng số tiền thành 0
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ msg: "Order not found" }); // Xử lý trường hợp không tìm thấy đơn hàng
    }

    order.status = "hoàn trả";
    order.total = 0;

    await order.save();

    res.status(200).json({ msg: "Refund successful", refund, order }); // Trả về thông báo thành công và thông tin hoàn tiền
  } catch (error) {
    console.error("Refund error:", error); // Ghi lại lỗi nếu có
    res.status(500).json({ msg: "Error processing refund", error }); // Phản hồi lỗi server
  }
});

// Tính lại tổng số tiền của đơn hàng dựa trên các sản phẩm trong đơn hàng
const calculateTotal = (items) => {
  return items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
};

// Xử lý yêu cầu hoàn tiền của người dùng
router.post("/request-refund", isAuthenticated, async (req, res) => {
  const { orderId, refundReason } = req.body; // Lấy thông tin đơn hàng và lý do hoàn tiền từ request body

  try {
    const userId = req.user._id; // Lấy ID người dùng từ đối tượng người dùng đã xác thực

    // Tìm đơn hàng mà người dùng yêu cầu hoàn tiền
    const order = await Order.findOne({ _id: orderId, user: userId }).populate(
      "items.product"
    );

    if (!order) {
      return res.status(404).json({ msg: "Order not found" }); // Xử lý trường hợp không tìm thấy đơn hàng
    }

    // Cập nhật trạng thái đơn hàng thành "yêu cầu hoàn trả" và lưu lý do hoàn tiền
    order.status = "yêu cầu hoàn trả";
    order.refundReason = refundReason;

    // Tính lại tổng số tiền của đơn hàng
    order.total = calculateTotal(order.items);

    await order.save();

    res
      .status(200)
      .json({ msg: "Refund request submitted successfully", order }); // Trả về thông báo thành công
  } catch (error) {
    console.error("Error submitting refund request:", error); // Ghi lại lỗi nếu có
    res.status(500).json({ msg: "Error submitting refund request", error }); // Phản hồi lỗi server
  }
});

// Backend route to get order details by transaction reference
router.get("/order-details", isAuthenticated, async (req, res) => {
  try {
    const txnRef = req.query.txnRef; // Retrieve txnRef from query parameters

    if (!txnRef) {
      return res.status(400).json({ msg: "Thiếu tham số txnRef" }); // Bad request if txnRef is missing
    }

    // Fetch the order using the txnRef
    const order = await Order.findOne({ paymentIntentId: txnRef }).populate(
      "items.product"
    );

    if (!order) {
      return res.status(404).json({ msg: "Không tìm thấy đơn hàng" }); // Not found if order does not exist
    }

    res.json(order); // Return order details if found
  } catch (error) {
    console.error("Lỗi khi tìm đơn hàng:", error); // Log the error
    res.status(500).json({ msg: "Đã có lỗi xảy ra. Vui lòng thử lại sau." }); // Internal server error response
  }
});



// Router để cập nhật trạng thái khi người dùng xác nhận đã nhận hàng
router.put(
  "/orders/:orderId/received",
  isAuthenticated,
  async (req, res) => {
    try {
      const orderId = req.params.orderId;

      // Tìm kiếm đơn hàng theo ID
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ msg: "Order not found" });
      }

      // Kiểm tra xem trạng thái hiện tại có phù hợp để xác nhận nhận hàng hay không
      if (order.status !== "đã giao hàng" && order.status !== "đang vận chuyển") {
        return res.status(400).json({
          msg: "Order status is not eligible for received confirmation.",
        });
      }

      // Cập nhật trạng thái đơn hàng thành "đã nhận hàng"
      order.status = "đã nhận hàng";

      // Lưu thông tin cập nhật
      await order.save();

      res.status(200).json({
        msg: "Order status updated to 'đã nhận hàng'.",
        order,
      });
    } catch (error) {
      console.error("Error confirming received order:", error);
      res.status(500).json({ msg: "Error confirming received order." });
    }
  }
);

module.exports = router;

