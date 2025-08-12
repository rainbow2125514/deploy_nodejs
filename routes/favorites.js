const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoritesController');

// POST - Thêm yêu thích
router.post('/', favoriteController.addFavorite);

// GET - Lấy danh sách yêu thích theo userId
router.get('/', favoriteController.getFavoritesByUser); // userId lấy từ query

// DELETE - Xóa sản phẩm khỏi yêu thích
router.delete('/:productId', favoriteController.removeFavorite);

module.exports = router; 