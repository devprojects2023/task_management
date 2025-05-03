const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption configuration - properly enforce 32-byte key
// Using a consistent key derivation to ensure exactly 32 bytes
function getEncryptionKey() {
  const baseKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-task-application';
  // Use SHA-256 to derive a consistent 32-byte key
  return crypto.createHash('sha256').update(baseKey).digest();
}

const ENCRYPTION_KEY = getEncryptionKey(); // Exactly 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16

// Function to encrypt text
function encrypt(text) {
  try {
    // Only encrypt if text is a string and not already encrypted
    if (typeof text !== 'string' || text.includes(':')) {
      return text;
    }
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    // Don't expose the error details in production
    return text; // Return original text on error
  }
}

// Function to decrypt text
function decrypt(text) {
  try {
    // Only decrypt if text is a string and appears to be encrypted
    if (typeof text !== 'string' || !text.includes(':')) {
      return text;
    }
    
    const textParts = text.split(':');
    if (textParts.length !== 2) return text;
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = textParts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return text; // Return original text on error
  }
}

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    set: encrypt,
    get: decrypt
  },
  timestamp: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false },
  priority: {
    type: String, 
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make user optional for guest tasks
  }
}, {
  toJSON: { getters: true }, // Apply getters when converting to JSON
  toObject: { getters: true } // Apply getters when converting to object
});

module.exports = mongoose.model('Task', taskSchema);

