const express = require('express');
const router = express.Router();
const { register, login, googleLogin, forgotPassword, resetPassword } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin); 

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// get profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'createdAt'] 
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