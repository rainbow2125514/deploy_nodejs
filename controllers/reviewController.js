const Review = require("../models/reviewModel");
const Order = require("../models/orderModel");
const OrderDetail = require("../models/orderDetailModel");
const User = require("../models/userModel");

// Lấy review cho khách hàng (ẩn review đã bị admin ẩn, hoặc lấy tất cả cho admin)
// Route: /reviews
exports.getReviews = async (req, res) => {
  try {
    const { productId, search, page = 1, limit = 10 } = req.query;
    const query = { status: "visible" };
    if (productId) query.productId = productId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const username = req.user?.username || null;

    res.json({
      username,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      reviews: reviews.map(r => ({
        ...r.toObject(),
        commenterName: r.username
      }))
    });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server khi lấy review" });
  }
};

// Route: /admin/reviews
exports.getReviewsAdmin = async (req, res) => {
  try {
    const { productId, search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (productId) query.productId = productId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      reviews
    });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server khi lấy review" });
  }
};
// trạn thái
const canUserReviewProduct = async (userId, productId) => {
  // 1. Lấy các đơn hàng đã giao thành công
  const deliveredOrders = await Order.find({
    "shippingInfo.userId": userId,
    orderStatus: "delivered",
  }).select('_id'); // chỉ lấy ID đơn hàng

  const deliveredOrderIds = deliveredOrders.map(order => order._id);

  // 2. Kiểm tra xem có OrderDetail nào trong các đơn đó chứa productId không
  const orderDetail = await OrderDetail.findOne({
    orderId: { $in: deliveredOrderIds },
    productId: productId
  });

  return !!orderDetail; // true nếu có, false nếu không
};


// Thêm review mới


exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Bạn chưa đăng nhập.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    // ❌ Kiểm tra đã đánh giá sản phẩm này chưa
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({ error: 'Bạn đã đánh giá sản phẩm này rồi.' });
    }

    // ✅ Lấy danh sách order đã giao của user
    const deliveredOrders = await Order.find({
      "shippingInfo.userId": userId,
      orderStatus: "delivered",
    }).select('_id');

    const deliveredOrderIds = deliveredOrders.map(order => order._id);

    if (deliveredOrderIds.length === 0) {
      return res.status(403).json({ error: 'Bạn cần mua và nhận hàng sản phẩm này để đánh giá.' });
    }

    // ✅ Kiểm tra OrderDetail có sản phẩm đó không
    const matchingOrderDetail = await OrderDetail.findOne({
      orderId: { $in: deliveredOrderIds },
      productId
    });

    if (!matchingOrderDetail) {
      return res.status(403).json({ error: 'Bạn chưa mua sản phẩm này hoặc đơn hàng chưa được giao.' });
    }

    // ✅ Tạo đánh giá
    const review = await Review.create({
      productId,
      userId,
      rating,
      comment,
      username: user.username || "Ẩn danh",
      status: "visible",
      createdAt: new Date()
    });

    res.status(201).json({ message: "Cảm ơn bạn đã đánh giá!", review });
  } catch (err) {
    console.error("Lỗi khi tạo đánh giá:", err);
    res.status(500).json({ error: "Lỗi server khi gửi đánh giá." });
  }
};


// Đổi trạng thái review (ẩn/hiện)
exports.toggleReviewStatus = async (req, res) => {
  try {
    // Kiểm tra quyền admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Chỉ admin mới được phép thay đổi trạng thái đánh giá" });
    }

    const { id } = req.params;
    const review = await Review.findById(id);
    console.log("Review found:", review);

    if (!review) {
      return res.status(404).json({ error: "Không tìm thấy review" });
    }

    review.status = review.status === "visible" ? "hidden" : "visible";
    await review.save();

    console.log("Review after save:", review);
    res.json(review);
  } catch (err) {
    console.error("Toggle status error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};


// Lấy review mới nhất cho mỗi sản phẩm
exports.getLatestReviewPerProduct = async (req, res) => {
  try {
    // Group by productId, lấy review mới nhất
    const latestReviews = await Review.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$productId",
          doc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$doc" } },
      {
        $addFields: {
          productIdObj: { $toObjectId: "$productId" } // Nếu productId là string, convert sang ObjectId
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "productIdObj",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      {
        $addFields: {
          productName: { $arrayElemAt: ["$productInfo.name", 0] }
        }
      },
      {
        $project: {
          productInfo: 0,
          productIdObj: 0
        }
      }
    ]);

    res.json({ reviews: latestReviews });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server khi lấy review mới nhất theo sản phẩm" });
  }
};
// Lấy thống kê review theo productId
exports.getReviewStats = async (req, res) => {
  const { productId } = req.params;

  try {
    const stats = await Review.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          status: "visible"
        }
      },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        productId,
        averageRating: 0,
        totalReviews: 0
      });
    }

    const { averageRating, totalReviews } = stats[0];

    res.json({
      productId,
      averageRating,
      totalReviews
    });
  } catch (error) {
    console.error('Lỗi khi lấy thống kê:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};