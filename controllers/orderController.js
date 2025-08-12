const Order = require('../models/orderModel');
const OrderDetail = require('../models/orderDetailModel');
const mongoose = require("mongoose");
const Product = require('../models/productModel');
const Variant = require('../models/variantsModel');
const Voucher = require('../models/voucherModel');

// POST: Tạo đơn hàng mới
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingInfo, totalPrice, paymentMethod, coupon, orderId, shippingFee } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!items || !shippingInfo || !totalPrice || !paymentMethod) {
      return res.status(400).json({ message: "Thiếu thông tin đơn hàng" });
    }

    // Xác định trạng thái thanh toán mặc định
    let paymentStatus = 'pending';
    if (paymentMethod === 'cod') {
      paymentStatus = 'unpaid';
    }

    // 1. Lưu thông tin đơn hàng tổng quan khi tạo Order:
    const newOrder = new Order({
      orderId: orderId || undefined,
      shippingInfo: {
        ...shippingInfo,
        userId: userId || null
      },     
      shippingFee: shippingFee || 0, //phí ship
      totalPrice,
      paymentMethod,
      coupon,
      paymentStatus,           // Trạng thái thanh toán
      orderStatus: 'waiting'   // Mặc định là chờ xác nhận
    });
    await newOrder.save();

    // 2. Lưu từng item vào OrderDetail
    const details = await Promise.all(
      items.map(item =>
        OrderDetail.create({
          orderId: newOrder.orderId || newOrder._id.toString(),
          productId: item.productId,
          productName: item.productName, // Tên sản phẩm có thể lấy từ item
          variant: item.variant,
          quantity: item.quantity,
          image: item.image,
          price: item.price * item.quantity,
          coupon: coupon || ""
        })
      )
    );

    res.status(201).json({ message: "Đặt hàng thành công!", order: newOrder, orderDetails: details });
  } catch (err) {
    res.status(500).json({ message: "Đặt hàng thất bại!", error: err.message });
  }
};

//GET: lấy tất cả đơn hàng 
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy tất cả đơn hàng" });
  }
};

