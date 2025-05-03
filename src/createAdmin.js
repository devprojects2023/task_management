const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/task-manager', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected successfully...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const createAdmin = async () => {
  try {
    // Connect to the database
    await connectDB();
    
    // Check if admin user exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      
      // Update password for existing admin
      existingAdmin.password = 'Admin123!';
      await existingAdmin.save();
      console.log('Admin password updated');
    } else {
      // Create admin user with simpler password
      const adminUser = new User({
        email: 'admin@example.com',
        username: 'admin',
        password: 'Admin123!', // Simpler password
        phone: '9999999999',
        isAdmin: true
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    }
    
    // Also create a regular test user
    const existingUser = await User.findOne({ email: 'user@example.com' });
    
    if (!existingUser) {
      const testUser = new User({
        email: 'user@example.com',
        username: 'user',
        password: 'User123!',
        phone: '8888888888',
        isAdmin: false
      });
      
      await testUser.save();
      console.log('Test user created successfully');
    }
    
    // Exit the script
    console.log('All operations completed');
    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
};

// Run the function
createAdmin(); 