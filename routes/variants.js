const express = require('express');
const router = express.Router();
const variantsController = require('../controllers/variantsController');

// Thêm variant mới
router.post('/', variantsController.addVariant);

// Lấy tất cả variants của 1 sản phẩm
router.get('/products/:productId', variantsController.getVariantsByProduct);

// Lấy tất cả variants
router.get('/', variantsController.getAllVariants);

// Xóa variant
router.delete('/:id', variantsController.deleteVariant);

module.exports = router;
