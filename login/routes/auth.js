// router xử lý các API liên quan đến authentication

const express = require('express');
const router = express.Router();

// 1. Import Controllers & Middleware
const { register, login, googleLogin, forgotPassword, resetPassword } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');

// 2. Import Models 
const User = require('../models/User');

// 3. Khai báo các Routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin); 

// route quên mật khẩu
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Route bảo mật 
router.get('/me', verifyToken, async (req, res) => {
  try {
    // req.user.userId được lấy ra từ payload của token trong middleware
    const user = await User.findByPk(req.user.userId, {
  attributes: { exclude: ['password'] }
});
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;