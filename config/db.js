const mongoose = require('mongoose');

let isConnected = false;

const DEFAULT_MONGO_URI =
  'mongodb+srv://sanjaysainisre2026_db_user:0nvyTs7IQoUPFvXq@cluster1.k7xrfm2.mongodb.net/new_sanjay_jewellers?retryWrites=true&w=majority&appName=Cluster1';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1 || isConnected) {
    return true;
  }
  try {
    const uri = process.env.MONGODB_URI || DEFAULT_MONGO_URI;
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[MongoDB Warning]: Could not connect to MongoDB (${error.message}). Running with in-memory / mock mode if needed.`);
    return false;
  }
};

module.exports = connectDB;
