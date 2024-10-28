const express = require("express");
const router = express.Router();
const Cart = require("../models/cart");
const Product = require("../models/product");
const Order = require("../models/order");
const OrderDetail = require("../models/orderdetail");
const User = require("../models/user");
const mongoose = require("mongoose");
const querystring = require("querystring");
const crypto = require("crypto");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { isAuthenticated } = require("../middleware/auth");
const moment = require("moment");
const { sendInvoiceEmail } = require("../utils/emailUtils");


router.post("/add", isAuthenticated, async (req, res) => {
  try {
    const { productId, quantity, selectedWeight } = req.body; // Lấy thông tin sản phẩm, số lượng và cân nặng từ request body
    const userId = req.user._id; // Lấy ID người dùng từ đối tượng người dùng đã xác thực
    let cart = await Cart.findOne({ user: userId }); // Tìm giỏ hàng của người dùng

    if (!cart) {
      cart = new Cart({ user: userId, items: [] }); // Tạo giỏ hàng mới nếu không tồn tại
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ msg: "Id sản phẩm không hợp lệ" }); // Kiểm tra tính hợp lệ của ID sản phẩm
    }

    const productObjectId = mongoose.Types.ObjectId(productId);
    const product = await Product.findById(productObjectId); // Tìm sản phẩm theo ID

    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không có" }); // Xử lý trường hợp sản phẩm không tồn tại
    }

    // Lấy giá từ prices_by_weight dựa trên cân nặng đã chọn
    const priceByWeight = product.prices_by_weight.find(
      (item) => item.weight === selectedWeight
    );

    if (!priceByWeight) {
      return res.status(400).json({ msg: "Cân nặng không hợp lệ" }); // Kiểm tra tính hợp lệ của cân nặng
    }

    const price = priceByWeight.price; // Lấy giá dựa trên cân nặng đã chọn

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId && item.weight === selectedWeight
    );

    if (existingItemIndex >= 0) {
      cart.items[existingItemIndex].quantity += quantity; // Cập nhật số lượng nếu sản phẩm đã có trong giỏ hàng
    } else {
      cart.items.push({
        product: productObjectId,
        quantity,
        price, // Lưu giá theo cân nặng
        weight: selectedWeight, // Lưu thông tin về cân nặng vào field weight
      }); // Thêm sản phẩm mới vào giỏ hàng
    }

    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    // Cập nhật tổng giá trị giỏ hàng

    await cart.save(); // Lưu giỏ hàng
    const populatedCart = await cart.populate("items.product").execPopulate(); // Tạo giỏ hàng với thông tin sản phẩm đầy đủ
    res.status(200).json(populatedCart); // Trả về giỏ hàng sau khi thêm sản phẩm
  } catch (err) {
    console.error("Lỗi thêm sản phẩm vào giỏ hàng:", err); // Ghi lại lỗi nếu có
    res.status(500).json({ msg: "Lỗi thêm sản phẩm vào giỏ hàng" }); // Phản hồi lỗi server
  }
});

router.post("/remove", isAuthenticated, async (req, res) => {
  const { productId } = req.body; // Lấy ID sản phẩm cần xóa từ request body

  try {
    let cart = await Cart.findOne({ user: req.user._id }); // Tìm giỏ hàng của người dùng

    if (!cart) {
      return res.status(404).json({ msg: "Không tìm thấy giỏ hàng" }); // Xử lý trường hợp không tìm thấy giỏ hàng
    }

    cart.items = cart.items.filter((item) => !item.product.equals(productId)); // Xóa sản phẩm khỏi giỏ hàng

    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    ); // Cập nhật tổng giá trị giỏ hàng
    await cart.save(); // Lưu giỏ hàng
    const populatedCart = await cart.populate("items.product").execPopulate(); // Tạo giỏ hàng với thông tin sản phẩm đầy đủ
    res.status(200).json(populatedCart); // Trả về giỏ hàng sau khi xóa sản phẩm
  } catch (err) {
    console.error("Lỗi xóa sản phẩm khỏi giỏ hàng:", err); // Ghi lại lỗi nếu có
    res.status(500).json({ error: "Lỗi xóa sản phẩm khỏi giỏ hàng" }); // Phản hồi lỗi server
  }
});