//PUT: Cập nhật trạng thái đơn hàng 
exports.updateOrderStatus = async (req, res) =>{
  try{
    const { orderId } = req.params;
    const { orderStatus } = req.body; //
    const order = await Order.findOneAndUpdate(
      { $or: [ { orderId }, { _id: orderId } ] },
      { orderStatus },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.json(order);
  } catch(err){
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ✅ GET: Kiểm tra trạng thái đơn hàng sau thanh toán (dành cho VNPay & Momo)
exports.getOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { vnp_ResponseCode, resultCode } = req.query;

  try {
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Nếu đã thanh toán, không làm gì
    if (order.paymentStatus === "paid") {
      return res.status(200).json({ status: "paid" });
    }

    // ✅ Nếu thanh toán VNPAY thành công
    if (vnp_ResponseCode === "00") {
      order.paymentStatus = "paid";
      await order.save();
      return res.status(200).json({ status: "paid" });
    }

    // ✅ Nếu thanh toán Momo thành công
    if (resultCode === "0") {
      order.paymentStatus = "paid";
      await order.save();
      return res.status(200).json({ status: "paid" });
    }

    // ❌ Nếu thanh toán thất bại
    if (vnp_ResponseCode || resultCode) {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(200).json({ status: "failed" });
    }

    // ⏳ Nếu chưa có callback
    return res.status(200).json({ status: "pending" });
  } catch (err) {
    console.error("Get order status error:", err);
    res.status(500).json({ message: "Lỗi server", detail: err.message });
  }
};


// GET: lấy tất cả đơn hàng (ADMIN )
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    const result = await Promise.all(
      orders.map(async (order) => {
        // orderId có thể là string hoặc _id, tùy cách bạn lưu lúc tạo OrderDetail
        const details = await OrderDetail.find({
          orderId: order.orderId || order._id.toString(),
        });
        // Lấy tên sản phẩm từ productName (vì bạn đã lưu sẵn khi tạo OrderDetail)
        const productNames = details.map(d => d.productName || '');
        return {
          ...order.toObject(),
          productNames,
        };
      })
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT: Cập nhật trạng thái đơn hàng (Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const { id } = req.params;

    const order = await Order.findOne({
      $or: [{ orderId: id }, { _id: id }]
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

    const currentStatus = order.orderStatus;
    order.orderStatus = orderStatus;

    // ✅ Nếu chuyển sang "delivered" mà chưa thanh toán
    if (orderStatus === 'delivered' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
    }

    const orderDetails = await OrderDetail.find({
      $or: [
        { orderId: order.orderId },
        { orderId: order._id.toString() }
      ]
    });

    // ✅ Nếu chuyển sang "delivered" thì luôn cập nhật kho
    if (orderStatus === 'delivered') {
      for (const detail of orderDetails) {
        if (!detail.productId) continue;

        let productObjectId;
        try {
          productObjectId = typeof detail.productId === 'string'
            ? mongoose.Types.ObjectId(detail.productId)
            : detail.productId;
        } catch (e) {
          console.warn(`❌ Không thể ép kiểu productId: ${detail.productId}`);
          continue;
        }

        // Tăng sold trong Product
        await Product.findByIdAndUpdate(
          productObjectId,
          { $inc: { sold: detail.quantity } }
        );

        // Giảm tồn kho trong Variant
        await Variant.findOneAndUpdate(
          {
            productId: productObjectId,
            size: detail.variant
          },
          { $inc: { quantity: -detail.quantity } }
        );
      }
// ...bên trong hàm async exports.updateOrderStatus...

if (orderStatus === 'delivered') {
  for (const detail of orderDetails) {
    // ...giảm tồn kho...
  }

  // THÊM ĐOẠN NÀY VÀO ĐÂY
  for (const detail of orderDetails) {
    if (!detail.productId) continue;
    let productObjectId;
    try {
      productObjectId = typeof detail.productId === 'string'
        ? mongoose.Types.ObjectId(detail.productId)
        : detail.productId;
    } catch (e) {
      continue;
    }

    // Lấy tất cả variants của sản phẩm này
    const allVariants = await Variant.find({ productId: productObjectId });
    const totalQuantity = allVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);

    // Cập nhật trạng thái sản phẩm
    const product = await Product.findById(productObjectId);
    if (product) {
      product.status = totalQuantity === 0 ? "Ẩn" : "Còn hàng";
      await product.save();
    }
  }
}
      // ✅ Nếu đơn hàng có dùng voucher thì cập nhật usage
        if (order.coupon) {
          const voucher = await Voucher.findOne({ discountCode: order.coupon });
          if (voucher) {
            voucher.used = (voucher.used || 0) + 1;
            if (voucher.usageLimit && voucher.usageLimit > 0) {
              voucher.usageLimit -= 1;
            }
            await voucher.save();
          } else {
            console.warn(`⚠️ Không tìm thấy voucher với discountCode: ${order.coupon}`);
          }
        }
    }

    // ✅ Nếu chuyển sang "returned" thì luôn rollback kho
    if (orderStatus === 'returned') {
      for (const detail of orderDetails) {
        if (!detail.productId) continue;

        let productObjectId;
        try {
          productObjectId = typeof detail.productId === 'string'
            ? mongoose.Types.ObjectId(detail.productId)
            : detail.productId;
        } catch (e) {
          console.warn(`❌ Không thể ép kiểu productId: ${detail.productId}`);
          continue;
        }

        // Giảm sold trong Product
        await Product.findByIdAndUpdate(
          productObjectId,
          { $inc: { sold: -detail.quantity } }
        );

        // Tăng lại tồn kho trong Variant
        await Variant.findOneAndUpdate(
          {
            productId: productObjectId,
            size: detail.variant
          },
          { $inc: { quantity: detail.quantity } }
        );
      }

      // Nếu đã thanh toán thì đánh dấu hoàn tiền
      if (order.paymentStatus === 'paid') {
        order.paymentStatus = 'refunded';
      }
    }

    await order.save();
    res.json({ message: '✅ Cập nhật trạng thái thành công', order });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({ error: "Server error" });
  }
};


exports.getLatestOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(10);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy đơn hàng mới nhất" });
  }
};

