const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db/connect');
const tasksRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const Task = require('./models/Task');
const jwt = require('jsonwebtoken');
const { isAdminAuth } = require('./middleware/auth'); // Import admin middleware
require('dotenv').config();

const app = express();

// Connect to MongoDB
connectDB();

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views')); // Set the views directory to the root/views folder

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Authentication middleware
const authenticateUser = (req, res, next) => {
  // Check for token in headers
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For this demo, allow access even without token
    // In a real app, you would return a 401 Unauthorized
    req.user = null;
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = { userId: decoded.id, email: decoded.email };
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Serve login and registration pages
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/forgot-password.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reset-password.html'));
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Admin Dashboard Route with enhanced error handling
app.get('/admin/dashboard', (req, res) => {
  try {
    console.log('Admin dashboard route accessed');
    res.render('admin-dashboard');
  } catch (error) {
    console.error('Error rendering admin dashboard:', error);
    res.status(500).send('Error loading admin dashboard: ' + error.message);
  }
});

// Create a fallback route for direct access (useful for debugging)
app.get('/admin-direct', (req, res) => {
  try {
    console.log('Direct admin dashboard access attempted');
    res.render('admin-dashboard');
  } catch (error) {
    console.error('Error rendering admin dashboard (direct):', error);
    res.status(500).send('Error loading admin dashboard (direct): ' + error.message);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', authenticateUser, tasksRoutes);

// Public Tasks API - Get all public tasks (no authentication required)
app.get('/api/public-tasks', async (req, res) => {
  try {
    // Find tasks with no user field (public tasks)
    const query = {
      user: { $exists: false }
    };
    
    // Title search for public tasks
    if (req.query.q) {
      // Cannot search encrypted fields directly, so we'll get all and filter
      const searchTerm = req.query.q.toLowerCase();
      const allPublicTasks = await Task.find(query).sort({ timestamp: -1 });
      
      // Filter the decrypted titles on the application side
      const filteredTasks = allPublicTasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm)
      );
      return res.json(filteredTasks);
    }
    
    const tasks = await Task.find(query).sort({ timestamp: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Error retrieving public tasks:', error);
    res.status(500).json({ error: 'Error retrieving public tasks' });
  }
});

// Public Tasks API - Add a public task (no authentication required)
app.post('/api/public-tasks', async (req, res) => {
  try {
    if (!req.body.title || typeof req.body.title !== 'string') {
      return res.status(400).json({ error: 'Task title is required and must be a string' });
    }
    const task = new Task({
      title: req.body.title,
      timestamp: req.body.timestamp || Date.now(),
      priority: req.body.priority || 'normal'
    });
    const savedTask = await task.save();
    return res.status(200).json({
      message: 'Public task added!',
      task: savedTask
    });
  } catch (error) {
    console.error('Public task creation error:', error);
    res.status(500).json({ error: 'Error saving public task' });
  }
});

// Admin Routes for Public Tasks
// GET - Admin can view all public tasks
app.get('/api/admin/public-tasks', isAdminAuth, async (req, res) => {
  try {
    // Find all public tasks (tasks with no user field)
    const publicTasks = await Task.find({ user: { $exists: false } }).sort({ timestamp: -1 });
    res.json(publicTasks);
  } catch (error) {
    console.error('Admin error retrieving public tasks:', error);
    res.status(500).json({ error: 'Error retrieving public tasks for admin' });
  }
});

// DELETE - Admin can delete public tasks in bulk
app.delete('/api/admin/public-tasks', isAdminAuth, async (req, res) => {
  try {
    console.log('Admin delete public tasks endpoint called');
    const { ids } = req.body;
    
    console.log('Task IDs received for deletion:', ids);
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      console.log('Invalid or empty task IDs array');
      return res.status(400).json({ error: 'No task IDs provided for deletion' });
    }
    
    // Validate MongoDB ObjectIDs
    const validIds = ids.filter(id => {
      try {
        // Check if it's a valid MongoDB ObjectId
        return id && id.match(/^[0-9a-fA-F]{24}$/);
      } catch (err) {
        console.log('Invalid ObjectId:', id);
        return false;
      }
    });
    
    console.log('Valid IDs for deletion:', validIds);
    
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid task IDs provided for deletion' });
    }
    
    // Delete the specified public tasks
    const result = await Task.deleteMany({ 
      _id: { $in: validIds },
      user: { $exists: false } // Only delete public tasks
    });
    
    console.log('Delete operation result:', result);
    
    res.json({ 
      message: `${result.deletedCount} public tasks deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Admin error deleting public tasks:', error);
    res.status(500).json({ error: 'Error deleting public tasks' });
  }
});

// Add Task Route
app.post('/add-task', authenticateUser, async (req, res) => {
  try {
    // Make sure task title is properly handled
    if (!req.body.task || typeof req.body.task !== 'string') {
      return res.status(400).json({ error: 'Task title is required and must be a string' });
    }

    // If user is authenticated, associate task with user
    if (req.user && req.user.userId) {
      const task = new Task({ 
        title: req.body.task, // This will be properly encrypted by the model
        timestamp: req.body.timestamp || Date.now(),
        user: req.user.userId,
        priority: req.body.priority || 'normal'
      });
      const savedTask = await task.save();
      return res.status(200).json({ 
        message: 'Task added!',
        task: savedTask
      });
    } else {
      // Guest: create a public task (no user field)
      const task = new Task({
        title: req.body.task,
        timestamp: req.body.timestamp || Date.now(),
        priority: req.body.priority || 'normal'
      });
      const savedTask = await task.save();
      return res.status(200).json({
        message: 'Public task added!',
        task: savedTask
      });
    }
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Error saving task' });
  }
});

// Catch-all for 404 Not Found
app.use((req, res, next) => {
  res.status(404).send("Sorry, can't find that page!");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Server Listening
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

