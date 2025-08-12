const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  googleId: { type: String },
  facebookId: { type: String },
  firstName: String,
  lastName: String,
  verifyToken: String,
  resetOTP: String,
  resetOTPExpire: Date,
  isVerified: { type: Boolean, default: false },
  username: { type: String },
  role: { type: String, default: 'user' },
  visible: { type: Boolean, default: true },
  status: { type: String, default: 'Hoạt động' }
}, { 
  versionKey: false,
  timestamps: true // Thêm dòng này để tự động có createdAt và updatedAt
});

module.exports = mongoose.model('User', userSchema);