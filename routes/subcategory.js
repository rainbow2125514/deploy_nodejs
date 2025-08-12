var express = require('express');
var router = express.Router();

const { getALLSubcategory, addSubcate, editSubcate }=
require('../controllers/subcategoryController');

//Lấy tất cả danh mục
router.get('/', getALLSubcategory);
//Lấy chi tiết 1 danh mục
router.post('/',addSubcate);
router.patch('/:id',editSubcate);

module.exports = router;