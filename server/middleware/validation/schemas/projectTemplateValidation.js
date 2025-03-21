import Joi from 'joi';

export const projectTemplateSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(3)
    .max(100)
    .trim()
    .messages({
      'string.empty': 'Template name is required',
      'string.min': 'Template name must be at least 3 characters long',
      'string.max': 'Template name cannot exceed 100 characters'
    }),

  description: Joi.string()
    .required()
    .min(10)
    .max(2000)
    .trim()
    .messages({
      'string.empty': 'Template description is required',
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 2000 characters'
    }),

  category: Joi.string()
    .required()
    .valid('web', 'mobile', 'desktop', 'api', 'database', 'devops', 'other')
    .messages({
      'any.only': 'Invalid category',
      'string.empty': 'Category is required'
    }),

  tasks: Joi.array()
    .items(
      Joi.object({
        title: Joi.string()
          .required()
          .min(3)
          .max(200)
          .trim()
          .messages({
            'string.empty': 'Task title is required',
            'string.min': 'Task title must be at least 3 characters long',
            'string.max': 'Task title cannot exceed 200 characters'
          }),
        description: Joi.string()
          .required()
          .min(10)
          .max(1000)
          .trim()
          .messages({
            'string.empty': 'Task description is required',
            'string.min': 'Task description must be at least 10 characters long',
            'string.max': 'Task description cannot exceed 1000 characters'
          }),
        estimatedHours: Joi.number()
          .min(0.5)
          .max(1000)
          .required()
          .messages({
            'number.base': 'Estimated hours must be a number',
            'number.min': 'Estimated hours must be at least 0.5',
            'number.max': 'Estimated hours cannot exceed 1000'
          }),
        priority: Joi.string()
          .valid('low', 'medium', 'high')
          .default('medium')
          .messages({
            'any.only': 'Invalid priority level'
          })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one task is required',
      'array.base': 'Tasks must be an array'
    }),

  tags: Joi.array()
    .items(
      Joi.string()
        .min(2)
        .max(20)
        .trim()
    )
    .max(10)
    .unique()
    .messages({
      'array.max': 'Cannot have more than 10 tags',
      'array.unique': 'Tags must be unique'
    }),

  estimatedDuration: Joi.object({
    min: Joi.number()
      .required()
      .min(1)
      .max(Joi.ref('max'))
      .messages({
        'number.base': 'Minimum duration must be a number',
        'number.min': 'Minimum duration must be at least 1 day',
        'number.max': 'Minimum duration cannot be greater than maximum duration'
      }),
    max: Joi.number()
      .required()
      .min(Joi.ref('min'))
      .max(365)
      .messages({
        'number.base': 'Maximum duration must be a number',
        'number.min': 'Maximum duration cannot be less than minimum duration',
        'number.max': 'Maximum duration cannot exceed 365 days'
      })
  }).required(),

  isActive: Joi.boolean().default(true),

  visibility: Joi.string()
    .valid('public', 'private')
    .default('public')
    .messages({
      'any.only': 'Invalid visibility option'
    })
});

export const templateQuerySchema = Joi.object({
  search: Joi.string()
    .trim()
    .max(100)
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),
  category: Joi.string()
    .valid('web', 'mobile', 'desktop', 'api', 'database', 'devops', 'other'),
  tags: Joi.array()
    .items(Joi.string().trim())
    .single()
    .messages({
      'array.base': 'Tags must be provided as a comma-separated list'
    }),
  visibility: Joi.string()
    .valid('public', 'private', 'all'),
  isActive: Joi.boolean(),
  sortBy: Joi.string()
    .valid('name', 'category', 'createdAt', 'updatedAt'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
});

export default {
  projectTemplateSchema,
  templateQuerySchema
};
