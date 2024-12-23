const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const { isAuthenticated, isSalesStaff } = require("../middleware/auth");

router.get("/staff/orders", isAuthenticated, isSalesStaff, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { status, username } = req.query;

  // Tạo đối tượng điều kiện truy vấn (query) ban đầu
  let query = {};

  // Nếu có filter theo `status`, thêm điều kiện vào truy vấn
  if (status) {
    query.status = status;
  }

  // Nếu có filter theo `username`, thêm điều kiện vào truy vấn
  if (username) {
    query.username = { $regex: username, $options: "i" }; // Sử dụng regex để hỗ trợ tìm kiếm không phân biệt hoa thường
  }

  try {
    // Tìm kiếm các đơn hàng dựa trên điều kiện filter
    const orders = await Order.find(query)
      .populate({
        path: "items.product",
        model: "Product",
      })
      .skip((page - 1) * limit)
      .limit(limit);

    const count = await Order.countDocuments(query); // Đếm tổng số đơn hàng theo filter

    res.status(200).json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ msg: "Error fetching orders" });
  }
});


router.get("/staff1/orders", isAuthenticated, isSalesStaff, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { username } = req.query; // Bỏ qua `status` vì chỉ lấy 2 trạng thái cụ thể
  
    // Tạo đối tượng điều kiện truy vấn (query) ban đầu
    let query = {
      // Chỉ lấy các đơn hàng có trạng thái "chưa giải quyết" hoặc "từ chối đơn hàng"
      status: { $in: ["chưa giải quyết", "từ chối đơn hàng", "đang xử lý"] },
    };
  
    // Nếu có filter theo `username`, thêm điều kiện vào truy vấn
    if (username) {
      query.username = { $regex: username, $options: "i" }; // Sử dụng regex để hỗ trợ tìm kiếm không phân biệt hoa thường
    }
  
    try {
      // Tìm kiếm các đơn hàng dựa trên điều kiện filter
      const orders = await Order.find(query)
        .populate({
          path: "items.product",
          model: "Product",
        })
        .skip((page - 1) * limit)
        .limit(limit);
  
      const count = await Order.countDocuments(query); // Đếm tổng số đơn hàng theo filter
  
      res.status(200).json({
        orders,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ msg: "Error fetching orders" });
    }
  });

  router.get("/staff2/orders", isAuthenticated, isSalesStaff, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { username } = req.query; // Bỏ qua `status` vì chỉ lấy 2 trạng thái cụ thể
  
    // Tạo đối tượng điều kiện truy vấn (query) ban đầu
    let query = {
      // Chỉ lấy các đơn hàng có trạng thái "chưa giải quyết" hoặc "từ chối đơn hàng"
      status: { $in: ["đang xử lý", "từ chối đơn hàng", "đã bàn giao cho đơn vị vận chuyển"] },
    };
  
    // Nếu có filter theo `username`, thêm điều kiện vào truy vấn
    if (username) {
      query.username = { $regex: username, $options: "i" }; // Sử dụng regex để hỗ trợ tìm kiếm không phân biệt hoa thường
    }
  
    try {
      // Tìm kiếm các đơn hàng dựa trên điều kiện filter
      const orders = await Order.find(query)
        .populate({
          path: "items.product",
          model: "Product",
        })
        .skip((page - 1) * limit)
        .limit(limit);
  
      const count = await Order.countDocuments(query); // Đếm tổng số đơn hàng theo filter
  
      res.status(200).json({
        orders,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ msg: "Error fetching orders" });
    }
  });

  router.get("/staff3/orders", isAuthenticated, isSalesStaff, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { username } = req.query; // Bỏ qua `status` vì chỉ lấy 2 trạng thái cụ thể
  
    // Tạo đối tượng điều kiện truy vấn (query) ban đầu
    let query = {
      // Chỉ lấy các đơn hàng có trạng thái "chưa giải quyết" hoặc "từ chối đơn hàng"
      status: { $in: ["đã bàn giao cho đơn vị vận chuyển", "không liên lạc được người nhận", "đã giao hàng", "đang vận chuyển"] },
    };
  
    // Nếu có filter theo `username`, thêm điều kiện vào truy vấn
    if (username) {
      query.username = { $regex: username, $options: "i" }; // Sử dụng regex để hỗ trợ tìm kiếm không phân biệt hoa thường
    }
  
    try {
      // Tìm kiếm các đơn hàng dựa trên điều kiện filter
      const orders = await Order.find(query)
        .populate({
          path: "items.product",
          model: "Product",
        })
        .skip((page - 1) * limit)
        .limit(limit);
  
      const count = await Order.countDocuments(query); // Đếm tổng số đơn hàng theo filter
  
      res.status(200).json({
        orders,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ msg: "Error fetching orders" });
    }
  });
  

router.get(
  "/staff/orders/:orderId",
  isAuthenticated,
  isSalesStaff,
  async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId).populate("items.product");

      if (!order) {
        return res.status(404).json({ msg: "Order not found" });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ msg: "Error fetching order details" });
    }
  }
);

