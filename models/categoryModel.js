const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  hidden: { type: Boolean, default: false }
}, {
  timestamps: true, // ✅ Tự động thêm createdAt và updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
categorySchema.virtual('subcategories', {
  ref: 'subcategories',
  localField: '_id',
  foreignField: 'categoryId'
});
module.exports = mongoose.model('categories', categorySchema);
