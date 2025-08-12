const variants = require('../models/variantsModel');

// Thêm variant mới
exports.addVariant = async (req, res) => {
  try {
    const variant = new variants(req.body);
    const data = await variant.save();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả variants của 1 sản phẩm
exports.getVariantsByProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const data = await variants.find({ productId });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy tất cả variants
exports.getAllVariants = async (req, res) => {
  try {
    const data = await variants.find();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa variant
exports.deleteVariant = async (req, res) => {
  try {
    const id = req.params.id;
    await variants.findByIdAndDelete(id);
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
