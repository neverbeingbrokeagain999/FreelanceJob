import Joi from 'joi';

export const escrowSchema = Joi.object({
  jobId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid job ID format',
      'any.required': 'Job ID is required'
    }),

  amount: Joi.number()
    .required()
    .min(1)
    .max(1000000)
    .messages({
      'number.base': 'Amount must be a number',
      'number.min': 'Amount must be at least 1',
      'number.max': 'Amount cannot exceed 1,000,000',
      'any.required': 'Amount is required'
    }),

  currency: Joi.string()
    .required()
    .valid('USD', 'EUR', 'GBP')
    .messages({
      'any.only': 'Invalid currency',
      'any.required': 'Currency is required'
    }),

  description: Joi.string()
    .required()
    .min(10)
    .max(500)
    .trim()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 500 characters'
    }),

  milestoneNumber: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Milestone number must be a number',
      'number.integer': 'Milestone number must be an integer',
      'number.min': 'Milestone number must be at least 1',
      'any.required': 'Milestone number is required'
    }),

  dueDate: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.base': 'Due date must be a valid date',
      'date.min': 'Due date must be in the future',
      'any.required': 'Due date is required'
    })
});

export const releaseSchema = Joi.object({
  reason: Joi.string()
    .required()
    .min(10)
    .max(500)
    .trim()
    .messages({
      'string.empty': 'Release reason is required',
      'string.min': 'Release reason must be at least 10 characters long',
      'string.max': 'Release reason cannot exceed 500 characters'
    }),

  rating: Joi.number()
    .min(1)
    .max(5)
    .integer()
    .messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
      'number.integer': 'Rating must be an integer'
    })
});

export const disputeSchema = Joi.object({
  reason: Joi.string()
    .required()
    .min(20)
    .max(1000)
    .trim()
    .messages({
      'string.empty': 'Dispute reason is required',
      'string.min': 'Dispute reason must be at least 20 characters long',
      'string.max': 'Dispute reason cannot exceed 1000 characters'
    }),

  evidence: Joi.array()
    .items(
      Joi.object({
        type: Joi.string()
          .valid('document', 'image', 'message')
          .required(),
        url: Joi.string()
          .uri()
          .required(),
        description: Joi.string()
          .min(10)
          .max(200)
          .required()
      })
    )
    .min(1)
    .max(5)
    .messages({
      'array.min': 'At least one piece of evidence is required',
      'array.max': 'Cannot provide more than 5 pieces of evidence'
    }),

  desiredResolution: Joi.string()
    .required()
    .min(20)
    .max(500)
    .trim()
    .messages({
      'string.empty': 'Desired resolution is required',
      'string.min': 'Desired resolution must be at least 20 characters long',
      'string.max': 'Desired resolution cannot exceed 500 characters'
    })
});

export default {
  escrowSchema,
  releaseSchema,
  disputeSchema
};
