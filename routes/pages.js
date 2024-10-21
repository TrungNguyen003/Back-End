var express = require("express");
var router = express.Router();

// lấy Page model
var Page = require("../models/page");

/*
 * lấy trang chủ /
 */
router.get("/", function (req, res) {
  Page.findOne({ slug: "home" }, function (err, page) {
    if (err) console.log(err);

    res.json({ title: page.title, content: page.content }); // Trả về dữ liệu JSON thay vì render trang HTML
  });
});

/*
 * NHẬN một trang
 */
router.get("/:slug", function (req, res) {
  var slug = req.params.slug;

  Page.findOne({ slug: slug }, function (err, page) {
    if (err) console.log(err);

    if (!page) {
      res.status(404).json({ error: "Page not found" }); // Trả về mã lỗi 404 nếu không tìm thấy trang
    } else {
      res.json({ title: page.title, content: page.content }); // Trả về dữ liệu JSON của trang
    }
  });
});

// Exports
module.exports = router;