// Route to remove a specific product by its productId from the cart
router.post("/remove/buynow", isAuthenticated, async (req, res) => {
  const { productId } = req.body; // Get the productId from the request body

  try {
    // Find the user's cart
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" }); // Handle case where cart is not found
    }

    // Filter out the item to be removed
    cart.items = cart.items.filter((item) => !item.product.equals(productId));

    // Update the total price after removing the item
    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    // Save the updated cart
    await cart.save();

    // Populate the cart with full product details
    const populatedCart = await cart.populate("items.product").execPopulate();

    // Return the updated cart
    res.status(200).json(populatedCart);
  } catch (err) {
    console.error("Error removing product from cart:", err);
    res.status(500).json({ error: "Error removing product from cart" }); // Handle server error
  }
});

// Get user's cart
router.get("/:userId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.params.userId; // Lấy ID người dùng từ tham số đường dẫn
    const cart = await Cart.findOne({ user: userId }).populate("items.product"); // Tìm giỏ hàng của người dùng và nạp thông tin sản phẩm
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" }); // Xử lý trường hợp không tìm thấy giỏ hàng
    }
    res.json(cart); // Trả về giỏ hàng
  } catch (error) {
    console.error("Lỗi tìm nạp giỏ hàng cho người dùng:", error); // Ghi lại lỗi nếu có
    res.status(500).json({ message: error.message }); // Phản hồi lỗi server
  }
});

// Update product quantity in cart
router.put("/:userId/items/:itemId", isAuthenticated, async (req, res) => {
  try {
    const { userId, itemId } = req.params; // Lấy ID người dùng và ID mặt hàng từ tham số đường dẫn
    const { quantity } = req.body; // Lấy số lượng mới từ request body
    const cart = await Cart.findOne({ user: userId }); // Tìm giỏ hàng của người dùng

    if (!cart) {
      return res.status(404).json({ msg: "Không tìm thấy giỏ hàng" }); // Xử lý trường hợp không tìm thấy giỏ hàng
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ msg: "Không tìm thấy mặt hàng trong giỏ hàng" }); // Xử lý trường hợp mặt hàng không tồn tại trong giỏ hàng
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1); // Xóa mặt hàng nếu số lượng nhỏ hơn hoặc bằng 0
    } else {
      cart.items[itemIndex].quantity = quantity; // Cập nhật số lượng mặt hàng
    }

    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    ); // Cập nhật tổng giá trị giỏ hàng

    await cart.save(); // Lưu giỏ hàng
    const populatedCart = await cart.populate("items.product").execPopulate(); // Tạo giỏ hàng với thông tin sản phẩm đầy đủ
    res.status(200).json(populatedCart); // Trả về giỏ hàng sau khi cập nhật
  } catch (err) {
    console.error("Lỗi cập nhật số lượng mặt hàng:", err); // Ghi lại lỗi nếu có
    res.status(500).json({ msg: "Lỗi cập nhật số lượng mặt hàng" }); // Phản hồi lỗi server
  }
});

