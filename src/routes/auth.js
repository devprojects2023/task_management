const express = require('express');
const router = express.Router();
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const { isAdminAuth } = require('../middleware/auth'); // Import the admin auth middleware

// Path to the CSV file for users
const usersCsvPath = path.join(__dirname, '../../secure/users.csv');

// Ensure the secure directory exists
const secureDir = path.join(__dirname, '../../secure');
if (!fs.existsSync(secureDir)) {
  fs.mkdirSync(secureDir, { recursive: true });
}

// CSV Writer for user data
const csvUserWriter = csvWriter({
  path: usersCsvPath,
  header: [
    { id: 'email', title: 'EMAIL' },
    { id: 'phone', title: 'PHONE' },
    { id: 'createdAt', title: 'CREATED_AT' },
  ],
  append: true
});

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1d' }
  );
};

// Create Admin User if it doesn't exist
const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    
    if (!adminExists) {
      // Create admin user
      const adminUser = await User.create({
        email: 'admin@example.com',
        password: 'Admin@2023Pass',
        phone: '9999999999',
        isAdmin: true
      });
      
      console.log('Admin user created successfully');
      
      // Save admin data to CSV
      await csvUserWriter.writeRecords([{
        email: adminUser.email,
        phone: adminUser.phone,
        createdAt: adminUser.createdAt.toISOString()
      }]);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Call the admin creation function
createAdminUser();

// Register User
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    
    // Username validation
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores and hyphens' });
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
      });
    }

    // Create user
    const user = await User.create({ 
      username,
      email, 
      password, 
      phone,
      isAdmin: false
    });

    // Generate token
    const token = generateToken(user);
    res.status(201).json({ 
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists by email or username
    const user = await User.findOne({
      $or: [
        { email: email },
        { username: email } // The email field may contain username
      ]
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Request Password Reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Special handling for Admin
    if (email.toLowerCase() === 'admin@example.com') {
      return res.status(200).json({ 
        message: 'Admin account cannot be reset through this interface.',
        adminReset: true
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // In a real application, you would:
    // 1. Generate a reset token
    // 2. Store it in the database with an expiry
    // 3. Send an email with a link to reset password
    
    // For this demo, we'll create a simple reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Store token in user record (in a real app, you'd hash this and add expiry)
    user.resetToken = resetToken;
    await user.save();
    
    // In a real app, send email here
    
    res.status(200).json({ 
      message: 'Password reset instructions sent to your email',
      // For demo purposes, include token in response
      resetToken 
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).'
      });
    }
    
    // Find user with the reset token
    const user = await User.findOne({ resetToken });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Special handling for Admin - prevent password reset
    if (user.email.toLowerCase() === 'admin@example.com') {
      return res.status(403).json({ error: 'Admin password cannot be changed through this interface' });
    }
    
    // Update password and clear reset token
    user.password = newPassword;
    user.resetToken = undefined;
    await user.save();
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// --- Admin Routes ---

// GET all non-admin users (Admin only)
router.get('/admin/users', isAdminAuth, async (req, res) => {
  try {
    // Fetch all users that are not admins
    // Select only necessary fields, exclude password and resetToken
    const users = await User.find({ isAdmin: false }, 'email username phone createdAt');
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE a user by ID (Admin only)
router.delete('/admin/users/:userId', isAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting an admin user
    if (user.isAdmin) {
      return res.status(403).json({ error: 'Cannot delete an admin user' });
    }
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;