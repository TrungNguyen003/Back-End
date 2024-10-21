const express = require("express");
const axios = require("axios");
const router = express.Router();

// Định nghĩa token API của GHN
const GHN_API_TOKEN = process.env.GHN_ACCESS_TOKEN; // Thay đổi với token của bạn
const GHN_API_URL = "https://api.ghn.vn/"; // URL của API GHN

// Middleware để xác thực với GHN
const ghnAuthHeaders = {
  headers: {
    "Content-Type": "application/json",
    Token: GHN_API_TOKEN,
  },
};

// Tạo đơn hàng giao hàng
router.post("/create", async (req, res) => {
  const orderDetails = req.body; // Đảm bảo rằng bạn đã gửi đầy đủ thông tin đơn hàng

  try {
    const response = await axios.post(
      `${GHN_API_URL}/create-order`,
      orderDetails,
      ghnAuthHeaders
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error creating GHN order:", error);
    res.status(500).send("Error creating GHN order");
  }
});

// Lấy thông tin đơn hàng giao hàng
router.get("/status/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const response = await axios.get(
      `${GHN_API_URL}/order/${orderId}`,
      ghnAuthHeaders
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error getting GHN order status:", error);
    res.status(500).send("Error getting GHN order status");
  }
});

// Cập nhật trạng thái đơn hàng giao hàng
router.put("/update/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const updateDetails = req.body;

  try {
    const response = await axios.put(
      `${GHN_API_URL}/order/${orderId}`,
      updateDetails,
      ghnAuthHeaders
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error updating GHN order:", error);
    res.status(500).send("Error updating GHN order");
  }
});

module.exports = router;