router.post("/checkout/stripe", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { selectedItems, shippingMethod, shippingFee } = req.body;

    console.log(`Tạo đơn hàng cho người dùng: ${userId}`);

    if (!Array.isArray(selectedItems)) {
      console.log("Danh sách sản phẩm chọn không hợp lệ.");
      return res
        .status(400)
        .json({ msg: "Danh sách sản phẩm chọn không hợp lệ" });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log("Không tìm thấy người dùng.");
      return res.status(404).json({ msg: "Không tìm thấy người dùng" });
    }

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      console.log("Giỏ hàng trống.");
      return res.status(400).json({ msg: "Giỏ hàng trống" });
    }

    const filteredItems = cart.items.filter(
      (item) => item._id && selectedItems.includes(item._id.toString())
    );

    if (filteredItems.length === 0) {
      console.log("Không có sản phẩm nào được chọn.");
      return res.status(400).json({ msg: "Không có sản phẩm nào được chọn" });
    }

    const totalAmount =
      filteredItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ) + shippingFee; // Cộng thêm phí vận chuyển vào tổng giá trị đơn hàng

    if (totalAmount < 50000) {
      console.log("Số tiền tổng phải ít nhất 50 cent (USD).");
      return res
        .status(400)
        .json({ msg: "The total amount must be at least 50 cents (in USD)." });
    }

    // Tạo đơn hàng với trạng thái "chưa giải quyết"
    const order = new Order({
      user: userId,
      username: user.username,
      items: filteredItems.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        images: [item.product.image],
        weight: item.weight,
      })),
      total: totalAmount,
      status: "chưa giải quyết",
      paymentStatus: "chưa giải quyết",
      paymentMethod: "stripe",
      email: user.gmail,
      address: user.address,
      phone: user.phone,
      paymentIntentId: "",
      shippingMethod,
      shippingFee, // Thêm phí vận chuyển vào đơn hàng
    });

    await order.save();
    console.log(`Đơn hàng đã được tạo với ID: ${order._id}`);

    // Tạo phiên thanh toán Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: filteredItems.map((item) => ({
        price_data: {
          currency: "vnd",
          product_data: {
            name: item.product.name,
            images: [
              `https://fe2c-1-55-167-130.ngrok-free.app/product_images/${item.product._id}/${item.product.image}`,
            ],
          },
          unit_amount: item.price,
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      // Tổng số tiền bao gồm phí vận chuyển
      success_url: `https://shoppets-eight.vercel.app/success?orderId=${order._id}`,
      cancel_url: `https://shoppets-eight.vercel.app/cancel-payment?orderId=${order._id}`,
      metadata: {
        userId: userId.toString(),
        cartId: cart._id.toString(),
        total: totalAmount.toString(),
        selectedItems: selectedItems.join(","),
        paymentMethod: "stripe",
        orderId: order._id.toString(),
        shippingFee: shippingFee.toString(),
        weights: filteredItems.map((item) => item.weight).join(","), // Lưu trọng lượng của từng sản phẩm vào metadata
      },
    });

    console.log(`Phiên thanh toán Stripe đã được tạo với ID: ${session.id}`);

    // Cập nhật stripeSessionId vào đơn hàng
    order.stripeSessionId = session.id;
    await order.save();

    const orderDetails = filteredItems.map((item) => ({
      order: order._id,
      product: item.product._id,
      quantity: item.quantity,
      price: item.price,
      weight: item.weight,
    }));
    await OrderDetail.insertMany(orderDetails);
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Lỗi khi tạo phiên thanh toán Stripe:", error);
    res.status(500).json({ msg: "Đã có lỗi xảy ra. Vui lòng thử lại sau." });
  }
});

// Route to handle payment cancellation
router.get("/cancel-payment", isAuthenticated, async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      console.log("Không tìm thấy đơn hàng.");
      return res.status(404).json({ msg: "Không tìm thấy đơn hàng" });
    }

    const session = await stripe.checkout.sessions.retrieve(
      order.stripeSessionId
    );

    if (session) {
      console.log(`Xử lý hủy phiên thanh toán với ID: ${session.id}`);

      // Remove selected items from the cart
      const selectedItems = session.metadata.selectedItems.split(",");
      await Cart.findOneAndUpdate(
        { user: session.metadata.userId },
        { $pull: { items: { _id: { $in: selectedItems } } } }
      );
      console.log(
        "Đã xóa các sản phẩm được chọn từ giỏ hàng sau khi hủy đơn hàng."
      );
    } else {
      console.log("Không tìm thấy phiên thanh toán Stripe.");
    }

    // Redirect the user back to the cart or a cancellation page
    res.redirect("/cart"); // or whatever page you want to redirect to
  } catch (error) {
    console.error("Lỗi khi xử lý hủy phiên thanh toán:", error);
    res.status(500).json({ msg: "Đã có lỗi xảy ra. Vui lòng thử lại sau." });
  }
});

