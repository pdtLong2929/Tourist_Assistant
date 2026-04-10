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

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh'
    });

    res.status(201).json({ accessToken, message: 'User registered successfully' });
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

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT secret not configured' });
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      return res.status(500).json({ message: 'JWT refresh secret not configured' });
    }

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m'}
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh'
    });

    res.json({ 
      accessToken,
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

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh'
    });

    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (error) {
    res.status(401).json({ message: 'Invalid Google Token' });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const user = await User.findOne({ where: { refreshToken } });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.json({ message: 'Logged out successfully' });
};

exports.refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const user = await User.findOne({ where: { refreshToken } });

    if (!user) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Refresh token expired or invalid' });
      }

      const accessToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({ accessToken });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Send SMTP mail to reset password, meanwhile create a hashed token to temporarily grant access
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
      subject: `Tourist Assistant's password restore`,
      html: `
      <p>You received this email because you (or someone) requested to reset your password.</p>
      <p>Please click the link below to complete the process:</p>
      <a href="${resetUrl}">Reset Password Here</a>
      <br><br>
      <p>Or paste this link into your browser:</p>
      <p>${resetUrl}</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `
    });

    if (error) {
      console.error('Resend API Error:', error);
      return res.status(400).json({ message: 'Failed to send recovery email', error: error });
    }

    res.status(200).json({ message: 'If that email address is in our database, we will send you an email to reset your password.' });

  } catch (error) {
    console.error(`[ERROR] forgotPassword failure for email ${email}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message || error });
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
    console.error(`[ERROR] resetPassword failure for token ${token}:`, error);
    res.status(500).json({ message: 'Server error when resetting password', error: error.message || error });
  }
};