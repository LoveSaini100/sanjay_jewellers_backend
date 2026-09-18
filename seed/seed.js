require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Collection = require('../models/Collection');
const Product = require('../models/Product');
const Enquiry = require('../models/Enquiry');
const Appointment = require('../models/Appointment');
const {
  categoriesData,
  collectionsData,
  productsData,
  sampleEnquiries,
  sampleAppointments,
} = require('./seedData');

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/new_sanjay_jewellers';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB successfully.');

    // Clear existing collections
    console.log('Clearing old collections...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Collection.deleteMany({});
    await Product.deleteMany({});
    await Enquiry.deleteMany({});
    await Appointment.deleteMany({});

    // 1. Create Default Admin
    console.log('Creating default Admin user...');
    const adminUser = await User.create({
      name: 'Showroom Director',
      email: 'admin@sanjayjewellers.com',
      password: '@sanjayjewellers2026',
      role: 'admin',
    });
    console.log(`Admin created: ${adminUser.email} / @sanjayjewellers2026`);

    // 2. Create Categories
    console.log('Creating Categories...');
    const createdCategories = await Category.insertMany(categoriesData);
    const categoryMap = {};
    createdCategories.forEach((cat) => {
      categoryMap[cat.slug] = cat._id;
    });

    // 3. Create Collections
    console.log('Creating Collections...');
    const createdCollections = await Collection.insertMany(collectionsData);
    const collectionMap = {};
    createdCollections.forEach((col) => {
      collectionMap[col.slug] = col._id;
    });

    // 4. Create Products
    console.log('Creating Products...');
    const preparedProducts = productsData.map((prod) => {
      const { categorySlug, collectionSlug, ...rest } = prod;
      return {
        ...rest,
        category: categoryMap[categorySlug] || createdCategories[0]._id,
        collectionRef: collectionSlug ? collectionMap[collectionSlug] || null : null,
      };
    });
    const createdProducts = await Product.insertMany(preparedProducts);
    console.log(`Created ${createdProducts.length} premium products.`);

    // 5. Create Sample Enquiries
    console.log('Creating Sample Enquiries...');
    const preparedEnquiries = sampleEnquiries.map((enq, idx) => ({
      ...enq,
      product: createdProducts[idx % createdProducts.length]._id,
    }));
    await Enquiry.insertMany(preparedEnquiries);

    // 6. Create Sample Appointments
    console.log('Creating Sample Appointments...');
    await Appointment.insertMany(sampleAppointments);

    console.log('Seeding completed successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDB();