// Checkout with Cash on Delivery (COD)
router.post("/checkout/cod", isAuthenticated, async (req, res) => {
  try {
    const { address, selectedItems, shippingMethod, shippingFee } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ msg: "Giỏ hàng trống" });
    }

    const filteredItems = cart.items.filter(
      (item) => item._id && selectedItems.includes(item._id.toString())
    );

    if (filteredItems.length === 0) {
      return res.status(400).json({ msg: "Không có sản phẩm nào được chọn" });
    }

    const total =
      filteredItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ) + shippingFee;
    console.log("selectedItems:", selectedItems);
    console.log("filteredItems:", filteredItems);
    const order = new Order({
      user: userId,
      username: user.username, // Save the user's username
      items: filteredItems.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        images: [item.product.image],
        weight: item.weight,
      })),
      total: total,
      status: "chưa giải quyết",
      paymentStatus: "chưa giải quyết",
      paymentMethod: "cod",
      shippingMethod,
      shippingFee,
      email: user.gmail,
      phone: user.phone, // Save the user's phone number
      address: address || user.address,
    });

    await order.save();

    const orderDetails = filteredItems.map((item) => ({
      order: order._id,
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      weight: item.weight, // Lưu trọng lượng của sản phẩm
    }));
    await OrderDetail.insertMany(orderDetails);

    cart.items = cart.items.filter(
      (item) => !selectedItems.includes(item._id.toString())
    );
    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    await cart.save();

    // Gửi email hóa đơn
    await sendInvoiceEmail(user.gmail, order, orderDetails);

    res.status(200).json({
      msg: "Đơn hàng của bạn đã được tạo thành công với phương thức thanh toán khi nhận hàng",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Lỗi khi tạo đơn hàng COD:", error);
    res.status(500).json({ msg: "Lỗi khi tạo đơn hàng COD" });
  }
});

