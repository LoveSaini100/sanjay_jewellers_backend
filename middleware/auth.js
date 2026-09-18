const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const mockStore = require('../data/mockStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'new_sanjay_jewellers_super_secret_jwt_key_2024'
      );

      if (isDbConnected()) {
        req.user = await User.findById(decoded.id).select('-password');
      } else {
        const users = mockStore.getUsers();
        req.user = users.find((u) => u._id === decoded.id) || {
          _id: decoded.id,
          id: decoded.id,
          name: 'Showroom Director',
          email: 'admin@sanjayjewellers.com',
          role: 'admin',
        };
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found with this token' });
      }

      next();
    } catch (error) {
      console.error('Auth token error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed or expired' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
