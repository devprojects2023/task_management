const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');
const { sanitizeString } = require('../utils/sanitize');

// Search tasks for the logged in user (works with encrypted titles)
router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    let tasks = await Task.find({ user: req.user.id });
    if (q) {
      const searchTerm = q.toLowerCase();
      // Decrypt and filter in JS
      tasks = tasks.filter(task => {
        const title = (task.title || '').toLowerCase();
        return title.includes(searchTerm);
      });
    }
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get public tasks (no auth required)
router.get('/public', async (req, res) => {
  try {
    // Return a limited set of public tasks (no user assigned)
    const tasks = await Task.find({ user: null }).limit(10);
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Create a new task
router.post('/', auth, async (req, res) => {
  try {
    let { title } = req.body;
    
    // Sanitize user input
    title = sanitizeString(title);
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ msg: 'Title is required' });
    }

    const newTask = new Task({
      title,
      user: req.user.id,
      completed: false
    });

    const task = await newTask.save();
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Create a public task (no auth)
router.post('/public', async (req, res) => {
  try {
    let { title } = req.body;
    
    // Sanitize user input
    title = sanitizeString(title);
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ msg: 'Title is required' });
    }

    const newTask = new Task({
      title,
      completed: false
      // No user assigned makes it public
    });

    const task = await newTask.save();
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update a task
router.put('/:id', auth, async (req, res) => {
  try {
    let { title, completed, priority } = req.body;
    
    // Sanitize user input if present
    if (title) {
      title = sanitizeString(title);
    }

    // Check if task exists
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    // Check if user owns this task
    if (task.user && task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Build task object with updates
    const taskFields = {};
    if (title) taskFields.title = title;
    if (completed !== undefined) taskFields.completed = completed;
    if (priority) taskFields.priority = priority;

    // Update the task
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: taskFields },
      { new: true }
    );

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Toggle task completion status
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    // Check if task exists
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    // Check if user owns this task
    if (task.user && task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Toggle the completed status
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: { completed: !task.completed } },
      { new: true }
    );

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete a task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ msg: 'Task not found' });

    // Check if user owns this task
    if (task.user && task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await Task.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Task removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Bulk delete tasks
router.delete('/', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No task IDs provided for deletion' });
    }
    
    // Validate MongoDB ObjectIDs
    const validIds = ids.filter(id => id && id.match(/^[0-9a-fA-F]{24}$/));
    
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid task IDs provided for deletion' });
    }
    
    // Delete the specified tasks owned by the user
    const result = await Task.deleteMany({ 
      _id: { $in: validIds },
      user: req.user.id // Only delete tasks owned by the user
    });
    
    res.json({ 
      message: `${result.deletedCount} tasks deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error deleting tasks:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;

