const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const fs = require("fs");
const path = require("path");
const Category = require("../models/category");
const mongoose = require("mongoose");

router.get("/products/all", async (req, res) => {
  try {
    const products = await Product.find({}).populate("category_id"); // Lấy tất cả sản phẩm và nạp thông tin danh mục

    // Chuyển đổi giá từ Decimal128 sang số thực và định dạng VND
    const formattedProducts = products.map((product) => ({
      ...product._doc, // Sao chép tất cả các thuộc tính của sản phẩm
      price: parseFloat(product.price.toString()), // Chuyển đổi giá
    }));

    res.json({ products: formattedProducts }); // Trả về danh sách sản phẩm
  } catch (err) {
    console.error("Error retrieving all products:", err);
    res.status(500).json({ error: "Error retrieving all products" }); // Phản hồi lỗi server
  }
});

router.get("/products", async (req, res) => {
  const { category_id, limit = 10 } = req.query;
  try {
    const products = await Product.find({ category_id }) // Lọc theo category_id
      .limit(parseInt(limit))
      .populate("category_id"); // Populate để lấy thông tin chi tiết của category

    // Chuyển đổi giá từ Decimal128 sang số thực và định dạng VND
    const formattedProducts = products.map((product) => ({
      ...product._doc, // Sao chép tất cả các thuộc tính của sản phẩm
      price: parseFloat(product.price.toString()), // Chuyển đổi giá
    }));

    res.json({ products: formattedProducts });
  } catch (err) {
    console.error("Error retrieving products:", err);
    res.status(500).json({ error: "Error retrieving products" });
  }
});

