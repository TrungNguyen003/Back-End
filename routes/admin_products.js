const express = require("express");
const router = express.Router();
const mkdirp = require("mkdirp");
const fs = require("fs-extra");
const resizeImg = require("resize-img");
const mongoose = require("mongoose");
const Product = require("../models/product");
const Category = require("../models/category");
const { body, validationResult } = require("express-validator");

router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 5, name, category, price } = req.query;
    const query = {};

    // Áp dụng bộ lọc name nếu có
    if (name) {
      query.name = { $regex: name, $options: "i" }; // Tìm kiếm không phân biệt chữ hoa/chữ thường
    }

    // Áp dụng bộ lọc price nếu có
    if (price) {
      query.price = { $lte: Number(price) }; // Lọc theo giá nhỏ hơn hoặc bằng giá trị nhập
    }

    // Áp dụng bộ lọc category nếu có
    if (category) {
      const categoryDoc = await Category.findOne({
        Name: { $regex: category, $options: "i" },
      });

      // Nếu tìm thấy category, lấy ID của nó
      if (categoryDoc) {
        query.category_id = categoryDoc._id;
      } else {
        // Nếu không tìm thấy category, trả về mảng rỗng
        return res.json({ products: [], count: 0 });
      }
    }

    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate("category_id")
      .sort({ createdAt: -1 }) // Sắp xếp giảm dần theo createdAt
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const formattedProducts = products.map((product) => ({
      ...product.toObject(),
      price: parseFloat(product.price.toString()),
    }));

    res.json({ products: formattedProducts, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});


