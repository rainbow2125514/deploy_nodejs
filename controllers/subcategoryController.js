const subcategoryy = require('../models/subcategoryModel');
const categories = require('../models/categoryModel'); // nếu bạn cần dùng để populate

// Lấy tất cả subcategories
const getALLSubcategory = async (req, res, next) => {
    try {
        // Nếu muốn populate categoryId, bỏ comment dòng dưới
        // const arr = await subcategoryy.find().populate('categoryId', 'name');
        const arr = await subcategoryy.find();
        res.status(200).json(arr);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Thêm subcategory mới
const addSubcate = async (req, res) => {
    try {
        const { name, categoryId, hidden = false } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Tên danh mục con không được bỏ trống" });
        }
        if (!categoryId) {
            return res.status(400).json({ message: "categoryId là bắt buộc" });
        }

        const newSubcategory = new subcategoryy({ name, categoryId, hidden });

        const data = await newSubcategory.save();

        res.status(201).json({
            message: 'Thêm danh mục con thành công',
            data
        });
    } catch (error) {
        console.error("Lỗi khi thêm danh mục con:", error);
        res.status(500).json({ message: error.message });
    }
};

// Sửa subcategory

const editSubcate = async (req, res) => {
  try {
    const { name, categoryId, hidden } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Tên danh mục không được bỏ trống" });
    }
    const updatedSub = await subcategoryy.findByIdAndUpdate(
      req.params.id,
      { name, hidden, categoryId },
      { new: true }
    );
    if (!updatedSub) {
      return res.status(404).json({ message: "Danh mục con không tồn tại" });
    }
    res.status(200).json({ message: "Cập nhật danh mục con thành công", data: updatedSub });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getALLSubcategory, addSubcate, editSubcate };