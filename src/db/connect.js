const mongoose = require('mongoose');
require('dotenv').config();

// Set strictQuery to true to suppress the deprecation warning
mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    // Use a local MongoDB connection or fallback to localhost if in Docker
    // This avoids DNS resolution problems with cloud MongoDB instances
    const localMongoURI = 'mongodb://localhost:27017/taskapp';
    const dockerMongoURI = 'mongodb://mongodb:27017/taskapp'; // If using Docker Compose with a service named 'mongodb'
    
    // Try to connect with the environment variable first, then fall back to direct connections
    const uri = process.env.MONGO_URI || dockerMongoURI || localMongoURI;
    
    console.log("Attempting to connect to MongoDB with URI:", 
      uri.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://****:****@')); // Log without exposing credentials
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("DB connection error:", error);
    console.log("Trying alternative MongoDB connection...");
    
    try {
      // Fall back to a direct localhost connection if other attempts fail
      await mongoose.connect('mongodb://localhost:27017/taskapp', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log("Connected to local MongoDB successfully");
    } catch (fallbackError) {
      console.error("All MongoDB connection attempts failed:", fallbackError);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
// this is database
