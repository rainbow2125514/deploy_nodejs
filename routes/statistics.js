const express = require('express');
const router = express.Router();
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');

// API doanh thu từng tháng (lấy từ orders)
router.get('/revenue', async (req, res) => {
  const result = await Order.aggregate([
    { $match: { orderStatus: "delivered" } }, // chỉ tính đơn đã giao
    {
      $group: {
        _id: { $month: "$createdAt" },
        total: { $sum: "$totalPrice" }
      }
    },
    { $sort: { "_id": 1 } }
  ]);
  res.json(result.map(r => ({ month: r._id, total: r.total })));
});

// API tổng hợp
router.get('/summary', async (req, res) => {
  const totalCustomers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();
  const lowStock = await Product.countDocuments({ quantity: { $lte: 5 } });
  res.json({ totalCustomers, totalProducts, totalOrders, lowStock });
});

module.exports = router;