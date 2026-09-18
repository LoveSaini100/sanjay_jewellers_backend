const Category = require('../models/Category');
const Product = require('../models/Product');
const slugify = require('slugify');
const mongoose = require('mongoose');
const mockStore = require('../data/mockStore');
const { processUploadedFiles, deleteImagesFromStorage } = require('../middleware/upload');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Get all active categories (or all for admin)
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const { all } = req.query;

    if (isDbConnected()) {
      const query = all === 'true' ? {} : { isActive: true };
      const categories = await Category.find(query).sort({ order: 1, name: 1 });
      const categoriesWithCounts = await Promise.all(
        categories.map(async (cat) => {
          const productCount = await Product.countDocuments({ category: cat._id });
          return {
            ...cat.toObject(),
            productCount,
          };
        })
      );
      return res.status(200).json({ success: true, categories: categoriesWithCounts });
    } else {
      let categories = [...mockStore.getCategories()];
      if (all !== 'true') {
        categories = categories.filter((c) => c.isActive !== false);
      }
      const products = mockStore.getProducts();
      const categoriesWithCounts = categories.map((cat) => {
        const productCount = products.filter(
          (p) => p.category && (p.category._id === cat._id || p.category.slug === cat.slug)
        ).length;
        return {
          ...cat,
          productCount,
        };
      });
      return res.status(200).json({ success: true, categories: categoriesWithCounts });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create category (Admin)
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, order, isActive, imageUrl } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    let image = { url: imageUrl || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80', public_id: '' };
    if (req.files && req.files.length > 0) {
      const uploaded = await processUploadedFiles(req.files, req);
      if (uploaded.length > 0) image = uploaded[0];
    }

    if (isDbConnected()) {
      const category = await Category.create({
        name,
        slug,
        description,
        order: order ? Number(order) : 0,
        isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
        image,
      });
      return res.status(201).json({ success: true, message: 'Category created successfully', category });
    } else {
      const newCat = {
        _id: mockStore.generateId(),
        name,
        slug,
        description,
        order: order ? Number(order) : 0,
        isActive: isActive === undefined ? true : isActive === 'true' || isActive === true,
        image,
        createdAt: new Date().toISOString(),
      };
      const cats = [...mockStore.getCategories(), newCat];
      mockStore.setCategories(cats);
      return res.status(201).json({ success: true, message: 'Category created successfully', category: newCat });
    }
  } catch (error) {
    if (req.files && req.files.length > 0) {
      try {
        const filenames = req.files.map((f) => f.filename);
        await deleteImagesFromStorage(filenames.map((name) => ({ public_id: name })));
      } catch (e) {}
    }
    next(error);
  }
};

// @desc    Update category (Admin)
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, order, isActive, imageUrl } = req.body;

    if (isDbConnected()) {
      let category = await Category.findById(req.params.id);
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

      if (name && name !== category.name) {
        category.name = name;
        category.slug = slugify(name, { lower: true, strict: true });
      }
      if (description !== undefined) category.description = description;
      if (order !== undefined) category.order = Number(order);
      if (isActive !== undefined) category.isActive = isActive === 'true' || isActive === true;

      if (req.files && req.files.length > 0) {
        // Delete previous image from storage if local
        if (category.image) {
          await deleteImagesFromStorage(category.image);
        }
        const uploaded = await processUploadedFiles(req.files, req);
        if (uploaded.length > 0) category.image = uploaded[0];
      } else if (imageUrl) {
        category.image = { url: imageUrl, public_id: '' };
      }

      await category.save();
      return res.status(200).json({ success: true, message: 'Category updated successfully', category });
    } else {
      const cats = mockStore.getCategories();
      const index = cats.findIndex((c) => c._id === req.params.id);
      if (index === -1) return res.status(404).json({ success: false, message: 'Category not found' });

      let image = cats[index].image;
      if (req.files && req.files.length > 0) {
        if (image) {
          await deleteImagesFromStorage(image);
        }
        const uploaded = await processUploadedFiles(req.files, req);
        if (uploaded.length > 0) image = uploaded[0];
      } else if (imageUrl) {
        image = { url: imageUrl, public_id: '' };
      }

      const updated = {
        ...cats[index],
        name: name || cats[index].name,
        slug: name ? slugify(name, { lower: true, strict: true }) : cats[index].slug,
        description: description !== undefined ? description : cats[index].description,
        order: order !== undefined ? Number(order) : cats[index].order,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : cats[index].isActive,
        image,
        updatedAt: new Date().toISOString(),
      };

      cats[index] = updated;
      mockStore.setCategories(cats);
      return res.status(200).json({ success: true, message: 'Category updated successfully', category: updated });
    }
  } catch (error) {
    if (req.files && req.files.length > 0) {
      try {
        const filenames = req.files.map((f) => f.filename);
        await deleteImagesFromStorage(filenames.map((name) => ({ public_id: name })));
      } catch (e) {}
    }
    next(error);
  }
};

// @desc    Delete category (Admin)
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const category = await Category.findById(req.params.id);
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

      const productCount = await Product.countDocuments({ category: category._id });
      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category with ${productCount} assigned products.`,
        });
      }

      if (category.image) {
        await deleteImagesFromStorage(category.image);
      }
      await Category.findByIdAndDelete(req.params.id);
      return res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } else {
      let cats = mockStore.getCategories();
      const cat = cats.find((c) => c._id === req.params.id);
      if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

      const products = mockStore.getProducts();
      const productCount = products.filter(
        (p) => p.category && (p.category._id === cat._id || p.category.slug === cat.slug)
      ).length;

      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category with ${productCount} assigned products.`,
        });
      }

      if (cat.image) {
        await deleteImagesFromStorage(cat.image);
      }
      cats = cats.filter((c) => c._id !== req.params.id);
      mockStore.setCategories(cats);
      return res.status(200).json({ success: true, message: 'Category deleted successfully' });
    }
  } catch (error) {
    next(error);
  }
};
