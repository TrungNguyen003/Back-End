const express = require("express");
const router = express.Router();
const Category = require("../models/category");

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 15;
    const filterName = req.query.name || ""; // Lọc theo tên
    const filterID = req.query.categoryId || ""; // Lọc theo Category ID

    // Xây dựng điều kiện tìm kiếm
    const query = {};
    if (filterName) {
      query.Name = { $regex: filterName, $options: "i" }; // Tìm kiếm theo tên, không phân biệt hoa thường
    }
    if (filterID) {
      query.Category_ID = filterID; // Tìm kiếm theo Category ID chính xác
    }

    // Tìm danh mục với phân trang và điều kiện lọc
    const categories = await Category.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const totalCategories = await Category.countDocuments(query); // Đếm tổng số danh mục thỏa mãn điều kiện

    res.json({
      categories,
      totalPages: Math.ceil(totalCategories / pageSize),
      currentPage: page,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


router.post("/add-category", async (req, res) => {
  try {
    const { Category_ID, Name, Description } = req.body; // Lấy dữ liệu từ request body

    // Validate input
    if (!Category_ID || !Name) {
      return res
        .status(400)
        .json({ message: "ID danh mục và tên là bắt buộc" }); // Xác nhận rằng ID và tên là bắt buộc
    }

    const newCategory = new Category({
      Category_ID,
      Name,
      Description,
    });

    await newCategory.save(); // Lưu danh mục mới vào cơ sở dữ liệu
    res
      .status(201)
      .json({ message: "Đã thêm danh mục thành công", category: newCategory }); // Phản hồi khi thành công
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error"); // Xử lý lỗi nếu có
  }
});


router.put("/edit-category/:id", async (req, res) => {
  try {
    const { id } = req.params; // Lấy ID của danh mục từ tham số đường dẫn
    const { Name, Description } = req.body; // Lấy dữ liệu từ request body

    // Validate input
    if (!Name) {
      return res.status(400).json({ message: "Tên là bắt buộc" }); // Xác nhận rằng tên là bắt buộc
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { Name, Description, Updated_At: Date.now() }, // Cập nhật danh mục với thông tin mới
      { new: true } // Trả về bản cập nhật mới nhất
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" }); // Xử lý trường hợp không tìm thấy danh mục
    }

    res.json({
      message: "Danh mục được cập nhật thành công",
      category: updatedCategory, // Phản hồi với danh mục đã cập nhật
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error"); // Xử lý lỗi nếu có
  }
});


router.delete("/delete-category/:id", async (req, res) => {
  try {
    const { id } = req.params; // Lấy ID của danh mục từ tham số đường dẫn

    const deletedCategory = await Category.findByIdAndDelete(id); // Xóa danh mục theo ID

    if (!deletedCategory) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" }); // Xử lý trường hợp không tìm thấy danh mục
    }

    res.json({ message: "Đã xóa danh mục thành công" }); // Phản hồi khi xóa thành công
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error"); // Xử lý lỗi nếu có
  }
});

module.exports = router;
