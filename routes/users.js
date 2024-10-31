const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const passport = require("passport");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");
const { sendVerificationEmail } = require('../utils/emailUtils'); 
const crypto = require('crypto');


// Hàm tạo `user_id` tự động
async function generateUniqueUserId() {
  let userId;
  let user;
  do {
    userId = Math.floor(Math.random() * 1000000); // Tạo số ngẫu nhiên từ 0 đến 999999
    user = await User.findOne({ user_id: userId });
  } while (user);
  return userId;
}

router.post("/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(400).json({ msg: "Thông tin đăng nhập không hợp lệ" });
    }

    try {
      // Kiểm tra xem người dùng đã xác nhận email chưa
      const foundUser = await User.findById(user._id);
      if (!foundUser.isVerified) {
        return res.status(400).json({ msg: "Bạn cần xác nhận email trước khi đăng nhập" });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        req.session.user = user;
        const token = jwt.sign({ id: user._id, role: user.role }, "0308", {
          expiresIn: "5h",
        });
        console.log(`Người dùng ${user.gmail} đã đăng nhập. Vai trò: ${user.role}`);
        res.json({
          msg: "Đăng nhập thành công",
          userId: user._id,
          token,
          role: user.role,
          user,
        });
      });
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
});


router.get("/users", async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    // Lấy danh sách người dùng theo phân trang
    const users = await User.find()
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(); // Tính tổng số người dùng
    const totalPages = Math.ceil(totalUsers / limit); // Tính số trang

    res.json({
      users,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post(
  "/register",
  [
    check("username", "Tên đăng nhập là bắt buộc").notEmpty(),
    check("gmail", "Gmail là bắt buộc").isEmail(),
    check("password", "Mật khẩu phải có ít nhất 8 ký tự, bao gồm 1 chữ hoa và 1 ký tự đặc biệt").matches(/^(?=.*[A-Z])(?=.*\W)[A-Za-z\d\W]{8,}$/),
    check("password2", "Xác nhận mật khẩu là bắt buộc").notEmpty(),
    check("role", "Vai trò là bắt buộc").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { username, gmail, password, password2, role } = req.body;

    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    if (password !== password2) {
      return res
        .status(400)
        .json({ errors: [{ param: "password2", msg: "Mật khẩu không khớp" }] });
    }

    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ msg: "Tên đăng nhập đã tồn tại" });
      }

      const userId = await generateUniqueUserId();
      const avatarPath = "/images/000.jpg";

      const token = crypto.randomBytes(20).toString("hex");

      const newUser = new User({
        user_id: userId,
        username,
        gmail,
        password,
        role,
        avatar: avatarPath,
        emailVerificationToken: token,
        emailVerificationExpires: Date.now() + 3600000,
      });

      const salt = await bcryptjs.genSalt(10);
      newUser.password = await bcryptjs.hash(newUser.password, salt);

      await newUser.save();

      await sendVerificationEmail(gmail, userId, token);

      res.status(201).json({ msg: "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Lỗi máy chủ" });
    }
  }
);

router.post("/send-verification-email", async (req, res) => {
  const { email, userId } = req.body;

  // Tạo token ngẫu nhiên
  const token = crypto.randomBytes(32).toString("hex");

  try {
    const verifyUrl = await sendVerificationEmail(email, userId, token);
    res.status(200).json({ success: true, verifyUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.get('/verify-email', async (req, res) => {
  const { token, userId } = req.query;

  try {
    const user = await User.findOne({
      user_id: userId,
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() } // Kiểm tra thời gian hết hạn
    });

    if (!user) {
      return res.status(400).json({ msg: 'Mã xác nhận không hợp lệ hoặc đã hết hạn.' });
    }

    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.isVerified = true;

    await user.save();

    res.status(200).json({ msg: 'Email đã được xác nhận thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi máy chủ' });
  }
});




router.get("/logout", (req, res) => {
  req.logout(); // Đăng xuất người dùng
  req.session.destroy(); // Hủy phiên người dùng
  res.status(200).json({ msg: "Đăng xuất thành công" }); // Phản hồi khi đăng xuất thành công
});

router.get("/check-auth", (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ isAuthenticated: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ isAuthenticated: false, message: "Invalid token format" });
  }

  jwt.verify(token, "0308", (err, decoded) => {
    if (err) {
      return res.status(401).json({ isAuthenticated: false, message: "Token verification failed" });
    }

    User.findById(decoded.id, (err, user) => {
      if (err || !user) {
        return res.status(401).json({ isAuthenticated: false, message: "User not found" });
      }

      res.status(200).json({ isAuthenticated: true, role: user.role, user });
    });
  });
});

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ msg: 'Invalid token format' });
  }

  jwt.verify(token, '0308', (err, decoded) => {
    if (err) {
      return res.status(401).json({ msg: 'Invalid token' });
    }

    req.user = decoded;
    next();
  });
};


router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/upload-avatar", authenticateJWT, async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ msg: "Avatar is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.avatar = avatar;
    await user.save();

    res
      .status(200)
      .json({ msg: "Avatar updated successfully", avatar: user.avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/update-address", authenticateJWT, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ msg: "Address is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.address = address;
    await user.save();

    res
      .status(200)
      .json({ msg: "Address updated successfully", address: user.address });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});




router.post("/update-username", authenticateJWT, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ msg: "Username is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Kiểm tra xem username mới có bị trùng lặp không
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(400)
        .json({ msg: "Tên đăng nhập đã tồn tại, vui lòng chọn tên khác" });
    }

    user.username = username;
    await user.save();

    res
      .status(200)
      .json({ msg: "Username updated successfully", username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post("/change-password", authenticateJWT, async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  // Kiểm tra các trường dữ liệu
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ msg: "Vui lòng nhập đầy đủ thông tin" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ msg: "Mật khẩu mới và xác nhận mật khẩu không khớp" });
  }

  // Kiểm tra độ mạnh của mật khẩu
  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      msg: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm 1 chữ hoa và 1 ký tự đặc biệt",
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcryptjs.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Mật khẩu hiện tại không chính xác" });
    }

    // Hash mật khẩu mới và cập nhật
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ msg: "Mật khẩu đã được thay đổi thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


router.post("/update-phone", authenticateJWT, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ msg: "Phone number is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.phone = phone;
    await user.save();

    res.status(200).json({ phone: user.phone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


module.exports = router;