// Checkout with VNPAY
router.post("/checkout/vnpay", isAuthenticated, async (req, res) => {
  try {
    const {
      address: bodyAddress,
      selectedItems,
      bankCode,
      language,
      shippingMethod,
      shippingFee,
    } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);
    process.env.TZ = "Asia/Ho_Chi_Minh";

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ msg: "Giỏ hàng trống" });
    }

    const filteredItems = cart.items.filter(
      (item) => item._id && selectedItems.includes(item._id.toString())
    );

    if (filteredItems.length === 0) {
      return res.status(400).json({ msg: "Không có sản phẩm nào được chọn" });
    }

    const total =
      filteredItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      ) + shippingFee;

    const tmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;

    const date = new Date();
    const createDate = moment(date).format("YYYYMMDDHHmmss");
    const orderId = moment(date).format("DDHHmmss");
    const currCode = "VND";

    // Tạo đơn hàng với trạng thái chưa giải quyết
    const order = new Order({
      user: userId,
      username: user.username,
      items: filteredItems.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
        weight: item.weight,
      })),
      total: total,
      status: "chưa giải quyết", // Trạng thái đơn hàng khi bắt đầu thanh toán
      paymentMethod: "vnpay",
      paymentStatus: "chưa giải quyết", // Chờ xử lý thanh toán
      shippingMethod, // Lưu phương thức vận chuyển được chọn
      shippingFee,
      email: user.gmail,
      phone: user.phone,
      address: bodyAddress || user.address,
    });

    await order.save();

    // Ensure orderDetails includes the full product object
    const orderDetails = filteredItems.map((item) => ({
      order: order._id,
      product: item.product, // Include full product object
      quantity: item.quantity,
      price: item.product.price,
      weight: item.weight,
    }));
    await OrderDetail.insertMany(
      orderDetails.map((detail) => ({
        order: detail.order,
        product: detail.product._id, // Save only the product ID in the database
        quantity: detail.quantity,
        price: detail.price,
        weight: detail.weight,
      }))
    );

    const returnUrl = `https://shoppets-eight.vercel.app/success?orderId=${order._id}`;

    // Xóa các sản phẩm đã chọn khỏi giỏ hàng sau khi thanh toán
    cart.items = cart.items.filter(
      (item) => !selectedItems.includes(item._id.toString())
    );
    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    await cart.save();

    // Send invoice email with full product details
    await sendInvoiceEmail(user.gmail, order, orderDetails);

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: language || "vn",
      vnp_Amount: total * 100,
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: "billpayment",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: req.ip,
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnp_Params["vnp_BankCode"] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);
    const querystring = require("qs");
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    vnp_Params["vnp_SecureHash"] = signed;

    const vnpUrlWithParams = `${vnpUrl}?${querystring.stringify(vnp_Params, {
      encode: false,
    })}`;

    // Chuyển hướng người dùng đến VNPAY
    res.json({ url: vnpUrlWithParams });
  } catch (error) {
    console.error("Lỗi khi tạo URL thanh toán VNPAY:", error);
    res.status(500).json({ msg: "Đã có lỗi xảy ra. Vui lòng thử lại sau." });
  }
});

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

router.get("/vnpay_return", isAuthenticated, async (req, res) => {
  try {
    const queryParams = req.query;
    const orderId = queryParams.vnp_TxnRef; // Sử dụng tham số chính xác từ query

    if (!orderId) {
      return res.status(400).json({ msg: "Thiếu tham số orderId" });
    }

    const order = await Order.findOne({ paymentIntentId: orderId }).populate(
      "items.product"
    );

    if (!order) {
      return res.status(404).json({ msg: "Không tìm thấy đơn hàng" });
    }

    const responseCode = queryParams.vnp_ResponseCode;

    let message;
    if (responseCode === "00") {
      message = "Thanh toán thành công!";
      order.status = "đơn hàng đã hoàn thành";
      order.paymentStatus = "trả trước";
    } else {
      message = "Thanh toán không thành công.";
      order.status = "failed";
      order.paymentStatus = "failed";
    }

    await order.save();

    res.redirect(
      `/payment-result?orderId=${orderId}&vnp_ResponseCode=${responseCode}`
    );
  } catch (error) {
    console.error("Lỗi khi xử lý kết quả thanh toán từ VNPAY:", error);
    res.status(500).json({ msg: "Đã có lỗi xảy ra. Vui lòng thử lại sau." });
  }
});

router.post("/process-payment", isAuthenticated, async (req, res) => {
  const { orderId } = req.body;

  try {
    // Tìm kiếm đơn hàng theo ID
    const order = await Order.findOne({
      _id: orderId,
      paymentStatus: "chưa giải quyết",
      paymentMethod: "stripe",
    });

    if (!order) {
      return res
        .status(404)
        .json({ msg: "Đơn hàng không tồn tại hoặc không hợp lệ." });
    }
    console.log("Trước khi tạo phiên thanh toán:", order.items);
    // Tạo phiên thanh toán Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: order.items.map((item) => {
        if (!item.product._id) {
          throw new Error(`Product ID is missing for item ID: ${item._id}`);
        }
        return {
          price_data: {
            currency: "vnd",
            product_data: {
              name: `Product ID: ${item.product._id}`, // Sử dụng ID sản phẩm làm tên
              images: [
                `https://fe2c-1-55-167-130.ngrok-free.app/product_images/${item.product._id}/${item.product.image}`,
              ],
            },
            unit_amount: item.price,
          },
          quantity: item.quantity,
        };
      }),
      mode: "payment",
      success_url: `https://shoppets-eight.vercel.app/success?orderId=${order._id}`,
      cancel_url: "https://shoppets-eight.vercel.app/cart",
      metadata: {
        orderId: order._id.toString(),
        userId: order.user.toString(),
        total: order.total.toString(),
        shippingFee: order.shippingFee.toString(),
        shippingMethod: order.shippingMethod,
        selectedItems: order.items.map((item) => item.product._id).join(","),
      },
    });

    console.log(`Phiên thanh toán Stripe đã được tạo với ID: ${session.id}`);
    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Lỗi khi xử lý thanh toán:", error);
    res.status(500).json({ msg: "Đã có lỗi xảy ra. Vui lòng thử lại sau." });
  }
});

