var express = require('express');
var router = express.Router();

var Page = require('../models/page');

/*
 * GET trang chính admin
 */
router.get('/', function (req, res) {
    Page.find({}).sort({sorting: 1}).exec(function (err, pages) {
        res.render('admin/pages', {
            pages: pages
        });
    });
});
/*
 * GET trang view/admin/add_page
 */
router.get('/add-page', function (req, res) {

    var title = "";
    var slug = "";
    var content = "";

    res.render('admin/add_page', {
        title: title,
        slug: slug,
        content: content
    });

});

/*
 * POST thêm sản phẩm
 */
router.post('/add-page', function (req, res) {

    //báo lỗi
    req.checkBody('title', 'Tiêu đề phải có giá trị.').notEmpty();
    req.checkBody('content', 'Nội dung phải có giá trị.').notEmpty();

    //lấy trang đã có
    var title = req.body.title;
    var slug = req.body.slug.replace(/\s+/g, '-').toLowerCase();
    if (slug == "")
        slug = title.replace(/\s+/g, '-').toLowerCase();
    var content = req.body.content;

    var errors = req.validationErrors();

    //nếu lỗi thì về admin/add_page
    if (errors) {
        res.render('admin/add_page', {
            errors: errors,
            title: title,
            slug: slug,
            content: content
        });
    } else {
        //kiểm tra trùng tên hay không 
        Page.findOne({slug: slug}, function (err, page) {
            if (page) {
                req.flash('danger', 'trang đã tồn tại, hãy chọn trang khác.');
                res.render('admin/add_page', {
                    title: title,
                    slug: slug,
                    content: content
                });
            } else {
                var page = new Page({
                    title: title,
                    slug: slug,
                    content: content,
                    sorting: 100
                });

                page.save(function (err) {
                    if (err)
                        return console.log(err);

           

                    req.flash('success', 'Đã thêm trang!');
                    res.redirect('/admin/pages');
                });
            }
        });
    }

});

// Sort pages function
//cái này nghịch thôi
function sortPages(ids, callback) {
    var count = 0;

    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        count++;

        (function (count) {
            Page.findById(id, function (err, page) {
                page.sorting = count;
                page.save(function (err) {
                    if (err)
                        return console.log(err);
                    ++count;
                    if (count >= ids.length) {
                        callback();
                    }
                });
            });
        })(count);

    }
}

/*
 * POST reorder pages
 */
router.post('/reorder-pages', function (req, res) {
    var ids = req.body['id[]'];

    sortPages(ids, function () {
        Page.find({}).sort({sorting: 1}).exec(function (err, pages) {
            if (err) {
                console.log(err);
            } else {
                req.app.locals.pages = pages;
            }
        });
    });

});

/*
 * GET chỉnh sửa trang
 */
router.get('/edit-page/:id',  function (req, res) {
    //tìm trang theo id
    Page.findById(req.params.id, function (err, page) {
        if (err)
            return console.log(err);
        res.render('admin/edit_page', {
            title: page.title,
            slug: page.slug,
            content: page.content,
            id: page._id
        });
    });

});

/*
 * POST edit page
 */
router.post('/edit-page/:id', function (req, res) {
    //báo lỗi
    req.checkBody('title', 'Tiêu đề phải có giá trị.').notEmpty();
    req.checkBody('content', 'Nội dung phải có giá trị.').notEmpty();

    //nhận dữ liệu đã có
    var title = req.body.title;
    var slug = req.body.slug.replace(/\s+/g, '-').toLowerCase();
    if (slug == "")
        slug = title.replace(/\s+/g, '-').toLowerCase();
    var content = req.body.content;
    var id = req.params.id;

    var errors = req.validationErrors();
    //nếu lỗi thì về admin/edit_page
    if (errors) {
        res.render('admin/edit_page', {
            errors: errors,
            title: title,
            slug: slug,
            content: content,
            id: id
        });
    } else {
        //kiểm tra đã tồn tại hay chưa
        Page.findOne({slug: slug, _id: {'$ne': id}}, function (err, page) {
            if (page) {
                req.flash('danger', 'trang đã tồn tại, hãy chọn trang khác.');
                res.render('admin/edit_page', {
                    title: title,
                    slug: slug,
                    content: content,
                    id: id
                });
            } else {
                //hiển thị + lưu vào database
                Page.findById(id, function (err, page) {
                    if (err)
                        return console.log(err);

                    page.title = title;
                    page.slug = slug;
                    page.content = content;
                    page.save(function (err) {
                        if (err)
                            return console.log(err);

                        Page.find({}).sort({sorting: 1}).exec(function (err, pages) {
                            if (err) {
                                console.log(err);
                            } else {
                                req.app.locals.pages = pages;
                            }
                        })
                        req.flash('success', 'Trang đã được chỉnh sửa!');
                        res.redirect('/admin/pages');
                    });

                });
            }
        });
    }
});

/*
 * GET xóa trang
 */
router.get('/delete-page/:id',  function (req, res) {
    Page.findByIdAndRemove(req.params.id, function (err) {
        if (err)
            return console.log(err);

        Page.find({}).sort({sorting: 1}).exec(function (err, pages) {
            if (err) {
                console.log(err);
            } else {
                req.app.locals.pages = pages;
            }
        });

        req.flash('success', 'Trang đã bị xóa!');
        res.redirect('/admin/pages/');
    });
});


// Exports
module.exports = router;