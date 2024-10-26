const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // Import mongoose
const PetSpaBooking = require("../models/PetSpaBooking");
const { isAuthenticated, isAdmin } = require("../middleware/auth");

// Route tạo đơn đặt lịch mới
// Route to create a new booking
router.post("/bookings", async (req, res) => {
  try {
    const {
      petName,
      petType,
      owner,
      selectedServices,
      bookingDate,
      additionalNotes,
    } = req.body;

    // Ensure owner is a valid ObjectId
    if (!mongoose.isValidObjectId(owner)) {
      return res.status(400).json({ message: "Invalid owner ID" });
    }

    const servicesWithPrice = selectedServices.map((service) => {
      if (!service.serviceName || !service.price) {
        throw new Error(
          "Service name and price are required for all selected services"
        );
      }
      return service;
    });

    const newBooking = new PetSpaBooking({
      petName,
      petType,
      owner,
      selectedServices: servicesWithPrice,
      bookingDate,
      additionalNotes,
    });

    await newBooking.save();
    res
      .status(201)
      .json({ message: "Booking created successfully", booking: newBooking });
  } catch (error) {
    console.error("Error creating booking:", error); // Log detailed error
    res
      .status(500)
      .json({ message: "Failed to create booking", error: error.message });
  }
});

// Route lấy danh sách tất cả các đơn đặt lịch
router.get("/bookings", async (req, res) => {
  try {
    const bookings = await PetSpaBooking.find().populate(
      "owner",
      "username email"
    );
    res.status(200).json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get bookings", error: error.message });
  }
});

// Route lấy chi tiết một đơn đặt lịch
router.get("/bookings/:id", async (req, res) => {
  try {
    const booking = await PetSpaBooking.findById(req.params.id).populate(
      "owner",
      "username email"
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.status(200).json(booking);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get booking", error: error.message });
  }
});

// Route cập nhật trạng thái đơn đặt lịch
router.put("/bookings/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await PetSpaBooking.findByIdAndUpdate(
      req.params.id,
      { bookingStatus: status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({ message: "Booking status updated", booking });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update booking status",
      error: error.message,
    });
  }
});

// Route xóa (hủy) một đơn đặt lịch
router.delete("/bookings/:id", async (req, res) => {
  try {
    const booking = await PetSpaBooking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({ message: "Booking canceled successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to cancel booking", error: error.message });
  }
});

// Route lấy danh sách các đơn đặt lịch của một người dùng đã đăng nhập
router.get("/my-bookings", isAuthenticated, async (req, res) => {
  try {
    // Lấy ID người dùng từ req.user (sau khi đã xác thực)
    const userId = req.user._id;

    // Tìm tất cả các đơn đặt lịch của người dùng
    const bookings = await PetSpaBooking.find({ owner: userId }).populate(
      "owner",
      "username email"
    );

    if (!bookings || bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this user" });
    }

    res.status(200).json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get user bookings", error: error.message });
  }
});

// Route lấy danh sách tất cả các đơn đặt lịch cho admin
router.get("/admin/bookings", isAuthenticated, async (req, res) => {
  try {
    const bookings = await PetSpaBooking.find().populate(
      "owner",
      "username email"
    );
    res.status(200).json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get bookings", error: error.message });
  }
});

// Route cập nhật trạng thái đơn đặt lịch cho admin
router.put(
  "/admin/bookings/:id",
  isAuthenticated,
  async (req, res) => {
    try {
      const { status } = req.body;
      const booking = await PetSpaBooking.findByIdAndUpdate(
        req.params.id,
        { bookingStatus: status },
        { new: true }
      );

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.status(200).json({ message: "Booking status updated", booking });
    } catch (error) {
      res
        .status(500)
        .json({
          message: "Failed to update booking status",
          error: error.message,
        });
    }
  }
);

// Route xóa (hủy) một đơn đặt lịch cho admin
router.delete(
  "/admin/bookings/:id",
  isAuthenticated,
  async (req, res) => {
    try {
      const booking = await PetSpaBooking.findByIdAndDelete(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.status(200).json({ message: "Booking canceled successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to cancel booking", error: error.message });
    }
  }
);

module.exports = router;
