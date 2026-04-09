// Cấu trúc bảng User

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Định nghĩa cấu trúc bảng User
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },


// lấy lại mật khẩu bằng gửi otp qua gmail
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
 }, {
  tableName: 'users',
  timestamps: true, 
});

// tự động tạo bảng trong DB nếu chưa tồn tại
User.sync({ alter: true }) 
  .then(() => console.log('User table created/updated'))
  .catch(err => console.log('Error creating table:', err));

module.exports = User;