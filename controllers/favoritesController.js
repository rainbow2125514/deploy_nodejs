const Favorite = require('../models/favoritesModel');

// POST: Thêm sản phẩm vào yêu thích
exports.addFavorite = async (req, res) => {
  const { productId, userId } = req.body;

  if (!productId || !userId) {
    return res.status(400).json({ error: 'Thiếu productId hoặc userId' });
  }

  try {
    const existing = await Favorite.findOne({ productId, userId });
    if (existing) {
      return res.status(200).json({ message: 'Sản phẩm đã được yêu thích' });
    }

    const newFav = new Favorite({ productId, userId });
    await newFav.save();
    res.status(201).json({ message: 'Đã thêm vào yêu thích', data: newFav });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET: Lấy danh sách yêu thích của user
exports.getFavoritesByUser = async (req, res) => {
  const userId = req.query.userId || req.body.userId;

  if (!userId) return res.status(400).json({ error: 'Thiếu userId' });

  try {
    const favorites = await Favorite.find({ userId }).populate({
      path: 'productId',
      model: 'products',
      populate: {
        path: 'variants',
        model: 'variants'
      }
    });

    res.status(200).json(favorites.map(fav => fav.productId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE: Xóa khỏi yêu thích
exports.removeFavorite = async (req, res) => {
  // Controller:
const { productId } = req.params;
const { userId } = req.query;

  if (!productId || !userId) {
    return res.status(400).json({ error: 'Thiếu productId hoặc userId' });
  }

  try {
    const result = await Favorite.deleteOne({ productId, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy để xóa' });
    }

    res.status(200).json({ message: 'Đã xóa khỏi yêu thích' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};