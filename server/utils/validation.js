import mongoose from 'mongoose';

/**
 * Validate MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Sanitize string input
 * @param {string} str - The string to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Validate URL format
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate image file type
 * @param {string} mimeType - The MIME type to validate
 * @returns {boolean} - True if valid image type, false otherwise
 */
export const validateImageType = (mimeType) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(mimeType);
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} - True if valid size, false otherwise
 */
export const validateFileSize = (size, maxSize) => {
  return size <= maxSize;
};

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {object} - Validation result and message
 */
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isValid = password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar;

  return {
    isValid,
    message: isValid ? 'Password is valid' : 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters'
  };
};

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} - True if valid range, false otherwise
 */
export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};

/**
 * Validate phone number format
 * @param {string} phone - The phone number to validate 
 * @returns {boolean} - True if valid format, false otherwise
 */
export const validatePhone = (phone) => {
  const re = /^\+?[\d\s-]{8,}$/;
  return re.test(phone);
};

export default {
  validateObjectId,
  sanitizeString,
  validateEmail,
  validateURL,
  validateImageType,
  validateFileSize,
  validatePassword,
  validateDateRange,
  validatePhone
};
