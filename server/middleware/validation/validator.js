import { errorResponse } from '../../utils/errorHandler.js';
import Joi from 'joi';
import logger from '../../config/logger.js';

/**
 * Base validation wrapper for request validation
 * @param {Object} schema - Joi validation schema
 * @param {String} type - Type of validation ('body', 'query', 'params')
 */
export const validate = (schema, type = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = type === 'body' ? req.body : 
                            type === 'query' ? req.query : 
                            type === 'params' ? req.params : req.body;

      logger.debug('Validating request:', {
        type,
        data: dataToValidate
      });

      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
      });

      if (error) {
        logger.debug('Validation failed:', {
          errors: error.details.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });

        return errorResponse(res, 400, 'Validation error', 
          error.details.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        );
      }

      // Replace request data with validated data
      if (type === 'body') req.body = value;
      else if (type === 'query') req.query = value;
      else if (type === 'params') req.params = value;

      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      return errorResponse(res, 500, 'Validation middleware error');
    }
  };
};

// Pagination validation
export const validatePagination = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  });

  const { error, value } = schema.validate(req.query);

  if (error) {
    return errorResponse(res, 400, 'Invalid pagination parameters');
  }

  req.pagination = {
    page: value.page,
    limit: value.limit,
    skip: (value.page - 1) * value.limit
  };

  next();
};

// Sort validation
export const validateSort = (allowedFields) => {
  return (req, res, next) => {
    const schema = Joi.object({
      sortBy: Joi.string().valid(...allowedFields).default('createdAt'),
      order: Joi.string().valid('asc', 'desc').default('desc')
    });

    const { error, value } = schema.validate(req.query);

    if (error) {
      return errorResponse(res, 400, 'Invalid sort parameters');
    }

    req.sort = {
      [value.sortBy]: value.order === 'asc' ? 1 : -1
    };

    next();
  };
};

// Search validation
export const validateSearch = (fields) => {
  return (req, res, next) => {
    const schema = Joi.object({
      search: Joi.string().trim().allow('').max(100)
    });

    const { error, value } = schema.validate(req.query);

    if (error) {
      return errorResponse(res, 400, 'Invalid search parameter');
    }

    if (value.search) {
      const searchRegex = new RegExp(value.search, 'i');
      req.searchQuery = {
        $or: fields.map(field => ({ [field]: searchRegex }))
      };
    } else {
      req.searchQuery = {};
    }

    next();
  };
};

// Date range validation
export const validateDateRange = (req, res, next) => {
  const schema = Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  });

  const { error, value } = schema.validate(req.query);

  if (error) {
    return errorResponse(res, 400, 'Invalid date range parameters');
  }

  if (value.startDate || value.endDate) {
    req.dateQuery = {};
    if (value.startDate) req.dateQuery.$gte = value.startDate;
    if (value.endDate) req.dateQuery.$lte = value.endDate;
  }

  next();
};

// Filter validation
export const validateFilters = (allowedFilters) => {
  return (req, res, next) => {
    const schema = Joi.object(
      Object.fromEntries(
        allowedFilters.map(filter => [
          filter,
          Joi.alternatives().try(
            Joi.string(),
            Joi.number(),
            Joi.boolean(),
            Joi.array().items(Joi.string(), Joi.number(), Joi.boolean())
          )
        ])
      )
    ).unknown(false);

    const { error, value } = schema.validate(req.query);

    if (error) {
      return errorResponse(res, 400, 'Invalid filter parameters');
    }

    req.filters = Object.entries(value).reduce((acc, [key, val]) => {
      if (Array.isArray(val)) {
        acc[key] = { $in: val };
      } else if (val !== undefined && val !== '') {
        acc[key] = val;
      }
      return acc;
    }, {});

    next();
  };
};

export default {
  validate,
  validatePagination,
  validateSort,
  validateSearch,
  validateDateRange,
  validateFilters
};