// Checkout with Cash on Delivery (COD) for Buy Now
router.post("/checkout/buynow/cod", isAuthenticated, async (req, res) => {
  try {
    const { address, selectedProduct, shippingMethod, shippingFee } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ msg: "Giỏ hàng trống" });
    }

    // Kiểm tra dữ liệu sản phẩm hợp lệ
    if (
      !selectedProduct ||
      !selectedProduct.product ||
      !selectedProduct.quantity ||
      selectedProduct.quantity <= 0 || // Kiểm tra số lượng hợp lệ
      !selectedProduct.weight || // Kiểm tra cân nặng
      selectedProduct.weight <= 0 // Kiểm tra cân nặng hợp lệ
    ) {
      console.log("Invalid product data:", selectedProduct);
      return res.status(400).json({ msg: "Invalid product data" });
    }

    // Xử lý đơn hàng
    const total =
      selectedProduct.price * selectedProduct.quantity + shippingFee;
    const order = new Order({
      user: userId,
      username: user.username,
      items: [
        {
          product: selectedProduct.product,
          quantity: selectedProduct.quantity,
          price: selectedProduct.price,
          weight: selectedProduct.weight, // Lưu thông tin cân nặng ở đây
        },
      ],
      total: total,
      status: "chưa giải quyết",
      paymentStatus: "chưa giải quyết",
      paymentMethod: "cod",
      shippingMethod,
      shippingFee,
      email: user.gmail,
      phone: user.phone,
      address: address || user.address,
    });

    await order.save();

    // Tạo chi tiết đơn hàng cho sản phẩm
    const orderDetails = [
      {
        order: order._id,
        product: selectedProduct.product,
        quantity: selectedProduct.quantity,
        price: selectedProduct.price,
        weight: selectedProduct.weight, // Lưu thông tin cân nặng ở đây
      },
    ];
    await OrderDetail.insertMany(orderDetails);

    // Xóa sản phẩm khỏi giỏ hàng
    cart.items = cart.items.filter(
      (item) => !item.product.equals(selectedProduct.product)
    );
    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    await cart.save();

    // Gửi email hóa đơn
    await sendInvoiceEmail(user.gmail, order, orderDetails);

    res
      .status(200)
      .json({ msg: "Order created successfully", orderId: order._id });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ msg: "Error creating order" });
  }
});

