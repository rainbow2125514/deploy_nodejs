const OrderDetail = require('../models/orderDetailModel');

// Lấy tất cả chi tiết đơn hàng
exports.getAllOrderDetails = async (req, res) => {
  try {
    const details = await OrderDetail.find().sort({ orderId: -1 });
    res.json(details);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// Lấy chi tiết đơn hàng theo orderId
exports.getOrderDetailByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const details = await OrderDetail.find({ orderId });
    res.json(details);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};