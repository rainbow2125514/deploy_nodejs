const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PostCategory', required: true },
  img: String,
  images: [String],
  shortDesc: String,
  content: String,
  tags: [String],
  priority: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  hidden: { type: Boolean, default: false }
}, { collection: 'posts' }); // Đúng tên collection

module.exports = mongoose.model('Post', postSchema);