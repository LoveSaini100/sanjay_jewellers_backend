require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const updateAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log('Connected to MongoDB successfully.');

    let admin = await User.findOne({ email: 'admin@sanjayjewellers.com' });
    if (!admin) {
      console.log('Admin user does not exist, creating new admin...');
      admin = new User({
        name: 'Showroom Director',
        email: 'admin@sanjayjewellers.com',
        password: '@sanjayjewellers2026',
        role: 'admin',
      });
      await admin.save();
      console.log('✅ Admin user created with email: admin@sanjayjewellers.com and password: @sanjayjewellers2026');
    } else {
      console.log('Admin user found. Updating password...');
      admin.password = '@sanjayjewellers2026';
      await admin.save();
      console.log('✅ Admin password updated successfully in MongoDB Atlas: @sanjayjewellers2026');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin in DB:', error.message);
    process.exit(1);
  }
};

updateAdmin();