router.post("/checkout/buynow/stripe", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { selectedProduct, shippingMethod, shippingFee } = req.body;

    // Fetch the product details
    const productId = selectedProduct.product;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(400).json({ msg: "Invalid product selected" });
    }

    // Calculate the total amount
    const totalAmount =
      selectedProduct.price * selectedProduct.quantity + shippingFee;

    // Validate the total amount
    if (totalAmount < 50000) {
      return res
        .status(400)
        .json({ msg: "The total amount must be at least 50 cents (in USD)." });
    }
    const user = await User.findById(userId);
    // Create a new order
    const order = new Order({
      user: userId,
      username: user.username,
      phone: user.phone,
      items: [
        {
          product: productId,
          quantity: selectedProduct.quantity,
          price: selectedProduct.price,
          images: [selectedProduct.image],
          weight: selectedProduct.weight,
        },
      ],
      total: totalAmount,
      status: "chưa giải quyết",
      paymentStatus: "chưa giải quyết",
      paymentMethod: "stripe",
      email: req.user.gmail, // Changed from `gmail` to `email` for consistency
      address: req.user.address,
      paymentIntentId: "",
      shippingMethod,
      shippingFee,
    });

    await order.save();

    // Prepare selected items as an array
    const selectedItemsArray = [productId.toString()];

    // Convert the array to a comma-separated string
    const selectedItemsString = selectedItemsArray.join(",");

    // Create a Stripe session for payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "vnd",
            product_data: {
              name: product.name,
              images: [
                `https://fe2c-1-55-167-130.ngrok-free.app/product_images/${productId}/${selectedProduct.image}`,
              ],
            },
            unit_amount: selectedProduct.price,
          },
          quantity: selectedProduct.quantity,
        },
      ],
      mode: "payment",
      success_url: `https://shoppets-eight.vercel.app/success?orderId=${order._id}`,
      cancel_url: `https://shoppets-eight.vercel.app/cancel-payment?orderId=${order._id}`,
      metadata: {
        userId: userId.toString(),
        cartId: null,
        total: totalAmount.toString(),
        selectedItems: selectedItemsString, // Use comma-separated string
        orderId: order._id.toString(),
        shippingFee: shippingFee.toString(),
        weight: selectedProduct.weight.toString(),
      },
    });

    // Update order with Stripe session ID
    order.stripeSessionId = session.id;
    await order.save();

    // Create order details
    await OrderDetail.create({
      order: order._id,
      product: productId,
      quantity: selectedProduct.quantity,
      price: selectedProduct.price,
      weight: selectedProduct.weight,
    });

    // Respond with session details
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating Stripe payment session:", error);
    res.status(500).json({ msg: "An error occurred. Please try again later." });
  }
});

router.post("/checkout/vnpay/now", isAuthenticated, async (req, res) => {
  try {
    const {
      address,
      selectedProduct,
      shippingMethod,
      shippingFee,
      bankCode,
      language,
    } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ msg: "Giỏ hàng trống" });
    }
    process.env.TZ = "Asia/Ho_Chi_Minh";

    // Validate selectedProduct
    if (
      !selectedProduct ||
      !selectedProduct.product ||
      !selectedProduct.quantity ||
      selectedProduct.quantity <= 0 || // Kiểm tra số lượng hợp lệ
      !selectedProduct.weight || // Kiểm tra cân nặng
      selectedProduct.weight <= 0 // Kiểm tra cân nặng hợp lệ
    ) {
      return res.status(400).json({ msg: "Invalid product details" });
    }

    const product = await Product.findById(selectedProduct.product);
    if (!product) {
      return res.status(400).json({ msg: "Product not found" });
    }

    const total =
      selectedProduct.price * selectedProduct.quantity + shippingFee;

    // Create a new order with the provided product details
    const order = new Order({
      user: userId,
      username: user.username,
      items: [
        {
          product: product._id,
          quantity: selectedProduct.quantity,
          price: selectedProduct.price,
          weight: selectedProduct.weight,
        },
      ],
      total: total,
      status: "chưa giải quyết", // Status when initiating payment
      paymentMethod: "vnpay",
      paymentStatus: "chưa giải quyết", // Status while waiting for payment confirmation
      shippingMethod,
      shippingFee,
      email: user.gmail,
      phone: user.phone,
      address: address || user.address,
    });

    await order.save();

    // Create OrderDetail entries
    const orderDetail = new OrderDetail({
      order: order._id,
      product: product._id,
      quantity: selectedProduct.quantity,
      price: selectedProduct.price,
      weight: selectedProduct.weight,
    });
    await orderDetail.save();

    const tmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;

    const date = new Date();
    const createDate = moment(date).format("YYYYMMDDHHmmss");
    const orderId = moment(date).format("DDHHmmss");
    const currCode = "VND";

    const returnUrl = `https://shoppets-eight.vercel.app/success?orderId=${order._id}`;

    // Remove selected product from cart after checkout
    // Remove the product from the cart
    cart.items = cart.items.filter(
      (item) => !item.product.equals(selectedProduct.product)
    );
    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    await cart.save();

    // Send invoice email with product details
    await sendInvoiceEmail(user.gmail, order, [orderDetail]);

    // Generate VNPAY request parameters
    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: language || "vn",
      vnp_Amount: total * 100,
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: "billpayment",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: req.ip,
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnp_Params["vnp_BankCode"] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);
    const querystring = require("qs");
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    vnp_Params["vnp_SecureHash"] = signed;

    const vnpUrlWithParams = `${vnpUrl}?${querystring.stringify(vnp_Params, {
      encode: false,
    })}`;

    // Respond with the URL to redirect the user to VNPAY
    res.json({ url: vnpUrlWithParams });
  } catch (error) {
    console.error("Lỗi khi tạo URL thanh toán VNPAY:", error);
    res.status(500).json({ msg: "Đã có lỗi xảy ra. Vui lòng thử lại sau." });
  }
});

