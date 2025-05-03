/**
 * Utility functions for sanitizing user input
 */

/**
 * Sanitizes a string to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  // Basic HTML entity encoding
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  sanitizeString
}; 