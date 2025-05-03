const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please provide a valid email',
    ],
    unique: true,
  },
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [50, 'Username cannot be more than 50 characters'],
    trim: true,
    unique: true,
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  resetToken: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Special validation for Admin user
UserSchema.path('email').validate(function(value) {
  // If it's not Admin, apply the email regex validation
  if (value !== 'Admin') {
    return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(value);
  }
  
  // For Admin, skip the validation
  return true;
}, 'Please provide a valid email');

// Pre-save middleware to set username from email if not provided
UserSchema.pre('save', async function (next) {
  // If username is not provided, set it from email
  if (!this.username) {
    // For Admin user, use 'Admin' as username
    if (this.email === 'Admin') {
      this.username = 'Admin';
    } else {
      // For regular users, use part before @ in email
      this.username = this.email.split('@')[0];
    }
  }
  next();
});

// Hash the password before saving
UserSchema.pre('save', async function () {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);