// Endpoint để xử lý thanh toán COD (Cash on Delivery)
// Endpoint để xử lý thanh toán COD (Cash on Delivery)
router.post("/checkout/codd", isAuthenticated, async (req, res) => {
  try {
    const { selectedItems, shippingMethod, shippingFee, address, phone } =
      req.body;
    const userId = req.user._id; // Giả sử bạn có middleware để lấy user từ token

    if (!selectedItems || selectedItems.length === 0) {
      return res
        .status(400)
        .json({ message: "Không có sản phẩm nào được chọn" });
    }

    // Tìm user để kiểm tra và cập nhật địa chỉ, số điện thoại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Nếu người dùng chưa có địa chỉ hoặc số điện thoại thì cập nhật
    user.address = address || user.address;
    user.phone = phone || user.phone;
    await user.save();

    // Tạo đơn hàng mới
    const newOrder = new Order({
      user: userId,
      username: user.username,
      items: selectedItems.map((item) => ({
        product: item.productId, // Đảm bảo lưu ID sản phẩm
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      shippingMethod,
      shippingFee,
      total: calculateTotalAmount(selectedItems, shippingFee),
      address: address,
      email: user.gmail,
      phone: user.phone,
      status: "chưa giải quyết",
      paymentMethod: "cod",
    });

    // Lưu đơn hàng vào database
    const order = await newOrder.save();

    // Lưu chi tiết đơn hàng vào bảng OrderDetail
    const orderDetails = selectedItems.map((item) => ({
      order: order._id,
      product: item.productId,
      quantity: item.quantity,
      price: item.price,
      weight: item.weight, // Lưu trọng lượng của sản phẩm
    }));
    await OrderDetail.insertMany(orderDetails);

    // Xóa sản phẩm đã chọn khỏi giỏ hàng của người dùng
    await Cart.updateOne(
      { user: userId },
      {
        $pull: {
          items: {
            product: { $in: selectedItems.map((item) => item.productId) },
          },
        },
      }
    );

    res
      .status(201)
      .json({
        order,
        message: "Đặt hàng thành công và sản phẩm đã được xóa khỏi giỏ hàng!",
      });
  } catch (error) {
    console.error("Lỗi khi xử lý thanh toán COD:", error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại sau" });
  }
});

// Hàm tính tổng tiền của các sản phẩm
const calculateTotalAmount = (items, shippingFee) => {
  const total = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  return total + shippingFee;
};

module.exports = router;
