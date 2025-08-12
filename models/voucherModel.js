const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  discountCode: { type: String, required: true, unique: true }, // Mã code giảm giá
  percent: { type: Number, default: null },                     // Phần trăm giảm giá (nullable)
  amount: { type: Number, default: null },                      // Số tiền giảm cố định (nullable)
  startDate: { type: Date, required: true },                    // Ngày bắt đầu
  endDate: { type: Date, required: true },                      // Ngày kết thúc
  description: { type: String },                                // Mô tả
  targetType: {                                                 // Loại áp dụng voucher
    type: String,
    enum: ['all', 'category', 'product'],
    required: true
  },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'products', default: [] }],    // Danh sách sản phẩm áp dụng
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'categories', default: [] }], // Danh sách danh mục áp dụng
  minOrderValue: { type: Number, default: 0 },                  // Giá trị tối thiểu đơn hàng (VND)
  maxDiscount: { type: Number, default: null },                 // Số tiền giảm tối đa cho 1 đơn hàng (VND)
  usageLimit: { type: Number, default: null },                  // Tổng số lượt dùng tối đa
  used: { type: Number, default: 0 },                           // Đã dùng bao nhiêu lượt
  active: { type: Boolean, default: true },                    // Kích hoạt mã hay không
});




module.exports = mongoose.model('vouchers', voucherSchema);