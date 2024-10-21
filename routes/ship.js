const express = require("express");
const router = express.Router();
const axios = require("axios");
const Ship = require("../models/ship");
const { isAuthenticated } = require("../middleware/auth");

// Endpoint để tạo đơn hàng vận chuyển
router.post("/create", isAuthenticated, async (req, res) => {
  try {
    const {
      payment_type_id,
      note,
      required_note,
      return_phone,
      return_address,
      return_district_id,
      return_ward_code,
      client_order_code,
      from_name,
      from_phone,
      from_address,
      from_ward_name,
      from_district_name,
      from_province_name,
      to_name,
      to_phone,
      to_address,
      to_ward_code,
      to_ward_name,
      to_district_name,
      to_province_name,
      cod_amount,
      content,
      weight,
      length,
      width,
      height,
      cod_failed_amount,
      pick_station_id,
      deliver_station_id,
      insurance_value,
      service_id,
      service_type_id,
      coupon,
      pickup_time,
      pick_shift,
      items,
    } = req.body;

    // Chuẩn bị dữ liệu cho yêu cầu API GHN
    const ghnData = {
      payment_type_id,
      note,
      required_note,
      return_phone,
      return_address,
      return_district_id,
      return_ward_code,
      client_order_code,
      from_name,
      from_phone,
      from_address,
      from_ward_name,
      from_district_name,
      from_province_name,
      to_name,
      to_phone,
      to_address,
      to_ward_code,
      to_ward_name,
      to_district_name,
      to_province_name,
      cod_amount,
      content,
      weight,
      length,
      width,
      height,
      cod_failed_amount,
      pick_station_id: parseInt(pick_station_id, 10) || 0, // Chuyển đổi thành số nguyên hoặc mặc định là 0
      deliver_station_id: parseInt(deliver_station_id, 10) || 0, // Chuyển đổi thành số nguyên hoặc mặc định là 0
      insurance_value,
      service_id: parseInt(service_id, 10) || 0, // Chuyển đổi thành số nguyên hoặc mặc định là 0
      service_type_id: parseInt(service_type_id, 10) || 0, // Chuyển đổi thành số nguyên hoặc mặc định là 0
      coupon,
      pickup_time,
      pick_shift,
      items,
    };

    // Gửi yêu cầu tới API GHN
    const response = await axios.post(
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create",
      ghnData,
      {
        headers: {
          "Content-Type": "application/json",
          ShopId: "194367", // Thay bằng Shop ID của bạn
          Token: "af00057e-605e-11ef-8e53-0a00184fe694", // Thay bằng API Token của bạn
        },
      }
    );

    // Trả kết quả về cho client
    res.status(200).json({
      msg: "Tạo đơn hàng vận chuyển thành công",
      data: response.data,
    });
  } catch (error) {
    console.error("Lỗi khi tạo đơn hàng vận chuyển:", error);
    res.status(500).json({ msg: "Lỗi khi tạo đơn hàng vận chuyển", error });
  }
});


// Endpoint để lấy thời gian giao hàng dự kiến
router.post("/leadtime", isAuthenticated, async (req, res) => {
  try {
    const { from_district_id, to_district_id, service_id, from_ward_code, to_ward_code } = req.body;

    // Dữ liệu yêu cầu API GHN để tính thời gian dự kiến giao hàng
    const leadtimeData = {
      from_district_id, // ID quận/huyện gửi hàng
      to_district_id, // ID quận/huyện nhận hàng
      service_id, // ID dịch vụ giao hàng
      from_ward_code, // Mã phường/xã gửi hàng
      to_ward_code, // Mã phường/xã nhận hàng
    };

    // Gửi yêu cầu tới API GHN để lấy thời gian giao hàng dự kiến
    const response = await axios.post(
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/leadtime",
      leadtimeData,
      {
        headers: {
          "Content-Type": "application/json",
          ShopId: "194367", // Thay bằng Shop ID của bạn
          Token: "af00057e-605e-11ef-8e53-0a00184fe694", // Thay bằng API Token của bạn
        },
      }
    );

    // Trả kết quả về cho client
    res.status(200).json({
      msg: "Thời gian giao hàng dự kiến lấy thành công",
      data: response.data,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thời gian giao hàng dự kiến:", error);
    res.status(500).json({ msg: "Lỗi khi lấy thời gian giao hàng dự kiến", error });
  }
});

module.exports = router;


