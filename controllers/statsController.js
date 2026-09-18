const Product = require('../models/Product');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const Enquiry = require('../models/Enquiry');
const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');
const mockStore = require('../data/mockStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Get dashboard metrics & summary
// @route   GET /api/admin/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const [
        totalProducts,
        featuredProducts,
        outOfStockProducts,
        totalEnquiries,
        newEnquiries,
        totalAppointments,
        pendingAppointments,
        totalCategories,
        totalCollections,
        recentProducts,
        recentEnquiries,
        recentAppointments,
      ] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ isFeatured: true }),
        Product.countDocuments({ availability: 'Out of Stock' }),
        Enquiry.countDocuments(),
        Enquiry.countDocuments({ status: 'New' }),
        Appointment.countDocuments(),
        Appointment.countDocuments({ status: 'Pending' }),
        Category.countDocuments(),
        Collection.countDocuments(),
        Product.find().sort({ createdAt: -1 }).limit(5).populate('category', 'name'),
        Enquiry.find().sort({ createdAt: -1 }).limit(5),
        Appointment.find().sort({ createdAt: -1 }).limit(5),
      ]);

      return res.status(200).json({
        success: true,
        stats: {
          totalProducts,
          featuredProducts,
          outOfStockProducts,
          totalEnquiries,
          newEnquiries,
          totalAppointments,
          pendingAppointments,
          totalCategories,
          totalCollections,
        },
        recent: {
          products: recentProducts,
          enquiries: recentEnquiries,
          appointments: recentAppointments,
        },
      });
    } else {
      const products = mockStore.getProducts();
      const enquiries = mockStore.getEnquiries();
      const appointments = mockStore.getAppointments();
      const categories = mockStore.getCategories();
      const collections = mockStore.getCollections();

      return res.status(200).json({
        success: true,
        stats: {
          totalProducts: products.length,
          featuredProducts: products.filter((p) => p.isFeatured).length,
          outOfStockProducts: products.filter((p) => p.availability === 'Out of Stock' || p.stock === 0).length,
          totalEnquiries: enquiries.length,
          newEnquiries: enquiries.filter((e) => e.status === 'New').length,
          totalAppointments: appointments.length,
          pendingAppointments: appointments.filter((a) => a.status === 'Pending').length,
          totalCategories: categories.length,
          totalCollections: collections.length,
        },
        recent: {
          products: products.slice(0, 5),
          enquiries: enquiries.slice(0, 5),
          appointments: appointments.slice(0, 5),
        },
      });
    }
  } catch (error) {
    next(error);
  }
};
