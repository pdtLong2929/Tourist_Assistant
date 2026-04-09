// Kiểm tra đăng nhập hợp lệ hay chưa trước khi sử dụng API

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Lấy token từ header 'Authorization'
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Access Denied. No token provided.' });
  }

  try {
    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token.' });
  }
};

module.exports = verifyToken;