const express = require('express');
const router = express.Router();

// Giả sử bạn dùng MongoDB với mongoose
const Product = require('../models/productModel');
const Voucher = require('../models/voucherModel');

router.get('/', async (req, res) => {
  try {
    // Lấy 2 sản phẩm ngẫu nhiên
    const products = await Product.aggregate([{ $sample: { size: 2 } }]);
    // Lấy 2 voucher ngẫu nhiên
    const vouchers = await Voucher.aggregate([{ $sample: { size: 2 } }]);

    // Chuyển về format dùng cho vòng quay
    const prizes = [
      ...vouchers.map(v => ({
        label: v.name || v.code || "VOUCHER",
        color: "#fff",
        bg: "#e74c3c"
      })),
      ...products.map(p => ({
        label: p.name || "SẢN PHẨM",
        color: "#fff",
        bg: "#3498db"
      }))
    ];

    res.json(prizes);
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy dữ liệu" });
  }
});

module.exports = router;