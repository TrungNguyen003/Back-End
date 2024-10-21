const User = require("../models/user");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { check, validationResult } = require("express-validator");


router.get("/", async (req, res) => {
  const { page = 1, limit = 10, username, role } = req.query;

  try {
    const query = {};
    if (username) {
      query.username = { $regex: username, $options: "i" }; // Case-insensitive search
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(query); // Count total users matching the filter
    const totalPages = Math.ceil(totalUsers / limit);

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


router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id); // Tìm người dùng theo ID từ tham số đường dẫn
    if (!user) {
      return res.status(404).json({ msg: 'User not found' }); // Xử lý trường hợp không tìm thấy người dùng
    }
    res.json({ user }); // Phản hồi với thông tin người dùng
  } catch (err) {
    console.error(err); // Ghi lại lỗi nếu có
    res.status(500).json({ msg: 'Server error' }); // Phản hồi lỗi server
  }
});

// Hàm tạo `user_id` tự động
async function generateUniqueUserId() {
  let userId;
  let user;
  do {
    userId = Math.floor(Math.random() * 1000000); // Tạo số ngẫu nhiên từ 0 đến 999999
    user = await User.findOne({ user_id: userId }); // Kiểm tra xem ID này đã tồn tại chưa
  } while (user); // Lặp lại cho đến khi tìm thấy một ID không trùng lặp
  return userId; // Trả về ID không trùng lặp
}


router.post(
  "/register",
  [
    check("username", "Tên đăng nhập là bắt buộc").notEmpty(), // Kiểm tra trường username không rỗng
    check("password", "Mật khẩu là bắt buộc").notEmpty(), // Kiểm tra trường password không rỗng
    check("password2", "Xác nhận mật khẩu là bắt buộc").notEmpty(), // Kiểm tra trường password2 không rỗng
    check("role", "Vai trò là bắt buộc").notEmpty(), // Kiểm tra trường role không rỗng
  ],
  async (req, res) => {
    const errors = validationResult(req); // Lấy danh sách lỗi xác thực từ request
    const { username, password, password2, role } = req.body; // Lấy dữ liệu từ request body

    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array()); // In ra các lỗi xác thực
      return res.status(400).json({ errors: errors.array() }); // Phản hồi với các lỗi xác thực
    }

    if (password !== password2) {
      return res
        .status(400)
        .json({ errors: [{ param: "password2", msg: "Mật khẩu không khớp" }] }); // Xử lý trường hợp mật khẩu không khớp
    }

    User.findOne({ username }).then(async (user) => {
      if (user) {
        return res.status(400).json({ msg: "Tên đăng nhập đã tồn tại" }); // Xử lý trường hợp tên đăng nhập đã tồn tại
      } else {
        const userId = await generateUniqueUserId(); // Tạo ID người dùng duy nhất
        const newUser = new User({
          user_id: userId,
          username,
          password,
          role
        });

        bcrypt.genSalt(10, (err, salt) => {
          if (err) {
            console.error(err); // Ghi lại lỗi nếu có
            return res.status(500).json({ msg: "Lỗi máy chủ" }); // Phản hồi lỗi server
          }
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) {
              console.error(err); // Ghi lại lỗi nếu có
              return res.status(500).json({ msg: "Lỗi máy chủ" }); // Phản hồi lỗi server
            }
            newUser.password = hash; // Đặt mật khẩu đã mã hóa vào người dùng mới
            newUser
              .save()
              .then(() => res.status(201).json({ msg: "Đăng ký thành công" })) // Phản hồi khi đăng ký thành công
              .catch((err) => {
                console.error(err); // Ghi lại lỗi nếu có
                return res.status(500).json({ msg: "Lỗi máy chủ" }); // Phản hồi lỗi server
              });
          });
        });
      }
    });
  }
);

module.exports = router;
