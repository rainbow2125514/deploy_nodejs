const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',      // Kết nối với bảng products
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',         // Nên đặt đúng nếu có bảng users
    required: true
  }
}, {
  collection: 'products_fvr', // ✅ Tên collection trong MongoDB
  timestamps: true
});

module.exports = mongoose.model('Favorite', favoriteSchema);