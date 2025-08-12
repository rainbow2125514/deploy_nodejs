const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+@.+\..+/, 'Email không hợp lệ'],
    trim: true
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // Bắt buộc nếu không đăng nhập bằng Google
    }
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Cho phép nhiều bản ghi null, nhưng vẫn đảm bảo unique cho giá trị cụ thể
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  visible: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['Hoạt động', 'Khóa', 'Chờ duyệt'],
    default: 'Hoạt động'
  }
}, {
  timestamps: true
});

// Bỏ mật khẩu khi trả về JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema, 'users');
