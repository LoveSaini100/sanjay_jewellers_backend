const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.get('/', getProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);

// Protected Admin routes
router.post('/', protect, upload.array('images', 8), createProduct);
router.put('/:id', protect, upload.array('images', 8), updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;
