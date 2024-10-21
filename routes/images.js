const express = require("express");
const router = express.Router();
const path = require("path");
// Tuyến đường GET để hiển thị hình ảnh sản phẩm từ thư mục public/product_images
router.get("/product_images/:productId/gallery/:image", (req, res) => {
  const productId = req.params.productId;
  const imageName = req.params.image;
  const imagePath = path.join(__dirname, `../public/product_images/${productId}/gallery/${imageName}`);
  
  // Phục vụ hình ảnh
  res.sendFile(imagePath);
});

module.exports = router;