router.put(
  "/staff/orders/:orderId",
  isAuthenticated,
  isSalesStaff,
  async (req, res) => {
    try {
      const { status, refundReason } = req.body;
      const orderId = req.params.orderId;

      const updateData = { status };

      // Nếu có lý do từ chối, lưu lại lý do từ chối
      if (status === "từ chối đơn hàng" && refundReason) {
        updateData.refundReason = refundReason;
      }

      // Tìm đơn hàng và cập nhật
      const order = await Order.findByIdAndUpdate(orderId, updateData, {
        new: true,
      });

      if (!order) {
        return res.status(404).json({ msg: "Order not found" });
      }

      // Thêm một bản ghi tương tác mới vào interactions
      const interaction = {
        staff: req.user._id, // Lưu ID của nhân viên đang thực hiện
        action: `Cập nhật trạng thái thành "${status}"`, // Loại hành động
        timestamp: new Date(), // Thời gian hành động
      };

      // Cập nhật interactions cho đơn hàng
      order.interactions.push(interaction);
      await order.save();

      res.status(200).json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ msg: "Error updating order status" });
    }
  }
);

router.put(
  "/staff/orders/:orderId/payment",
  isAuthenticated,
  isSalesStaff,
  async (req, res) => {
    try {
      const { paymentStatus } = req.body;
      const orderId = req.params.orderId;

      const updateData = { paymentStatus };

      // Tìm đơn hàng và cập nhật paymentStatus
      const order = await Order.findByIdAndUpdate(orderId, updateData, {
        new: true,
      });

      if (!order) {
        return res.status(404).json({ msg: "Order not found" });
      }

      // Thêm bản ghi tương tác mới vào interactions
      const interaction = {
        staff: req.user._id, // ID của nhân viên
        action: `Cập nhật trạng thái thanh toán thành "${paymentStatus}"`, // Loại hành động
        timestamp: new Date(), // Thời gian hành động
      };

      // Cập nhật interactions cho đơn hàng
      order.interactions.push(interaction);
      await order.save();

      res.status(200).json(order);
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ msg: "Error updating payment status" });
    }
  }
);



router.delete(
  "/staff/orders/:orderId",
  isAuthenticated,
  isSalesStaff,
  async (req, res) => {
    try {
      const orderId = req.params.orderId;

      const order = await Order.findByIdAndDelete(orderId);

      if (!order) {
        return res.status(404).json({ msg: "Order not found" });
      }

      res.status(200).json({ msg: "Order deleted successfully" });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ msg: "Error deleting order" });
    }
  }
);

router.post("/staff/approve-refund", async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    if (order.status !== "yêu cầu hoàn trả") {
      return res
        .status(400)
        .json({ msg: "Order is not in refund request status" });
    }

    // Hiển thị lý do hoàn trả
    console.log("Refund Reason:", order.refundReason);

    // Thực hiện hoàn tiền trên Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
    });

    // Cập nhật trạng thái đơn hàng thành "refund" và đặt total về 0
    order.status = "hoàn trả";
    order.total = 0;

    await order.save();

    res
      .status(200)
      .json({ msg: "Refund approved and processed", refund, order });
  } catch (error) {
    console.error("Error approving refund:", error);
    res.status(500).json({ msg: "Error approving refund", error });
  }
});

router.get(
  "/staffdb/orders",
  isAuthenticated,
  isSalesStaff,
  async (req, res) => {
    try {
      // Tìm tất cả các đơn hàng có trạng thái là "chưa giải quyết"
      const orders = await Order.find({ status: "chưa giải quyết" })
        .populate({
          path: "items.product",
          model: "Product",
        })
        .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo (mới nhất trước)

      res.status(200).json({
        orders,
      });
    } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ msg: "Error fetching orders" });
    }
  }
);

router.get(
    "/staffdb2/orders",
    isAuthenticated,
    isSalesStaff,
    async (req, res) => {
      try {
        // Tìm tất cả các đơn hàng có trạng thái là "chưa giải quyết"
        const orders = await Order.find({ status: "đang xử lý" })
          .populate({
            path: "items.product",
            model: "Product",
          })
          .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo (mới nhất trước)
  
        res.status(200).json({
          orders,
        });
      } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({ msg: "Error fetching orders" });
      }
    }
  );

router.put(
  "/staff/orders/:orderId/status",
  isAuthenticated,
  isSalesStaff,
  async (req, res) => {
    const { status, refundReason } = req.body; // Lấy refundReason từ yêu cầu
    const { orderId } = req.params;

    try {
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ msg: "Order not found" });
      }

      // Nếu trạng thái là "từ chối", yêu cầu refundReason
      if (status === "từ chối" && !refundReason) {
        return res
          .status(400)
          .json({ msg: "Refund reason is required when rejecting an order" });
      }

      // Cập nhật trạng thái đơn hàng
      order.status = status;

      // Nếu đơn hàng bị từ chối, lưu refundReason
      if (status === "từ chối") {
        order.refundReason = refundReason;
      }

      await order.save();

      res.status(200).json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ msg: "Error updating order status" });
    }
  }
);

module.exports = router;
