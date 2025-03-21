import { errorResponse } from '../utils/errorHandler.js';

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests allowed
 * @param {string} options.message - Error message when limit is exceeded
 */
export const rateLimit = (options) => {
  const { windowMs, max, message = 'Too many requests. Please try again later.' } = options;
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const userRequests = requests.get(userId) || [];

    // Remove requests outside the time window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < windowMs
    );

    if (validRequests.length >= max) {
      return errorResponse(res, 429, message);
    }

    validRequests.push(now);
    requests.set(userId, validRequests);

    next();
  };
};

export default { rateLimit };
