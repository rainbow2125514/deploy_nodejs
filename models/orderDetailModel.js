const mongoose = require("mongoose");

const orderDetailSchema = new mongoose.Schema({
  orderId: { type: String, required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: String, // tên sản phẩm (có thể lấy từ Product model nếu cần
  variant: String,
  quantity: Number,
  image: String,
  price: Number,         // giá * số lượng của từng sản phẩm (tính ở controller)
  coupon: String,        // mã khuyến mãi sản phẩm (nếu có)
});

module.exports = mongoose.model("OrderDetail", orderDetailSchema);