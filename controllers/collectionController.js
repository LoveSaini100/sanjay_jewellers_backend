const Collection = require('../models/Collection');
const Product = require('../models/Product');
const slugify = require('slugify');
const mongoose = require('mongoose');
const mockStore = require('../data/mockStore');
const { processUploadedFiles } = require('../middleware/upload');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Get all collections
// @route   GET /api/collections
// @access  Public
exports.getCollections = async (req, res, next) => {
  try {
    const { all } = req.query;

    if (isDbConnected()) {
      const query = all === 'true' ? {} : { isActive: true };
      const collections = await Collection.find(query).sort({ isFeatured: -1, createdAt: -1 });
      const collectionsWithCounts = await Promise.all(
        collections.map(async (col) => {
          const productCount = await Product.countDocuments({ collectionRef: col._id });
          return {
            ...col.toObject(),
            productCount,
          };
        })
      );
      return res.status(200).json({ success: true, collections: collectionsWithCounts });
    } else {
      let collections = [...mockStore.getCollections()];
      if (all !== 'true') {
        collections = collections.filter((c) => c.isActive !== false);
      }
      const products = mockStore.getProducts();
      const collectionsWithCounts = collections.map((col) => {
        const productCount = products.filter(
          (p) => p.collectionRef && (p.collectionRef._id === col._id || p.collectionRef.slug === col.slug)
        ).length;
        return {
          ...col,
          productCount,
        };
      });
      return res.status(200).json({ success: true, collections: collectionsWithCounts });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create collection (Admin)
// @route   POST /api/collections
// @access  Private
exports.createCollection = async (req, res, next) => {
  try {
    const { name, tagline, description, isFeatured, isActive, bannerImageUrl } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    let bannerImage = { url: bannerImageUrl || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=85', public_id: '' };
    if (req.files && req.files.length > 0) {
      const uploaded = await processUploadedFiles(req.files, req);
      if (uploaded.length > 0) bannerImage = uploaded[0];
    }

    if (isDbConnected()) {
      const collection = await Collection.create({
        name,
        slug,
        tagline,
        description,
        isFeatured: isFeatured === 'true' || isFeatured === true,
        isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
        bannerImage,
      });
      return res.status(201).json({ success: true, message: 'Collection created successfully', collection });
    } else {
      const newCol = {
        _id: mockStore.generateId(),
        name,
        slug,
        tagline,
        description,
        isFeatured: isFeatured === 'true' || isFeatured === true,
        isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
        bannerImage,
        createdAt: new Date().toISOString(),
      };
      const collections = [...mockStore.getCollections(), newCol];
      mockStore.setCollections(collections);
      return res.status(201).json({ success: true, message: 'Collection created successfully', collection: newCol });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update collection (Admin)
// @route   PUT /api/collections/:id
// @access  Private
exports.updateCollection = async (req, res, next) => {
  try {
    const { name, tagline, description, isFeatured, isActive, bannerImageUrl } = req.body;

    if (isDbConnected()) {
      let collection = await Collection.findById(req.params.id);
      if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

      if (name && name !== collection.name) {
        collection.name = name;
        collection.slug = slugify(name, { lower: true, strict: true });
      }
      if (tagline !== undefined) collection.tagline = tagline;
      if (description !== undefined) collection.description = description;
      if (isFeatured !== undefined) collection.isFeatured = isFeatured === 'true' || isFeatured === true;
      if (isActive !== undefined) collection.isActive = isActive === 'true' || isActive === true;

      if (req.files && req.files.length > 0) {
        const uploaded = await processUploadedFiles(req.files, req);
        if (uploaded.length > 0) collection.bannerImage = uploaded[0];
      } else if (bannerImageUrl) {
        collection.bannerImage = { url: bannerImageUrl, public_id: '' };
      }

      await collection.save();
      return res.status(200).json({ success: true, message: 'Collection updated successfully', collection });
    } else {
      const cols = mockStore.getCollections();
      const index = cols.findIndex((c) => c._id === req.params.id);
      if (index === -1) return res.status(404).json({ success: false, message: 'Collection not found' });

      let bannerImage = cols[index].bannerImage;
      if (req.files && req.files.length > 0) {
        const uploaded = await processUploadedFiles(req.files, req);
        if (uploaded.length > 0) bannerImage = uploaded[0];
      } else if (bannerImageUrl) {
        bannerImage = { url: bannerImageUrl, public_id: '' };
      }

      const updated = {
        ...cols[index],
        name: name || cols[index].name,
        slug: name ? slugify(name, { lower: true, strict: true }) : cols[index].slug,
        tagline: tagline !== undefined ? tagline : cols[index].tagline,
        description: description !== undefined ? description : cols[index].description,
        isFeatured: isFeatured !== undefined ? (isFeatured === 'true' || isFeatured === true) : cols[index].isFeatured,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : cols[index].isActive,
        bannerImage,
        updatedAt: new Date().toISOString(),
      };

      cols[index] = updated;
      mockStore.setCollections(cols);
      return res.status(200).json({ success: true, message: 'Collection updated successfully', collection: updated });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete collection (Admin)
// @route   DELETE /api/collections/:id
// @access  Private
exports.deleteCollection = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const collection = await Collection.findById(req.params.id);
      if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });

      await Product.updateMany({ collectionRef: collection._id }, { $set: { collectionRef: null } });
      await Collection.findByIdAndDelete(req.params.id);
      return res.status(200).json({ success: true, message: 'Collection deleted successfully' });
    } else {
      let cols = mockStore.getCollections();
      const exists = cols.some((c) => c._id === req.params.id);
      if (!exists) return res.status(404).json({ success: false, message: 'Collection not found' });

      cols = cols.filter((c) => c._id !== req.params.id);
      mockStore.setCollections(cols);
      return res.status(200).json({ success: true, message: 'Collection deleted successfully' });
    }
  } catch (error) {
    next(error);
  }
};
