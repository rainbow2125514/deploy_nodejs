var express = require('express');
var router = express.Router();

const { register, login, verifyToken, getUser } = require('../controllers/userController');
const User = require('../models/userModel');
const passport = require('passport');
const reviewController = require('../controllers/reviewController');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const Product = require('../models/productModel'); // import model sản phẩm nếu chưa có

// Biến toàn cục lưu tạm thông tin đăng ký
global.tempRegister = global.tempRegister || {};

/* ==== ĐĂNG KÝ, ĐĂNG NHẬP, XÁC THỰC ==== */

// Đăng ký: chỉ gửi OTP, không lưu user
router.post('/register', async (req, res) => {
  try {
    const { email, firstName, lastName, username, password } = req.body;
    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: "Email này đã tồn tại" });
    }
    // Sinh OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Gửi OTP qua email
    try {
      await sendVerifyOTP(email, otp);
    } catch (mailErr) {
      return res.status(400).json({ message: "Không gửi được email xác thực!" });
    }
    // Lưu thông tin đăng ký tạm thời
    global.tempRegister[email] = {
      email,
      firstName,
      lastName,
      username,
      password,
      otp,
      otpExpire: Date.now() + 10 * 60 * 1000 // 10 phút
    };
    res.json({ message: "Đã gửi mã xác thực về email. Vui lòng kiểm tra email để hoàn tất đăng ký!" });
  } catch (err) {
    res.status(500).json({ message: "Đăng ký thất bại!" });
  }
});

// Xác thực OTP đăng ký
router.post('/verify-otp-register', async (req, res) => {
  const { email, otp } = req.body;
  const temp = global.tempRegister[email];
  if (!temp || temp.otp !== otp || temp.otpExpire < Date.now()) {
    return res.status(400).json({ message: "Mã OTP không đúng hoặc đã hết hạn!" });
  }
  // Lưu user vào DB
  const hashPassword = await bcrypt.hash(temp.password, 10);
  await User.create({
    email: temp.email,
    firstName: temp.firstName,
    lastName: temp.lastName,
    username: temp.username,
    password: hashPassword,
    isVerified: true
  });
  // Xóa dữ liệu tạm
  delete global.tempRegister[email];
  res.json({ message: "Xác thực tài khoản thành công!" });
});

// Đăng nhập
router.post('/login', login);

// Lấy thông tin 1 user theo token
router.get('/userinfo', verifyToken, getUser);

/* ==== QUẢN LÝ USER ==== */

// Lấy tất cả user
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Lấy khách hàng mới trong 7 ngày gần nhất
router.get('/new-this-week', async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const users = await User.find({ createdAt: { $gte: weekAgo } }).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy khách hàng mới trong tuần" });
  }
});

// Cập nhật vai trò người dùng
router.patch('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User không tồn tại" });
    res.json({ role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle visible
router.patch('/:id/toggle-visibility', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User not found');
    user.visible = !user.visible;
    user.status = user.visible ? "Hoạt động" : "Khóa";
    await user.save();
    res.json({ visible: user.visible, status: user.status });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* ==== ĐỔI MẬT KHẨU, QUÊN MẬT KHẨU ==== */

// Đổi mật khẩu (khi đã đăng nhập)
router.post('/change-password', verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng!" });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: "Đổi mật khẩu thành công!" });
});

// Khôi phục mật khẩu - gửi email xác nhận
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Email không tồn tại!" });

  // Tạo OTP 6 số
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetOTP = otp;
  user.resetOTPExpire = Date.now() + 10 * 60 * 1000; // Hết hạn sau 10 phút
  await user.save();

  // Gửi email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Mã OTP đặt lại mật khẩu',
    html: `<p>Mã OTP của bạn là: <b>${otp}</b> (có hiệu lực trong 10 phút)</p>`,
  });

  res.json({ message: "Đã gửi OTP về email!" });
});

