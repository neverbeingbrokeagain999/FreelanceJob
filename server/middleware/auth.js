import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/errorHandler.js';
import { logger } from '../config/logger.js';

// Authentication middleware for HTTP requests
export const auth = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 401, 'Not authorized to access this route');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return errorResponse(res, 401, 'User not found');
      }

      if (!user.isActive) {
        return errorResponse(res, 401, 'Your account has been deactivated');
      }

      req.user = user;
      next();
    } catch (error) {
      return errorResponse(res, 401, 'Not authorized to access this route');
    }
  } catch (error) {
    return errorResponse(res, 500, 'Authentication error');
  }
};

/**
 * Socket.IO authentication middleware
 */
export const authenticateSocket = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication error: Account is deactivated'));
    }

    // Add user data to socket
    socket.user = user;
    socket.userId = user._id;
    
    logger.debug('Socket authenticated:', {
      userId: user._id,
      socketId: socket.id
    });

    next();
  } catch (error) {
    logger.error('Socket authentication error:', {
      error: error.message,
      socketId: socket.id
    });
    next(new Error('Authentication error: Invalid token'));
  }
};


/**
 * Protect middleware - Main authentication check
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in authorization header or cookies
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return errorResponse(res, 401, 'Not authorized - No token provided');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (exclude password)
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return errorResponse(res, 401, 'User not found');
      }

      if (!user.isActive) {
        return errorResponse(res, 401, 'Account is deactivated');
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      logger.error('Token verification failed:', {
        error: error.message,
        token: token.substring(0, 10) + '...'
      });
      return errorResponse(res, 401, 'Not authorized - Invalid token');
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return errorResponse(res, 500, 'Server error during authentication');
  }
};

/**
 * Check if user has required role
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'Not authorized - Insufficient permissions');
    }
    next();
  };
};

/**
 * Verify email confirmation middleware
 */
export const requireEmailVerified = (req, res, next) => {
  if (!req.user.emailVerified && process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
    return errorResponse(res, 403, 'Email verification required');
  }
  next();
};

/**
 * Check 2FA if enabled
 */
export const require2FA = async (req, res, next) => {
  try {
    if (process.env.ENABLE_2FA !== 'true') {
      return next();
    }

    const user = await User.findById(req.user._id).select('+twoFactorEnabled +twoFactorVerified');

    if (!user.twoFactorEnabled) {
      return next();
    }

    if (!user.twoFactorVerified) {
      return errorResponse(res, 403, '2FA verification required');
    }

    next();
  } catch (error) {
    logger.error('2FA check error:', error);
    return errorResponse(res, 500, 'Server error during 2FA check');
  }
};

/**
 * Optional authentication middleware
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      logger.debug('Optional auth token invalid:', error.message);
    }

    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    next();
  }
};

// Alias authenticate to protect for backward compatibility
export const authenticate = protect;

export default {
  protect,
  authenticate,
  authorize,
  requireEmailVerified,
  require2FA,
  optionalAuth,
  authenticateSocket
};