router.get("/products/category", async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;

  try {
    // Tìm danh mục theo tên tìm kiếm
    const category = await Category.findOne({ Name: new RegExp(query, "i") });

    if (!category) {
      return res.json({ products: [], totalPages: 0 }); // Trả về mảng rỗng nếu không tìm thấy danh mục
    }

    // Tìm các sản phẩm thuộc danh mục, phân trang
    const products = await Product.find({ category_id: category._id })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("category_id");

    // Đếm tổng số sản phẩm và tính số trang
    const totalProducts = await Product.countDocuments({
      category_id: category._id,
    });
    const totalPages = Math.ceil(totalProducts / limit);

    // Chuyển đổi dữ liệu sản phẩm để xử lý giá Decimal128
    const transformedProducts = products.map((product) => {
      const productObj = product.toObject();
      if (productObj.price && productObj.price.$numberDecimal) {
        productObj.price = parseFloat(productObj.price.$numberDecimal); // Chuyển đổi giá thành số thực
      }
      return productObj;
    });

    res.json({
      products: transformedProducts,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error("Error retrieving products by category:", err);
    res.status(500).json({ error: "Error retrieving products by category" });
  }
});

router.get("/product/:id", async (req, res) => {
  try {
    console.log(`Fetching product with ID: ${req.params.id}`);

    // Tìm sản phẩm theo ID và nạp thông tin danh mục
    const product = await Product.findById(req.params.id).populate(
      "category_id"
    );

    if (!product) {
      console.log(`Product with ID: ${req.params.id} not found`);
      return res.status(404).json({ message: "Product not found" });
    }

    // Chuyển đổi giá từ Decimal128 sang số thực nếu cần
    const price =
      product.price instanceof mongoose.Types.Decimal128
        ? parseFloat(product.price.toString())
        : product.price;

    // Chuyển đổi giá trong prices_by_weight
    const pricesByWeight = product.prices_by_weight.map((item) => ({
      weight: item.weight,
      price:
        item.price instanceof mongoose.Types.Decimal128
          ? parseFloat(item.price.toString())
          : item.price,
    }));

    // Xác định thư mục hình ảnh của sản phẩm
    const galleryDir = path.join(
      __dirname,
      "..",
      "public",
      "product_images",
      product._id.toString(),
      "gallery"
    );
    let galleryImages = [];

    // Kiểm tra nếu thư mục hình ảnh tồn tại và đọc danh sách hình ảnh
    if (fs.existsSync(galleryDir)) {
      galleryImages = fs.readdirSync(galleryDir);
    }

    // Trả dữ liệu về phía client
    res.json({
      product: {
        ...product.toObject(),
        price, // Đảm bảo rằng giá là một số thực
        galleryImages,
        prices_by_weight: pricesByWeight, // Thêm prices_by_weight vào phản hồi sau khi chuyển đổi
      },
    });
  } catch (err) {
    console.error(`Error retrieving product with ID: ${req.params.id}`, err);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/products/search", async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;

  try {
    // Tìm danh mục theo tên tìm kiếm
    const category = await Category.findOne({ Name: new RegExp(query, "i") });

    if (!category) {
      return res.json({ products: [], totalPages: 0 }); // Trả về mảng rỗng nếu không tìm thấy danh mục
    }

    // Đếm tổng số sản phẩm và tính số trang
    const totalProducts = await Product.countDocuments({
      category_id: category._id,
    });
    const totalPages = Math.ceil(totalProducts / limit);

    // Tìm sản phẩm thuộc danh mục và phân trang
    const products = await Product.find({ category_id: category._id })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("category_id");

    // Chuyển đổi dữ liệu sản phẩm để xử lý giá Decimal128
    const transformedProducts = products.map((product) => {
      const productObj = product.toObject();
      if (productObj.price && productObj.price.$numberDecimal) {
        // Chuyển đổi giá thành số thực và định dạng VND
        productObj.price = parseFloat(
          productObj.price.$numberDecimal
        ).toLocaleString("vi-VN", {
          style: "currency",
          currency: "VND",
        });
      }
      return productObj;
    });

    res.json({ products: transformedProducts, totalPages });
  } catch (err) {
    console.error("Error searching for products:", err); // Ghi lại lỗi nếu có
    res.status(500).json({ error: "Error searching for products" }); // Phản hồi lỗi server
  }
});

router.get("/products/searchh", async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;

  try {
    // Đếm tổng số sản phẩm theo tên sản phẩm
    const totalProducts = await Product.countDocuments({
      name: new RegExp(query, "i"), // Tìm kiếm không phân biệt hoa thường với từ khóa
    });
    const totalPages = Math.ceil(totalProducts / limit);

    // Tìm sản phẩm theo tên và phân trang
    const products = await Product.find({
      name: new RegExp(query, "i"), // Sử dụng biểu thức chính quy để tìm kiếm
    })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("category_id");

    // Chuyển đổi dữ liệu sản phẩm để xử lý giá Decimal128
    const transformedProducts = products.map((product) => {
      const productObj = product.toObject();
      if (productObj.price && productObj.price.$numberDecimal) {
        // Chuyển đổi giá thành số thực và định dạng VND
        productObj.price = parseFloat(
          productObj.price.$numberDecimal
        ).toLocaleString("vi-VN", {
          style: "currency",
          currency: "VND",
        });
      }
      return productObj;
    });

    res.json({ products: transformedProducts, totalPages });
  } catch (err) {
    console.error("Error searching for products:", err); // Ghi lại lỗi nếu có
    res.status(500).json({ error: "Error searching for products" }); // Phản hồi lỗi server
  }
});

// Suggestions for category names
// Gợi ý các danh mục theo tên tìm kiếm
router.get("/categories/suggestions", async (req, res) => {
  const { query } = req.query;

  try {
    // Tìm các sản phẩm có tên chứa chuỗi tìm kiếm, giới hạn số lượng kết quả
    const suggestions = await Product.find(
      { name: new RegExp(query, "i") }, // Tìm kiếm không phân biệt hoa thường
      { name: 1 } // Chỉ lấy trường 'Name'
    ).limit(10);

    res.json(suggestions); // Trả về gợi ý sản phẩm
  } catch (err) {
    console.error("Error getting product suggestions:", err); // Ghi lại lỗi nếu có
    res.status(500).json({ error: "Error getting product suggestions" }); // Phản hồi lỗi server
  }
});

router.get("/products/random", async (req, res) => {
  try {
    const count = await Product.countDocuments(); // Đếm tổng số sản phẩm
    const random = Math.floor(Math.random() * count); // Tạo một chỉ số ngẫu nhiên

    // Lấy 5 sản phẩm ngẫu nhiên bắt đầu từ chỉ số ngẫu nhiên
    const products = await Product.find()
      .skip(random)
      .limit(5)
      .populate("category_id");

    // Chuyển đổi giá từ Decimal128 sang số thực và định dạng VND
    const formattedProducts = products.map((product) => ({
      ...product._doc, // Sao chép tất cả các thuộc tính của sản phẩm
      price: parseFloat(product.price.toString()), // Chuyển đổi giá
    }));

    res.json({ products: formattedProducts });
  } catch (err) {
    console.error("Error retrieving random products:", err);
    res.status(500).json({ error: "Error retrieving random products" });
  }
});

module.exports = router;