// Xác thực OTP quên mật khẩu
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email, resetOTP: otp });
  if (!user || !user.resetOTPExpire || user.resetOTPExpire < Date.now()) {
    return res.status(400).json({ message: "Mã OTP không đúng hoặc đã hết hạn!" });
  }
  // Xác thực thành công, cho phép đổi mật khẩu
  res.json({ message: "OTP hợp lệ!" });
});

// Đổi mật khẩu (sau khi xác thực OTP)
router.post('/reset-password', async (req, res) => {
  const { email, otp, password } = req.body;
  console.log("RESET PASSWORD:", { email, otp, password });
  const user = await User.findOne({ email, resetOTP: otp });
  if (!user || !user.resetOTPExpire || user.resetOTPExpire < Date.now()) {
    return res.status(400).json({ message: "Mã OTP không đúng hoặc đã hết hạn!" });
  }
  user.password = await bcrypt.hash(password, 10);
  user.resetOTP = undefined;
  user.resetOTPExpire = undefined;
  await user.save();
  res.json({ message: "Đổi mật khẩu thành công!" });
});

/* ==== REVIEW ==== */

// Thêm review
router.post('/reviews', verifyToken, reviewController.createReview);

/* ==== GOOGLE OAUTH ==== */

// Đăng nhập với Google
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback Google OAuth
router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:3007/login?error=access_denied'
  }),
  (req, res) => {
    // Thành công
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15d' }
    );
    res.redirect(
      `http://localhost:3007/oauth-success?user=${encodeURIComponent(JSON.stringify(req.user))}&token=${token}`
    );
  }
);

/* ==== HÀM GỬI OTP ==== */

async function sendVerifyOTP(email, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Mã xác thực đăng ký tài khoản',
    html: `
      <div style="font-family:sans-serif;">
        <p>Mã xác thực đăng ký tài khoản của bạn là:</p>
        <div style="font-size:24px;font-weight:bold;color:#d63384;margin:16px 0;">${otp}</div>
        <p>Mã này có hiệu lực trong 10 phút.</p>
      </div>
    `,
  });
}
router.post('/send-voucher-mail', async (req, res) => {
  const { email, voucherCode, voucherName, description, productIds } = req.body;
  try {
    let productInfo = "";
    if (productIds && productIds.length > 0) {
      // Lấy tên sản phẩm từ DB
      const products = await Product.find({ _id: { $in: productIds } });
      productInfo = products.map(p => `<li>${p.name}</li>`).join("");
      productInfo = `<ul>${productInfo}</ul>`;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Bạn vừa nhận được voucher: ${voucherName}`,
      html: `
      <div style="background:#fff6fa;padding:32px 24px;border-radius:18px;max-width:480px;margin:auto;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 2px 12px #f8bbd0;">
        <div style="text-align:center;">
          <h2 style="color:#d63384;margin-bottom:8px;">Chúc mừng bạn đã trúng thưởng!</h2>
        </div>
        <div style="background:#ffe0ef;padding:16px;border-radius:12px;margin-bottom:18px;">
          <p style="font-size:18px;color:#d63384;margin:0 0 8px 0;"><b>Voucher:</b> ${voucherName}</p>
          <p style="font-size:16px;color:#ad1457;margin:0 0 8px 0;"><b>Mã giảm giá:</b> ${voucherCode}</p>
          ${description ? `<p style="color:#6d4c41;margin:0 0 8px 0;">${description}</p>` : ""}
        </div>
        ${productInfo ? `
          <div style="background:#fff3e0;padding:12px;border-radius:10px;">
            <p style="color:#ad1457;font-weight:bold;margin-bottom:8px;">Áp dụng cho sản phẩm:</p>
            ${productInfo}
          </div>
        ` : ""}
        <p style="text-align:center;color:#6d4c41;margin-top:24px;">Hãy sử dụng mã này khi mua gấu bông để nhận ưu đãi siêu dễ thương nhé! 🧸</p>
      </div>
      `,
    });
    res.json({ message: "Đã gửi voucher về email!" });
  } catch (err) {
    res.status(500).json({ message: "Gửi email thất bại!" });
  }
});
module.exports = router;