router.post(
  "/add-product",
  [
    body("name").notEmpty().withMessage("Tiêu đề phải có giá trị."),
    body("description").notEmpty().withMessage("Mô tả phải có giá trị."),
    body("price").isDecimal().withMessage("Giá phải có giá trị."),
    body("prices_by_weight").optional().isString(), // Xác nhận đây là chuỗi JSON
    body("prices_by_weight.*.weight")
      .optional()
      .isFloat({ gt: 0 })
      .withMessage("Cân nặng phải lớn hơn 0 nếu được cung cấp."),
    body("prices_by_weight.*.price")
      .optional()
      .isDecimal()
      .withMessage("Giá phải là số thập phân hợp lệ nếu được cung cấp."),
    body("image").custom((value, { req }) => {
      if (!req.files || !req.files.image) {
        throw new Error("Bạn phải tải lên một hình ảnh");
      }
      return true;
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const categories = await Category.find();
        return res.status(400).json({ errors: errors.array(), categories });
      }

      const imageFile = req.files.image ? req.files.image.name : "";
      const { name, description, price, category_id, stock, prices_by_weight } =
        req.body;

      const category = await Category.findById(category_id);
      if (!category) {
        return res.status(400).json({ message: "Category not found" });
      }

      const existingProduct = await Product.findOne({ name });
      if (existingProduct) {
        const categories = await Category.find();
        return res.status(400).json({
          message: "Tên sản phẩm đã tồn tại, chọn tên khác.",
          categories,
        });
      }

      // Xử lý prices_by_weight (giải mã chuỗi JSON nếu có)
      let processedPricesByWeight = [];
      if (prices_by_weight) {
        try {
          const parsedPricesByWeight = JSON.parse(prices_by_weight); // Giải mã chuỗi JSON
          processedPricesByWeight = parsedPricesByWeight.map((item) => ({
            weight: parseFloat(item.weight),
            price: mongoose.Types.Decimal128.fromString(
              parseFloat(item.price).toFixed(3)
            ),
          }));z
        } catch (error) {
          return res
            .status(400)
            .json({ message: "Invalid prices_by_weight format" });
        }
      }

      const product = new Product({
        product_id: new mongoose.Types.ObjectId(),
        category_id,
        name,
        description,
        price: mongoose.Types.Decimal128.fromString(
          parseFloat(price).toFixed(3)
        ), // Lưu trực tiếp giá VND
        stock,
        prices_by_weight: processedPricesByWeight, // Thêm mảng giá theo cân nặng
        image: imageFile,
      });

      await product.save();

      mkdirp.sync(`public/product_images/${product._id}`);
      mkdirp.sync(`public/product_images/${product._id}/gallery`);
      mkdirp.sync(`public/product_images/${product._id}/gallery/thumbs`);

      if (imageFile) {
        const productImage = req.files.image;
        const path = `public/product_images/${product._id}/${imageFile}`;
        productImage.mv(path, (err) => {
          if (err) return console.error(err);
        });
      }

      res.status(200).json({ message: "Product added successfully!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.get("/edit-product/:id", async (req, res) => {
  try {
    const categories = await Category.find({}, "_id Name"); // Lấy _id và Name của Category
    const product = await Product.findById(req.params.id).populate(
      "category_id"
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const galleryDir = `public/product_images/${product._id}/gallery`;
    let galleryImages = [];

    if (fs.existsSync(galleryDir)) {
      galleryImages = fs.readdirSync(galleryDir);
    }

    // Thêm prices_by_weight vào phản hồi
    const pricesByWeight = product.prices_by_weight.map((item) => ({
      weight: item.weight ? item.weight.toString() : "",
      price: item.price ? item.price.toString() : "",
    }));

    res.json({
      product: {
        product_id: product.product_id,
        name: product.name,
        description: product.description,
        category_id: product.category_id ? product.category_id._id : "",
        categoryName: product.category_id ? product.category_id.Name : "", // Thêm tên của Category
        price: product.price ? product.price.toString() : "",
        stock: product.stock,
        prices_by_weight: pricesByWeight, // Thêm prices_by_weight
        image: product.image,
        galleryImages,
        id: product._id,
      },
      categories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

const { isArray } = require("lodash"); // Import lodash để kiểm tra mảng

router.post(
  "/edit-product/:id",
  [
    body("name").notEmpty().withMessage("Tiêu đề phải có giá trị."),
    body("description").notEmpty().withMessage("Mô tả phải có giá trị."),
    body("price").isDecimal().withMessage("Giá phải có giá trị."),
    // Custom validation cho prices_by_weight để chấp nhận chuỗi JSON
    body("prices_by_weight").custom((value) => {
      try {
        const parsedValue = JSON.parse(value);
        if (!isArray(parsedValue)) {
          throw new Error("Prices by weight phải là một mảng.");
        }
        return true;
      } catch (err) {
        throw new Error("Prices by weight phải là một mảng hợp lệ.");
      }
    }),
  ],
  async (req, res) => {
    const { id } = req.params;
    const errors = validationResult(req);

    console.log(
      `Người dùng ${
        req.user?.email || "không xác định"
      } đang cố gắng chỉnh sửa sản phẩm ID: ${id}`
    );
    if (!errors.isEmpty()) {
      req.session.errors = errors;
      console.log("Lỗi validation:", errors.array());
      return res.redirect(`/admin/products/edit-product/${id}`);
    }

    try {
      const imageFile =
        req.files && req.files.image ? req.files.image.name : "";

      const {
        name,
        description,
        price,
        category_id,
        stock,
        pimage,
        prices_by_weight,
      } = req.body;

      console.log("Dữ liệu nhận được:", {
        name,
        description,
        price,
        category_id,
        stock,
        prices_by_weight,
      });

      const existingProduct = await Product.findOne({ name, _id: { $ne: id } });
      if (existingProduct) {
        req.flash("danger", "Tên sản phẩm đã tồn tại, chọn tên khác.");
        console.log("Tên sản phẩm đã tồn tại:", name);
        return res.redirect(`/admin/products/edit-product/${id}`);
      }

      const product = await Product.findById(id);
      if (!product) {
        req.flash("danger", "Không tìm thấy sản phẩm.");
        console.log("Không tìm thấy sản phẩm với ID:", id);
        return res.redirect("/admin/products");
      }

      const category = await Category.findById(category_id);
      if (!category) {
        req.flash("danger", "Không tìm thấy danh mục.");
        console.log("Không tìm thấy danh mục với ID:", category_id);
        return res.redirect(`/admin/products/edit-product/${id}`);
      }



      product.name = name;
      product.description = description;
      product.price = mongoose.Types.Decimal128.fromString(parseFloat(price).toFixed(3));
      product.category_id = category_id;
      product.stock = stock;
      product.prices_by_weight = JSON.parse(prices_by_weight);

      if (imageFile) {
        product.image = imageFile;
      }

      await product.save();

      if (imageFile) {
        if (pimage) {
          await fs.remove(`public/product_images/${id}/${pimage}`);
        }

        const productImage = req.files.image;
        const path = `public/product_images/${id}/${imageFile}`;
        await productImage.mv(path);
      }

      req.flash("success", "Sản phẩm đã được chỉnh sửa!");
      console.log(
        `Sản phẩm ${id} đã được chỉnh sửa thành công bởi ${
          req.user?.email || "không xác định"
        }`
      );
      res.redirect("/admin/products");
    } catch (err) {
      console.error("Lỗi server:", err);
      req.flash("danger", "Server error");
      res.redirect(`/admin/products/edit-product/${id}`);
    }
  }
);

router.get("/delete-product/:id", function (req, res) {
  const id = req.params.id;
  const path = "public/product_images/" + id;

  fs.remove(path, function (err) {
    if (err) {
      console.log(err);
    } else {
      Product.findByIdAndRemove(id, function (err) {
        if (err) {
          console.log(err);
        } else {
          req.flash("success", "Sản phẩm đã bị xóa!");
          res.redirect("/admin/products");
        }
      });
    }
  });
});

router.post("/product-gallery/:id", function (req, res) {
  const productImages = req.files.images; // Expect an array of files
  const id = req.params.id;

  if (!Array.isArray(productImages)) {
    return res.status(400).json({ message: "No images uploaded" });
  }

  productImages.forEach((image) => {
    const path = `public/product_images/${id}/gallery/${image.name}`;
    const thumbsPath = `public/product_images/${id}/gallery/thumbs/${image.name}`;

    image.mv(path, function (err) {
      if (err) {
        return console.log(err);
      }

      resizeImg(fs.readFileSync(path), { width: 100, height: 100 }).then(
        function (buf) {
          fs.writeFileSync(thumbsPath, buf);
        }
      );
    });
  });

  res.sendStatus(200);
});

router.delete("/delete-image/:image", async (req, res) => {
  try {
    const productId = req.query.id;
    const imageName = req.params.image;

    const originalImage = `public/product_images/${productId}/gallery/${imageName}`;
    const thumbImage = `public/product_images/${productId}/gallery/thumbs/${imageName}`;

    // Xóa hình ảnh gốc
    await fs.remove(originalImage);
    // Xóa hình ảnh thumbnail
    await fs.remove(thumbImage);

    res.json({ success: true, message: "Đã xóa hình ảnh!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi khi xóa hình ảnh" });
  }
});

module.exports = router;
