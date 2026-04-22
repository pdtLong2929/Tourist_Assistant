const express = require('express');
const router = express.Router();
const { register, login, googleLogin, logout, refresh, forgotPassword, resetPassword } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin); 
router.post('/logout', logout);
router.post('/refresh', refresh);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// get profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'email', 'name', 'createdAt'] 
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