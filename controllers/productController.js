const Product = require('../models/Product');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const slugify = require('slugify');
const mongoose = require('mongoose');
const mockStore = require('../data/mockStore');
const { processUploadedFiles, deleteImagesFromStorage } = require('../middleware/upload');
const { cloudinary } = require('../config/cloudinary');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Get all products with filtering, searching, sorting, pagination
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      collection,
      goldPurity,
      stoneType,
      minPrice,
      maxPrice,
      isPriceOnRequest,
      isFeatured,
      isNewArrival,
      isBestseller,
      isBridal,
      availability,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    if (isDbConnected()) {
      const query = {};

      if (search && search.trim() !== '') {
        query.$or = [
          { name: { $regex: search.trim(), $options: 'i' } },
          { sku: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } },
          { stoneType: { $regex: search.trim(), $options: 'i' } },
        ];
      }

      if (category && category !== 'all') {
        if (category.match(/^[0-9a-fA-F]{24}$/)) {
          query.category = category;
        } else {
          const catObj = await Category.findOne({ slug: category });
          if (catObj) query.category = catObj._id;
        }
      }

      if (collection && collection !== 'all') {
        if (collection.match(/^[0-9a-fA-F]{24}$/)) {
          query.collectionRef = collection;
        } else {
          const colObj = await Collection.findOne({ slug: collection });
          if (colObj) query.collectionRef = colObj._id;
        }
      }

      if (goldPurity && goldPurity !== 'all') {
        const purities = Array.isArray(goldPurity) ? goldPurity : goldPurity.split(',');
        query.goldPurity = { $in: purities };
      }

      if (stoneType && stoneType !== 'all') {
        const stones = Array.isArray(stoneType) ? stoneType : stoneType.split(',');
        query.stoneType = { $in: stones };
      }

      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
      }

      if (isPriceOnRequest !== undefined && isPriceOnRequest !== '') {
        query.isPriceOnRequest = isPriceOnRequest === 'true';
      }

      if (isFeatured !== undefined && isFeatured !== '') {
        query.isFeatured = isFeatured === 'true';
      }
      if (isNewArrival !== undefined && isNewArrival !== '') {
        query.isNewArrival = isNewArrival === 'true';
      }
      if (isBestseller !== undefined && isBestseller !== '') {
        query.isBestseller = isBestseller === 'true';
      }
      if (isBridal !== undefined && isBridal !== '') {
        query.isBridal = isBridal === 'true';
      }
      if (availability && availability !== 'all') {
        query.availability = availability;
      }

      let sortOptions = { createdAt: -1 };
      if (sort === 'price-asc') sortOptions = { price: 1 };
      if (sort === 'price-desc') sortOptions = { price: -1 };
      if (sort === 'name-asc') sortOptions = { name: 1 };
      if (sort === 'name-desc') sortOptions = { name: -1 };
      if (sort === 'oldest') sortOptions = { createdAt: 1 };
      if (sort === 'newest') sortOptions = { createdAt: -1 };

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 12;
      const skip = (pageNum - 1) * limitNum;

      const total = await Product.countDocuments(query);
      const products = await Product.find(query)
        .populate('category', 'name slug')
        .populate('collectionRef', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        count: products.length,
        total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        products,
      });
    } else {
      // Fallback in-memory
      let allProducts = [...mockStore.getProducts()];

      if (search && search.trim() !== '') {
        const s = search.trim().toLowerCase();
        allProducts = allProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            p.sku.toLowerCase().includes(s) ||
            (p.description && p.description.toLowerCase().includes(s)) ||
            (p.stoneType && p.stoneType.toLowerCase().includes(s))
        );
      }

      if (category && category !== 'all') {
        allProducts = allProducts.filter(
          (p) =>
            p.category &&
            (p.category._id === category || p.category.slug === category || p.category === category)
        );
      }

      if (collection && collection !== 'all') {
        allProducts = allProducts.filter(
          (p) =>
            p.collectionRef &&
            (p.collectionRef._id === collection || p.collectionRef.slug === collection || p.collectionRef === collection)
        );
      }

      if (goldPurity && goldPurity !== 'all') {
        const purities = Array.isArray(goldPurity) ? goldPurity : goldPurity.split(',');
        allProducts = allProducts.filter((p) => purities.includes(p.goldPurity));
      }

      if (stoneType && stoneType !== 'all') {
        const stones = Array.isArray(stoneType) ? stoneType : stoneType.split(',');
        allProducts = allProducts.filter((p) => stones.includes(p.stoneType));
      }

      if (minPrice) {
        allProducts = allProducts.filter((p) => p.price >= Number(minPrice));
      }
      if (maxPrice) {
        allProducts = allProducts.filter((p) => p.price <= Number(maxPrice));
      }

      if (isPriceOnRequest !== undefined && isPriceOnRequest !== '') {
        const val = isPriceOnRequest === 'true';
        allProducts = allProducts.filter((p) => !!p.isPriceOnRequest === val);
      }
      if (isFeatured !== undefined && isFeatured !== '') {
        const val = isFeatured === 'true';
        allProducts = allProducts.filter((p) => !!p.isFeatured === val);
      }
      if (isNewArrival !== undefined && isNewArrival !== '') {
        const val = isNewArrival === 'true';
        allProducts = allProducts.filter((p) => !!p.isNewArrival === val);
      }
      if (isBestseller !== undefined && isBestseller !== '') {
        const val = isBestseller === 'true';
        allProducts = allProducts.filter((p) => !!p.isBestseller === val);
      }
      if (isBridal !== undefined && isBridal !== '') {
        const val = isBridal === 'true';
        allProducts = allProducts.filter((p) => !!p.isBridal === val);
      }
      if (availability && availability !== 'all') {
        allProducts = allProducts.filter((p) => p.availability === availability);
      }

      // Sort
      if (sort === 'price-asc') allProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
      else if (sort === 'price-desc') allProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
      else if (sort === 'name-asc') allProducts.sort((a, b) => a.name.localeCompare(b.name));
      else if (sort === 'name-desc') allProducts.sort((a, b) => b.name.localeCompare(a.name));
      else allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 12;
      const skip = (pageNum - 1) * limitNum;
      const paginated = allProducts.slice(skip, skip + limitNum);

      return res.status(200).json({
        success: true,
        count: paginated.length,
        total: allProducts.length,
        totalPages: Math.ceil(allProducts.length / limitNum),
        currentPage: pageNum,
        products: paginated,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by SEO slug
// @route   GET /api/products/slug/:slug
// @access  Public
exports.getProductBySlug = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const product = await Product.findOne({ slug: req.params.slug })
        .populate('category', 'name slug')
        .populate('collectionRef', 'name slug');

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const related = await Product.find({
        _id: { $ne: product._id },
        $or: [
          { category: product.category?._id },
          { collectionRef: product.collectionRef?._id },
        ],
      })
        .populate('category', 'name slug')
        .limit(4);

      return res.status(200).json({
        success: true,
        product,
        related,
      });
    } else {
      const products = mockStore.getProducts();
      const product = products.find((p) => p.slug === req.params.slug);

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const related = products
        .filter(
          (p) =>
            p._id !== product._id &&
            ((product.category && p.category && p.category._id === product.category._id) ||
              (product.collectionRef && p.collectionRef && p.collectionRef._id === product.collectionRef._id))
        )
        .slice(0, 4);

      return res.status(200).json({
        success: true,
        product,
        related,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by ID (Admin)
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const product = await Product.findById(req.params.id)
        .populate('category', 'name slug')
        .populate('collectionRef', 'name slug');

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      return res.status(200).json({
        success: true,
        product,
      });
    } else {
      const products = mockStore.getProducts();
      const product = products.find((p) => p._id === req.params.id);

      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      return res.status(200).json({
        success: true,
        product,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create product (Admin)
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res, next) => {
  try {
    const productData = { ...req.body };

    // Process images
    let imageList = [];
    if (req.files && req.files.length > 0) {
      const uploadedImages = await processUploadedFiles(req.files, req);
      imageList = uploadedImages.map((img, idx) => ({
        url: img.url,
        public_id: img.public_id,
        isPrimary: idx === 0,
      }));
    }

    if (productData.existingImages) {
      try {
        const parsed = typeof productData.existingImages === 'string'
          ? JSON.parse(productData.existingImages)
          : productData.existingImages;
        imageList = [...parsed, ...imageList];
      } catch (e) {}
    }

    if (imageList.length === 0) {
      // Default placeholder luxury ring image
      imageList = [
        {
          url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85',
          public_id: 'default-luxury-jewel',
          isPrimary: true,
        },
      ];
    }
    productData.images = imageList;

    // Slug
    let baseSlug = slugify(productData.name || 'jewellery-item', { lower: true, strict: true });
    productData.slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    // Cast numbers & booleans
    productData.price = Number(productData.price) || 0;
    productData.stock = Number(productData.stock) || 1;
    productData.isPriceOnRequest = productData.isPriceOnRequest === 'true' || productData.isPriceOnRequest === true;
    productData.isFeatured = productData.isFeatured === 'true' || productData.isFeatured === true;
    productData.isNewArrival = productData.isNewArrival === 'true' || productData.isNewArrival === true;
    productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
    productData.isBridal = productData.isBridal === 'true' || productData.isBridal === true;

    if (isDbConnected()) {
      if (!productData.collectionRef || productData.collectionRef === 'null' || productData.collectionRef === '') {
        delete productData.collectionRef;
      }
      const product = await Product.create(productData);
      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product,
      });
    } else {
      const categories = mockStore.getCategories();
      const collections = mockStore.getCollections();
      const catObj = categories.find((c) => c._id === productData.category || c.slug === productData.category);
      const colObj = collections.find((c) => c._id === productData.collectionRef || c.slug === productData.collectionRef);

      const newProduct = {
        _id: mockStore.generateId(),
        ...productData,
        category: catObj ? { _id: catObj._id, name: catObj.name, slug: catObj.slug } : categories[0],
        collectionRef: colObj ? { _id: colObj._id, name: colObj.name, slug: colObj.slug } : null,
        createdAt: new Date().toISOString(),
      };

      const products = [newProduct, ...mockStore.getProducts()];
      mockStore.setProducts(products);

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product: newProduct,
      });
    }
  } catch (error) {
    if (req.files && req.files.length > 0) {
      // Clean up uploaded files if creation failed
      try {
        const filenames = req.files.map((f) => f.filename);
        await deleteImagesFromStorage(filenames.map((name) => ({ public_id: name })));
      } catch (e) {}
    }
    next(error);
  }
};

// @desc    Update product (Admin)
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res, next) => {
  try {
    const productData = { ...req.body };

    if (isDbConnected()) {
      let product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const previousImages = product.images || [];

      let updatedImages = [];
      if (productData.existingImages) {
        try {
          updatedImages = typeof productData.existingImages === 'string'
            ? JSON.parse(productData.existingImages)
            : productData.existingImages;
        } catch (e) {
          updatedImages = product.images;
        }
      } else {
        updatedImages = product.images;
      }

      // Identify images removed by admin and delete from uploads folder
      const removedImages = previousImages.filter(
        (oldImg) =>
          !updatedImages.some(
            (newImg) =>
              (newImg.public_id && oldImg.public_id && newImg.public_id === oldImg.public_id) ||
              (newImg.url && oldImg.url && newImg.url === oldImg.url)
          )
      );
      if (removedImages.length > 0) {
        await deleteImagesFromStorage(removedImages);
      }

      if (req.files && req.files.length > 0) {
        const uploadedImages = await processUploadedFiles(req.files, req);
        const newImages = uploadedImages.map((img) => ({
          url: img.url,
          public_id: img.public_id,
          isPrimary: false,
        }));
        updatedImages = [...updatedImages, ...newImages];
      }
      productData.images = updatedImages;

      if (productData.isPriceOnRequest !== undefined) {
        productData.isPriceOnRequest = productData.isPriceOnRequest === 'true' || productData.isPriceOnRequest === true;
      }
      if (productData.isFeatured !== undefined) {
        productData.isFeatured = productData.isFeatured === 'true' || productData.isFeatured === true;
      }
      if (productData.isNewArrival !== undefined) {
        productData.isNewArrival = productData.isNewArrival === 'true' || productData.isNewArrival === true;
      }
      if (productData.isBestseller !== undefined) {
        productData.isBestseller = productData.isBestseller === 'true' || productData.isBestseller === true;
      }
      if (productData.isBridal !== undefined) {
        productData.isBridal = productData.isBridal === 'true' || productData.isBridal === true;
      }

      if (productData.collectionRef === 'null' || productData.collectionRef === '') {
        productData.collectionRef = null;
      }

      product = await Product.findByIdAndUpdate(req.params.id, productData, {
        new: true,
        runValidators: true,
      })
        .populate('category', 'name slug')
        .populate('collectionRef', 'name slug');

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        product,
      });
    } else {
      const products = mockStore.getProducts();
      const index = products.findIndex((p) => p._id === req.params.id);

      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const existing = products[index];
      const previousImages = existing.images || [];

      let updatedImages = existing.images || [];
      if (productData.existingImages) {
        try {
          updatedImages = typeof productData.existingImages === 'string'
            ? JSON.parse(productData.existingImages)
            : productData.existingImages;
        } catch (e) {}
      }

      // Identify images removed by admin and delete from uploads folder
      const removedImages = previousImages.filter(
        (oldImg) =>
          !updatedImages.some(
            (newImg) =>
              (newImg.public_id && oldImg.public_id && newImg.public_id === oldImg.public_id) ||
              (newImg.url && oldImg.url && newImg.url === oldImg.url)
          )
      );
      if (removedImages.length > 0) {
        await deleteImagesFromStorage(removedImages);
      }

      if (req.files && req.files.length > 0) {
        const uploadedImages = await processUploadedFiles(req.files, req);
        const newImages = uploadedImages.map((img) => ({
          url: img.url,
          public_id: img.public_id,
          isPrimary: false,
        }));
        updatedImages = [...updatedImages, ...newImages];
      }
      productData.images = updatedImages;

      const categories = mockStore.getCategories();
      const collections = mockStore.getCollections();
      const catObj = productData.category ? categories.find((c) => c._id === productData.category || c.slug === productData.category) : existing.category;
      const colObj = productData.collectionRef ? collections.find((c) => c._id === productData.collectionRef || c.slug === productData.collectionRef) : existing.collectionRef;

      const updated = {
        ...existing,
        ...productData,
        price: productData.price !== undefined ? Number(productData.price) : existing.price,
        stock: productData.stock !== undefined ? Number(productData.stock) : existing.stock,
        isPriceOnRequest: productData.isPriceOnRequest !== undefined ? (productData.isPriceOnRequest === 'true' || productData.isPriceOnRequest === true) : existing.isPriceOnRequest,
        isFeatured: productData.isFeatured !== undefined ? (productData.isFeatured === 'true' || productData.isFeatured === true) : existing.isFeatured,
        isNewArrival: productData.isNewArrival !== undefined ? (productData.isNewArrival === 'true' || productData.isNewArrival === true) : existing.isNewArrival,
        isBestseller: productData.isBestseller !== undefined ? (productData.isBestseller === 'true' || productData.isBestseller === true) : existing.isBestseller,
        isBridal: productData.isBridal !== undefined ? (productData.isBridal === 'true' || productData.isBridal === true) : existing.isBridal,
        category: catObj || existing.category,
        collectionRef: colObj || null,
        updatedAt: new Date().toISOString(),
      };

      products[index] = updated;
      mockStore.setProducts(products);

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        product: updated,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product (Admin)
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      if (product.images && product.images.length > 0) {
        await deleteImagesFromStorage(product.images);
      }
      await Product.findByIdAndDelete(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } else {
      let products = mockStore.getProducts();
      const product = products.find((p) => p._id === req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      if (product.images && product.images.length > 0) {
        await deleteImagesFromStorage(product.images);
      }
      products = products.filter((p) => p._id !== req.params.id);
      mockStore.setProducts(products);
      return res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    }
  } catch (error) {
    next(error);
  }
};

