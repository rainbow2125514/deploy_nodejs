const Voucher = require('../models/voucherModel');

// Lấy tất cả vouchers (admin, FE dùng cho bảng quản lý)
const getAllVouchers = async (req, res) => {
  try {
    const arr = await Voucher.find();
    res.status(200).json(arr);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy 1 voucher theo id
const getVoucherById = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ message: "Voucher không tồn tại" });
    }
    res.status(200).json(voucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Thêm mới voucher
const addVoucher = async (req, res) => {
  try {
    const voucherData = req.body;
    if (!["all", "category", "product"].includes(voucherData.targetType)) {
      return res.status(400).json({ message: "Loại voucher (targetType) không hợp lệ" });
    }
    if (!voucherData.startDate || !voucherData.endDate) {
      return res.status(400).json({ message: "Vui lòng nhập ngày bắt đầu và kết thúc." });
    }
    if (new Date(voucherData.startDate) > new Date(voucherData.endDate)) {
      return res.status(400).json({ message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu." });
    }
    if (voucherData.targetType === "all") {
      voucherData.categoryIds = [];
      voucherData.productIds = [];
    } else if (voucherData.targetType === "category") {
      voucherData.productIds = [];
    } else if (voucherData.targetType === "product") {
      voucherData.categoryIds = [];
    }
    if (typeof voucherData.active !== "boolean") voucherData.active = false;

    const voucher = new Voucher(voucherData);
    await voucher.save();
    res.status(201).json(voucher);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Sửa voucher
const editVoucher = async (req, res) => {
  try {
    const {
      discountCode, percent, amount, startDate, endDate, description,
      productIds, categoryIds, minOrderValue, maxDiscount,
      usageLimit, used, targetType, active
    } = req.body;

    if (!discountCode) {
      return res.status(400).json({ message: "Mã giảm giá không được bỏ trống" });
    }
    if (!["all", "category", "product"].includes(targetType)) {
      return res.status(400).json({ message: "Loại voucher (targetType) không hợp lệ" });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Vui lòng nhập ngày bắt đầu và ngày kết thúc." });
    }
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu." });
    }

    let updateFields = {
      discountCode, percent, amount, startDate, endDate, description,
      minOrderValue, maxDiscount, usageLimit, used, targetType
    };
    if (targetType === "all") {
      updateFields.categoryIds = [];
      updateFields.productIds = [];
    } else if (targetType === "category") {
      updateFields.categoryIds = categoryIds || [];
      updateFields.productIds = [];
    } else if (targetType === "product") {
      updateFields.categoryIds = [];
      updateFields.productIds = productIds || [];
    }
    if (typeof active === "boolean") updateFields.active = active;

    const updatedVoucher = await Voucher.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedVoucher) {
      return res.status(404).json({ message: "Voucher không tồn tại" });
    }

    res.status(200).json(updatedVoucher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllVouchers,
  getVoucherById,
  addVoucher,
  editVoucher
};