import logger from '../config/logger.js';

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

// Create error utility function
export const createError = (statusCode, message) => {
  return new ApiError(statusCode, message);
};

// Global error response formatter
export const errorResponse = (res, statusCode = 500, message = 'Internal server error', errors = null) => {
  const response = {
    success: false,
    message: message,
    ...(errors && { errors: errors }),
  };
  return res.status(statusCode).json(response);
};

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  logger.error('Error details:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
    details: err,
  });

  if (err instanceof ApiError) {
    return errorResponse(res, err.statusCode, err.message);
  }

  if (err.name === 'MongoServerError') {
    logger.error('MongoDB Error:', {
      code: err.code,
      codeName: err.codeName,
      errInfo: err.errInfo,
      message: err.message,
    });
    return errorResponse(res, 500, 'Database error occurred');
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return errorResponse(res, 400, 'Validation Error', errors);
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, 400, `Duplicate value for ${field}`);
  }

  // Generic error response for unhandled errors
  return errorResponse(res, 500, 'Internal Server Error');
};

// Export all classes and functions as named exports
export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  // Remove the duplicate exports of errorResponse and errorHandler here
};