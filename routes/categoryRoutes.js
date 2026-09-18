const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/', getCategories);
router.post('/', protect, upload.array('image', 1), createCategory);
router.put('/:id', protect, upload.array('image', 1), updateCategory);
router.delete('/:id', protect, deleteCategory);

module.exports = router;
