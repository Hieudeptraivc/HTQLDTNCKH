const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const AppError = require('./appError');

class EmailService {
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  async sendPasswordResetEmail({ email, resetURL, next }) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt Lại Mật Khẩu</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f9fc; color: #333333;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); margin-top: 20px; overflow: hidden;">
    <!-- Header -->
    <div style="background-color: #265073; padding: 30px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Đặt Lại Mật Khẩu</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px 40px;">
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Xin chào,</p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để tiếp tục quá trình đặt lại mật khẩu:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetURL}" style="display: inline-block; background-color: #3498db; color: #ffffff; font-weight: 600; text-decoration: none; padding: 14px 30px; border-radius: 50px; font-size: 16px; transition: background-color 0.3s ease;">Đặt Lại Mật Khẩu</a>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Nếu bạn không thể nhấn vào nút trên, vui lòng sao chép và dán đường dẫn bên dưới vào trình duyệt của bạn:</p>
      
      <div style="background-color: #f2f4f6; padding: 12px; border-radius: 5px; font-size: 14px; margin-bottom: 25px; word-break: break-all;">
        <a href="${resetURL}" style="color: #3498db; text-decoration: none;">${resetURL}</a>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 10px;"><strong>Lưu ý:</strong> Liên kết này chỉ có hiệu lực trong vòng <strong>10 phút</strong>.</p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 5px;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ với quản trị viên hệ thống để được hỗ trợ.</p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
      <p style="margin: 0; font-size: 14px; color: #666666;">© ${new Date().getFullYear()} Trường Đại học Kinh tế - Đại học Đà Nẵng</p>
      <p style="margin: 10px 0 0; font-size: 14px; color: #666666;">Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Đặt Lại Mật Khẩu',
      html: htmlContent,
    };

    try {
      if (process.env.NODE_ENV === 'production') {
        await sgMail.send(mailOptions);
      } else {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        await transporter.sendMail(mailOptions);
      }

      return true;
    } catch (error) {
      return next(new AppError('Gửi email thất bại', 500));
    }
  }
}

module.exports = new EmailService();
