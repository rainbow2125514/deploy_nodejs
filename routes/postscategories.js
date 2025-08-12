const slugify = require('slugify');
const express = require('express');
const router = express.Router();
const PostCategory = require('../models/postscategoryModel');

// ✅ Lấy danh sách danh mục bài viết
router.get('/', async (req, res) => {
  try {
    const categories = await PostCategory.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Lấy chi tiết danh mục theo slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const category = await PostCategory.findOne({ slug: req.params.slug });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Lấy chi tiết danh mục theo ID
router.get('/:id', async (req, res) => {
  try {
    const category = await PostCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Not found' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Thêm mới danh mục bài viết
router.post('/', async (req, res) => {
  try {
    // Tự sinh slug nếu chưa nhập
    if (!req.body.slug && req.body.title) {
      req.body.slug = slugify(req.body.title, { lower: true, strict: true });
    }

    // Kiểm tra trùng slug (tuỳ chọn, khuyên dùng)
    const exists = await PostCategory.findOne({ slug: req.body.slug });
    if (exists) return res.status(400).json({ message: 'Slug đã tồn tại' });

    const category = new PostCategory(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Sửa danh mục bài viết + tự động cập nhật trạng thái bài viết theo
router.put('/:id', async (req, res) => {
  try {
    const { title, slug, hidden } = req.body;

    // Nếu có title mới mà không có slug → tự sinh slug
    if (!slug && title) {
      req.body.slug = slugify(title, { lower: true, strict: true });
    }

    // Kiểm tra slug đã tồn tại chưa (tránh trùng với danh mục khác)
    if (req.body.slug) {
      const existing = await PostCategory.findOne({ slug: req.body.slug });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'Slug đã tồn tại' });
      }
    }

    // Cập nhật danh mục
    const updated = await PostCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });

    // ✅ Nếu trường hidden được gửi lên → cập nhật toàn bộ bài viết thuộc danh mục này
    if (typeof hidden === 'boolean') {
      const Post = require('../models/postModel'); // 👉 đảm bảo đã có model Post
      await Post.updateMany(
        { categoryId: req.params.id },
        { hidden: hidden }
      );
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ✅ Xoá danh mục bài viết
router.delete('/:id', async (req, res) => {
  try {
    const category = await PostCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
