const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  productId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Thêm dòng này
  username: String,
  rating: Number,
  comment: String,
  status: { type: String, enum: ["visible", "hidden"], default: "visible" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Review", reviewSchema);
