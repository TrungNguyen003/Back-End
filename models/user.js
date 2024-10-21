const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

// User Schema
const UserSchema = new mongoose.Schema(
  {
    user_id: {
      type: Number,
      unique: true,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      required: true,
      maxlength: 50,
    },
    gmail: {
      type: String,
      unique: true,
      required: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: [
        "guest",
        "customer",
        "admin",
        "manager",
        "sales_staff_1",
        "sales_staff_2",
        "sales_staff_3",
        "shiper",
      ],
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    avatar: {
      type: String,
    },
    address: {
      type: String, // Add address field
      required: false,
    },
    phone: {
      type: String,
      match: [/^\+?(\d.*){3,}$/, "Please enter a valid phone number"], // Validation cơ bản cho số điện thoại
    },
    emailVerificationToken: String, // Thêm trường mã xác nhận
    emailVerificationExpires: Date, // Thêm trường thời gian hết hạn mã xác nhận
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Ensure indexes are created
UserSchema.index({ user_id: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ gmail: 1 });

const User = mongoose.model("User", UserSchema);

module.exports = User;
