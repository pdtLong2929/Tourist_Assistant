//Các chức năng


const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_booting');
const { Op } = require('sequelize');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Thêm { where: ... } vào các hàm find
    let user = await User.findOne({ where: { email } });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo bản ghi mới trong bảng SQL
    user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user.id }, // Lưu ý: RDBMS thường dùng 'id' thay vì '_id' như MongoDB
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({ token, message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ 
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Đăng nhập Google
exports.googleLogin = async (req, res) => {
  const { tokenId } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { name, email, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({ name, email, googleId });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (error) {
    res.status(401).json({ message: 'Invalid Google Token' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng với email này' });

    // Tạo token ngẫu nhiên
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Lưu token và thời hạn (15 phút) vào Database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Cấu hình gửi Email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Link hướng người dùng tới trang Frontend (hiện tại mình để URL local của Frontend)
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Yêu cầu khôi phục mật khẩu',
      text: `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu.\n\n
      Vui lòng click vào đường link sau hoặc dán vào trình duyệt để hoàn tất quá trình:\n\n
      ${resetUrl}\n\n
      Nếu bạn không yêu cầu, vui lòng bỏ qua email này và mật khẩu của bạn sẽ giữ nguyên.\n`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email khôi phục đã được gửi' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server khi gửi email' });
  }
};

// Đặt lại mật khẩu mới
exports.resetPassword = async (req, res) => {
  const { token } = req.params; // Lấy token từ URL
  const { newPassword } = req.body; // Mật khẩu mới người dùng nhập

  try {
    // Tìm user có token khớp và token chưa hết hạn (lớn hơn thời gian hiện tại)
    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: Date.now() } // Lớn hơn (Greater Than) Date.now()
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    // Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Xóa token đi vì đã dùng xong
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Cập nhật mật khẩu thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu' });
  }
};