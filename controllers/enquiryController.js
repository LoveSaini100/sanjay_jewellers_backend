const Enquiry = require('../models/Enquiry');
const mongoose = require('mongoose');
const mockStore = require('../data/mockStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Submit new customer enquiry
// @route   POST /api/enquiries
// @access  Public
exports.createEnquiry = async (req, res, next) => {
  try {
    const { name, phone, email, location, product, productName, productSku, productUrl, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({ success: false, message: 'Please provide Name, Phone number, and Message' });
    }

    if (isDbConnected()) {
      const enquiry = await Enquiry.create({
        name,
        phone,
        email,
        location: location || '',
        product: product || null,
        productName: productName || '',
        productSku: productSku || '',
        productUrl: productUrl || '',
        message,
        status: 'New',
      });
      return res.status(201).json({
        success: true,
        message: 'Thank you for reaching out. Our jewellery specialist will contact you shortly.',
        enquiry,
      });
    } else {
      const products = mockStore.getProducts();
      let prodObj = null;
      if (product) {
        prodObj = products.find((p) => p._id === product);
      }
      const newEnquiry = {
        _id: mockStore.generateId(),
        name,
        phone,
        email: email || '',
        location: location || '',
        product: prodObj ? { _id: prodObj._id, name: prodObj.name, sku: prodObj.sku, price: prodObj.price, images: prodObj.images } : null,
        productName: productName || (prodObj ? prodObj.name : ''),
        productSku: productSku || (prodObj ? prodObj.sku : ''),
        productUrl: productUrl || '',
        message,
        status: 'New',
        notes: '',
        createdAt: new Date().toISOString(),
      };
      const enquiries = [newEnquiry, ...mockStore.getEnquiries()];
      mockStore.setEnquiries(enquiries);

      return res.status(201).json({
        success: true,
        message: 'Thank you for reaching out. Our jewellery specialist will contact you shortly.',
        enquiry: newEnquiry,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all enquiries (Admin)
// @route   GET /api/enquiries
// @access  Private
exports.getEnquiries = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    if (isDbConnected()) {
      const query = {};
      if (status && status !== 'all') query.status = status;
      if (search && search.trim() !== '') {
        query.$or = [
          { name: { $regex: search.trim(), $options: 'i' } },
          { phone: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
          { productName: { $regex: search.trim(), $options: 'i' } },
          { productSku: { $regex: search.trim(), $options: 'i' } },
        ];
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const total = await Enquiry.countDocuments(query);
      const enquiries = await Enquiry.find(query)
        .populate('product', 'name sku price images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        enquiries,
      });
    } else {
      let list = [...mockStore.getEnquiries()];

      if (status && status !== 'all') {
        list = list.filter((e) => e.status === status);
      }
      if (search && search.trim() !== '') {
        const s = search.trim().toLowerCase();
        list = list.filter(
          (e) =>
            e.name.toLowerCase().includes(s) ||
            e.phone.toLowerCase().includes(s) ||
            (e.email && e.email.toLowerCase().includes(s)) ||
            (e.productName && e.productName.toLowerCase().includes(s)) ||
            (e.productSku && e.productSku.toLowerCase().includes(s))
        );
      }

      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;
      const paginated = list.slice(skip, skip + limitNum);

      return res.status(200).json({
        success: true,
        total: list.length,
        totalPages: Math.ceil(list.length / limitNum),
        currentPage: pageNum,
        enquiries: paginated,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update enquiry status & notes (Admin)
// @route   PUT /api/enquiries/:id
// @access  Private
exports.updateEnquiry = async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    if (isDbConnected()) {
      let enquiry = await Enquiry.findById(req.params.id);
      if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });

      if (status) enquiry.status = status;
      if (notes !== undefined) enquiry.notes = notes;
      await enquiry.save();

      return res.status(200).json({ success: true, message: 'Enquiry updated successfully', enquiry });
    } else {
      const list = mockStore.getEnquiries();
      const index = list.findIndex((e) => e._id === req.params.id);
      if (index === -1) return res.status(404).json({ success: false, message: 'Enquiry not found' });

      const updated = {
        ...list[index],
        status: status || list[index].status,
        notes: notes !== undefined ? notes : list[index].notes,
        updatedAt: new Date().toISOString(),
      };
      list[index] = updated;
      mockStore.setEnquiries(list);

      return res.status(200).json({ success: true, message: 'Enquiry updated successfully', enquiry: updated });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete enquiry (Admin)
// @route   DELETE /api/enquiries/:id
// @access  Private
exports.deleteEnquiry = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
      if (!enquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });
      return res.status(200).json({ success: true, message: 'Enquiry deleted successfully' });
    } else {
      let list = mockStore.getEnquiries();
      const exists = list.some((e) => e._id === req.params.id);
      if (!exists) return res.status(404).json({ success: false, message: 'Enquiry not found' });

      list = list.filter((e) => e._id !== req.params.id);
      mockStore.setEnquiries(list);
      return res.status(200).json({ success: true, message: 'Enquiry deleted successfully' });
    }
  } catch (error) {
    next(error);
  }
};
