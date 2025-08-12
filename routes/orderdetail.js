const express = require("express");
const router = express.Router();
const orderDetailController = require("../controllers/orderDetailController");
const authenticateToken = require('../middleware/auth');

// Lấy tất cả chi tiết đơn hàng (admin)
router.get("/",  orderDetailController.getAllOrderDetails);

// Lấy chi tiết đơn hàng theo orderId
router.get("/:orderId", orderDetailController.getOrderDetailByOrderId);

// (Tuỳ chọn) Tạo mới một chi tiết đơn hàng (thường không cần, vì tạo khi tạo đơn hàng)

module.exports = router;