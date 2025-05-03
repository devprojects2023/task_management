const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Regular authentication middleware
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

// Middleware to verify JWT token and check if user is admin
const isAdminAuth = async (req, res, next) => {
  console.log('isAdminAuth middleware called');
  const authHeader = req.header('Authorization');
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;

  console.log('Token received:', token ? 'Token present' : 'No token');

  if (!token) {
    console.log('No token provided - authentication failed');
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Token verified, decoded user ID:', decoded.id);
    
    // Find user by ID from token and check if isAdmin is true
    const user = await User.findOne({ _id: decoded.id, isAdmin: true });

    if (!user) {
      console.log('User not found or not admin:', decoded.id);
      // If user not found or not an admin
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    console.log('Admin authorization successful for user:', user.email);
    // Attach user to the request object (optional, but can be useful)
    req.user = user; 
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Admin Auth Error:", error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

module.exports = { auth, isAdminAuth }; 