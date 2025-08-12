const categories = require('../models/categoryModel');



// Hàm lấy danh mục và populate subcategories
const getAllCategories = async (req, res) => {
  try {
    const categoriesList = await categories.find().populate({
      path: 'subcategories',
      select: 'name hidden'
    });
    res.status(200).json(categoriesList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



//Hàm lấy chi tiết 1 danh mục
const getCategoryById = async (req, res, next) => {
  try {
    const arr = await categories.findById(req.params.id).populate({
      path: 'subcategories',
      select: 'name'
    });
    res.status(200).json(arr);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Hàm thêm danh mục mới
const addCate = async (req, res) => {
    try {
        const { name, hidden } = req.body;

        // Kiểm tra nếu không có tên danh mục thì trả về lỗi
        if (!name) {
            return res.status(400).json({ message: "Tên danh mục không được bỏ trống" });
        }
        const newCategory = new categories({
            name, hidden
        });

        const data = await newCategory.save();

        res.status(201).json({
            message: 'Thêm danh mục thành công',
            data
        });
    } catch (error) {
        console.error("Lỗi khi thêm danh mục:", error);
        res.status(500).json({ message: error.message });
    }
};

// Hàm cập nhật danh mục
const editCate = async (req, res) => {
  try {
    const { name, hidden } = req.body;

    // Kiểm tra tên danh mục
    if (!name) {
      return res.status(400).json({ message: "Tên danh mục không được bỏ trống" });
    }

    // Cập nhật danh mục theo id, cập nhật cả name và hidden nếu có
    const updatedCategory = await categories.findByIdAndUpdate(
      req.params.id,
      { name, hidden },  // cập nhật luôn trường hidden
      { new: true }
    );

    // Nếu không tìm thấy danh mục
    if (!updatedCategory) {
      return res.status(404).json({ message: "Danh mục không tồn tại" });
    }

    // Trả về kết quả cập nhật kèm message
    res.status(200).json({
      message: "Cập nhật danh mục thành công",
      data: updatedCategory
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật danh mục:", error);
    res.status(500).json({ message: error.message });
  }
};



// Xóa sản phẩm 
// const deleteCate = async (req, res) => {
//     try {
//         const data = await categories.findByIdAndDelete(req.params.id);

//         if (!data) {
//             return res.status(404).json({ message: 'Danh mục không tồn tại' });
//         }

//         res.status(200).json({ message: 'Xóa sản phẩm thành công' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: error.message });
//     }
// };



//export ra để các file khác có thể sử dụng
module.exports ={ getAllCategories, getCategoryById, addCate, editCate};