const express = require('express');
const router = express.Router();
const Post = require('../models/postModel');
const PostCategory = require('../models/postscategoryModel');
const slugify = require('slugify');
const multer = require("multer");
const path = require("path");
const fs = require('fs');

// ✅ Cấu hình multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s/g, "_");
    cb(null, uniqueName);
  },
});

// Xoá file nếu tồn tại
const upload = multer({ storage });
const deleteFileIfExists = (filename) => {
  const filepath = path.join(__dirname, '../public/images', filename);
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`Đã xóa file: ${filepath}`);
    } else {
      console.warn(`File không tồn tại: ${filepath}`);
    }
  } catch (err) {
    console.error("Lỗi khi xoá file:", err.message);
  }
};


// ✅ GET tất cả bài viết (có lọc)
router.get('/', async (req, res) => {
  const { categoryId, hidden } = req.query;
  const filter = {};
  if (categoryId) filter.categoryId = categoryId;
  if (typeof hidden !== 'undefined') filter.hidden = hidden === 'true';

  try {
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json({ total: posts.length, items: posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET theo slug danh mục
router.get('/by-category-slug/:slug', async (req, res) => {
  try {
    const category = await PostCategory.findOne({ slug: req.params.slug });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const posts = await Post.find({ categoryId: category._id }).sort({ createdAt: -1 });
    res.json({
      total: posts.length,
      items: posts,
      categoryTitle: category.title
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET theo categoryId
router.get('/category/:categoryId', async (req, res) => {
  const { hidden } = req.query;
  const filter = { categoryId: req.params.categoryId };
  if (typeof hidden !== 'undefined') filter.hidden = hidden === 'true';

  try {
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json({ total: posts.length, items: posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET theo slug bài viết
router.get('/slug/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: 'Not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET theo ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });
    res.json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ POST tạo mới
router.post("/", upload.fields([
  { name: "img", maxCount: 1 },
  { name: "images", maxCount: 10 }
]), async (req, res) => {
  try {
    const data = req.body;

    // ✅ Lưu tên file thay vì đường dẫn
    if (req.files?.img) {
      data.img = req.files.img[0].filename;
    }
    if (req.files?.images) {
      data.images = req.files.images.map(file => file.filename);
    }

    if (!data.slug && data.title) {
      data.slug = slugify(data.title, { lower: true, strict: true });
    }

    const post = new Post(data);
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ PUT cập nhật
router.put("/:id", upload.fields([
  { name: "img", maxCount: 1 },
  { name: "images", maxCount: 10 }
]), async (req, res) => {
  try {
    const oldPost = await Post.findById(req.params.id);
    if (!oldPost) return res.status(404).json({ message: "Not found" });

    let data = {};

    if (req.is('multipart/form-data')) {
      // Đây là update kèm upload ảnh
      data = req.body;

      // Ảnh đại diện
      if (req.files?.img && req.files.img.length > 0) {
        if (oldPost.img && oldPost.img !== data.existingImg) {
          deleteFileIfExists(oldPost.img);
        }
        data.img = req.files.img[0].filename;
      } else if (data.existingImg) {
        data.img = data.existingImg;
        if (!data.img && oldPost.img) {
          deleteFileIfExists(oldPost.img);
        }
      } else {
        if (oldPost.img) {
          deleteFileIfExists(oldPost.img);
        }
        data.img = null;
      }

      // Ảnh phụ
      const existingImages = Array.isArray(data.existingImages)
        ? data.existingImages
        : data.existingImages
          ? [data.existingImages]
          : [];

      const uploadedImages = req.files?.images
        ? req.files.images.map(file => file.filename)
        : [];

      // Xóa ảnh phụ bị loại bỏ
      const removedImages = oldPost.images
        ? oldPost.images.filter(img => !existingImages.includes(img))
        : [];
      removedImages.forEach(filename => deleteFileIfExists(filename));

      data.images = [...existingImages, ...uploadedImages];

      // Xử lý slug
      if (!data.slug && data.title) {
        data.slug = slugify(data.title, { lower: true, strict: true });
      }

    } else {
      // Đây là update không upload ảnh (ví dụ toggle ẩn/hiện)
      data = req.body;

      // Giữ nguyên ảnh cũ nếu không có trường img hoặc images gửi lên
      data.img = oldPost.img;
      data.images = oldPost.images;

      // Nếu muốn, vẫn tạo slug nếu có title
      if (!data.slug && data.title) {
        data.slug = slugify(data.title, { lower: true, strict: true });
      }
    }

    const updatedPost = await Post.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updatedPost) return res.status(404).json({ message: "Not found" });

    res.json(updatedPost);

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});



// ✅ DELETE bài viết
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    // Xóa ảnh chính nếu có
    if (post.img) deleteFileIfExists(post.img);

    // Xóa ảnh phụ nếu có
    if (post.images && post.images.length > 0) {
      post.images.forEach(filename => deleteFileIfExists(filename));
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Xóa bài viết thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});


module.exports = router;
