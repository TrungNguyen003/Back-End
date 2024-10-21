// import các thư viện cần thiết
const nodemailer = require("nodemailer");
const crypto = require("crypto");

async function sendVerificationEmail(to, userId, token) {
  try {
    let transporter = nodemailer.createTransport({
      service: "gmail", // Ví dụ sử dụng Gmail
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: "Email Verification",
      text: `Please verify your email by clicking the link: ${process.env.APP_URL}/verify-email?token=${token}&userId=${userId}`,
    };

    await transporter.sendMail(mailOptions);
    return token; // hoặc bất kỳ giá trị nào bạn cần trả về
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Không thể gửi email xác nhận");
  }
}
