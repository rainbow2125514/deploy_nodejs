const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: String,
  shippingInfo: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    phone: Number,
    address: String,
    note: String,
    cityId: String,
    districtId: String,
    wardId: String,
  },
  shippingFee: { type: Number, default: 0 },
  totalPrice: Number,
  paymentMethod: String,
  coupon: String,
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'pending','refunded'], //thanh toán - chưa thanh toán - đag chờ xử lý_kiểm tra - hoàn tiền
    default: 'pending' // Sẽ tự động set lại ở controller khi tạo đơn
  },
  orderStatus: {
    type: String,
    enum: ['approved', 'waiting', 'processing', 'shipping', 'delivered', 'cancelled','returned'],//duyệt - chờ xác nhận - đang chuẩn bị - đang giao - đã giao - trả - hủy
    default: 'waiting'
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);