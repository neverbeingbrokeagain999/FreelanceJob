import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { stripHtml } from 'string-strip-html';
import { logger } from '../config/logger.js';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sanitization for specific fields
      if (['password', 'passwordConfirm', 'token'].includes(key)) {
        sanitized[key] = value;
        continue;
      }
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    // Use DOMPurify for HTML content fields
    if (obj.includes('<') && obj.includes('>')) {
      const cleaned = DOMPurify.sanitize(obj, {
        ALLOWED_TAGS: [
          'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel']
      });
      return cleaned;
    }
    // Use string-strip-html for plain text
    return stripHtml(obj).result;
  }
  
  return obj;
};

const validateAndSanitize = (value) => {
  // Check for common injection patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /<script/i
  ];

  if (typeof value === 'string') {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value)) {
        logger.warn('Potential XSS attack detected:', {
          value,
          pattern: pattern.toString()
        });
        return '';
      }
    }
  }
  
  return value;
};

export const sanitization = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      const sanitizedBody = sanitizeObject(req.body);
      Object.keys(sanitizedBody).forEach(key => {
        sanitizedBody[key] = validateAndSanitize(sanitizedBody[key]);
      });
      req.body = sanitizedBody;
    }

    // Sanitize query parameters
    if (req.query) {
      const sanitizedQuery = sanitizeObject(req.query);
      Object.keys(sanitizedQuery).forEach(key => {
        sanitizedQuery[key] = validateAndSanitize(sanitizedQuery[key]);
      });
      req.query = sanitizedQuery;
    }

    // Sanitize URL parameters
    if (req.params) {
      const sanitizedParams = sanitizeObject(req.params);
      Object.keys(sanitizedParams).forEach(key => {
        sanitizedParams[key] = validateAndSanitize(sanitizedParams[key]);
      });
      req.params = sanitizedParams;
    }

    next();
  } catch (error) {
    logger.error('Sanitization error:', {
      message: error.message,
      stack: error.stack
    });
    next(error);
  }
};

// Export for testing
export const __test__ = {
  sanitizeObject,
  validateAndSanitize
};
