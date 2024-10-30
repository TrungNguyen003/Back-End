const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

// Cấu hình email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Hàm gửi email xác nhận và trả về verifyUrl
const sendVerificationEmail = async (to, userId, token) => {
  const verifyUrl = `https://back-end-42ja.onrender.com/users/verify-email?token=${token}&userId=${userId}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: "Xác nhận email của bạn",
    text: `Vui lòng nhấp vào liên kết dưới đây để xác nhận email của bạn: ${verifyUrl}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email xác nhận đã được gửi");
    // Trả về verifyUrl cho frontend
    return verifyUrl;
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
    throw new Error("Không thể gửi email xác nhận");
  }
};

const generateStyledEmailHTML = (order, orderDetails, shippingFee) => {
  const productRows = orderDetails
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px; border: 1px solid #d9d9d9;">
            <img src="${
              item.product.images && item.product.images.length
                ? item.product.images[0]
                : "fallback_image_url"
            }" alt="${item.product.name}" style="width: 500px;">
          </td>
          <td style="padding: 10px; border: 1px solid #d9d9d9;">
            <p><strong>${item.product.name}</strong></p>
            <p>Số Lượng: ${item.quantity}</p>
            <p>Giá: ${item.price.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            }).replace("₫", "VND")}</p>
          </td>
        </tr>
      `
    )
    .join(""); // Tạo danh sách các sản phẩm và kết hợp chúng thành một chuỗi HTML

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #d9d9d9; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; padding: 10px 0;">
        <h2 style="color: #333333; font-size: 24px;">Đơn Hàng #${order._id} Đã Đặt </h2>
      </div>

      <div style="text-align: center; margin-bottom: 30px;">
        <img src="logo_url" alt="PetStore" style="width: 150px;">
      </div>

      <div style="margin-bottom: 30px;">
        <p>Xin Chào ${order.username},</p>
        <p>Đơn Hàng #${order._id} của bạn đã được đặt ngày ${new Date(
          order.createdAt
        ).toLocaleDateString("vi-VN")}.</p>
        <p>Vui lòng đăng nhập PetStore để xác nhận bạn đã nhận hàng và hài lòng với sản phẩm trong vòng 5 ngày.</p>
        <p style="text-align: center;">
          <a href="${order.confirmationLink}" style="background-color: #0056b3; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Đã Nhận Hàng</a>
        </p>
      </div>

      <div style="border-top: 1px solid #d9d9d9; padding-top: 20px;">
        <h3 style="color: #333333;">Thông Tin Đơn Hàng</h3>
        <p><strong>Mã Đơn Hàng:</strong> ${order._id}</p>
        <p><strong>Ngày Đặt Hàng:</strong> ${new Date(
          order.createdAt
        ).toLocaleString("vi-VN")}</p>
        <p><strong>Người Bán:</strong> PetStore</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          ${productRows}  <!-- Hiển thị tất cả sản phẩm -->
        </table>

        <p><strong>Phí Vận Chuyển:</strong> ${shippingFee.toLocaleString(
          "vi-VN",
          { style: "currency", currency: "VND" }
        )}</p>
        <p><strong>Tổng Thanh Toán:</strong> ${order.total.toLocaleString(
          "vi-VN",
          { style: "currency", currency: "VND" }
        )}</p>
      </div>

      <div style="margin-top: 30px; text-align: center;">
        <p>Nếu bạn không hài lòng với sản phẩm, bạn có thể gửi yêu cầu trả hàng trong vòng 3 ngày kể từ khi nhận được email này.</p>
        <p style="color: #0073e6;"><a href="${order.refundLink}" style="text-decoration: none; color: #0073e6;">Gửi Yêu Cầu Trả Hàng</a></p>
      </div>

      <div style="border-top: 1px solid #d9d9d9; padding-top: 20px; text-align: center;">
        <p style="color: #666666;">PetStore Chúc Bạn Mua Sắm Vui Vẻ!</p>
      </div>
    </div>
  `;
};



// Hàm gửi email hóa đơn
const sendInvoiceEmail = async (to, order, orderDetails) => {
  const invoiceHTML = generateStyledEmailHTML(
    order,
    orderDetails,
    order.shippingFee
  );

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: "Hóa đơn đặt hàng của bạn",
    html: invoiceHTML, // Sử dụng HTML đã tạo để gửi email đẹp mắt
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email hóa đơn đã được gửi");
  } catch (error) {
    console.error("Lỗi khi gửi email hóa đơn:", error);
    throw new Error("Không thể gửi email hóa đơn");
  }
};

module.exports = { sendVerificationEmail, sendInvoiceEmail };
