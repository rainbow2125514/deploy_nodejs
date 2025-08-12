const express = require("express");
const router = express.Router();

const reviewController = require("../controllers/reviewController");
const {verifyToken,verifyAdmin} = require('../controllers/userController');
const authenticateToken = require("../middleware/auth"); 

// GET: lấy review theo productId (chỉ visible)
router.get("/", reviewController.getReviews);

// GET: lấy toàn bộ review cho admin (cả visible & hidden)
router.get("/admin", reviewController.getReviewsAdmin);

// GET: lấy review mới nhất cho mỗi sản phẩm (dùng cho trang chủ)
router.get("/admin/reviews-latest", reviewController.getLatestReviewPerProduct);

// Route lấy thống kê đánh giá theo productId
router.get('/stats/:productId', reviewController.getReviewStats);

// POST: thêm review mới (PHẢI CÓ MIDDLEWARE XÁC THỰC)
router.post("/", authenticateToken, reviewController.createReview);

// PATCH: đổi trạng thái review (ẩn/hiện)
router.patch("/:id/toggle-status",verifyToken,verifyAdmin,reviewController.toggleReviewStatus);


module.exports = router;