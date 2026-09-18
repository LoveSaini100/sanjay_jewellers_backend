const express = require('express');
const router = express.Router();
const {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} = require('../controllers/collectionController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/', getCollections);
router.post('/', protect, upload.array('bannerImage', 1), createCollection);
router.put('/:id', protect, upload.array('bannerImage', 1), updateCollection);
router.delete('/:id', protect, deleteCollection);

module.exports = router;
