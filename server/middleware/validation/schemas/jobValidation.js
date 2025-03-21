import Joi from 'joi';

export const createJobSchema = Joi.object({
  title: Joi.string().required().min(10).max(100).trim(),
  description: Joi.string().required().min(50).max(5000).trim(),
  category: Joi.string().required(),
  skills: Joi.array().items(Joi.string().trim()).min(1).max(10),
  budget: Joi.object({
    type: Joi.string().valid('fixed', 'hourly').required(),
    amount: Joi.number().min(1).required(),
    currency: Joi.string().default('USD'),
    maxAmount: Joi.number().when('type', {
      is: 'hourly',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),
  duration: Joi.string().valid('short', 'medium', 'long').required(),
  experienceLevel: Joi.string().valid('entry', 'intermediate', 'expert').required(),
  visibility: Joi.string().valid('public', 'private', 'invite-only').default('public'),
  location: Joi.object({
    type: Joi.string().valid('remote', 'onsite', 'hybrid').required(),
    country: Joi.string().when('type', {
      is: Joi.valid('onsite', 'hybrid'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    city: Joi.string().when('type', {
      is: Joi.valid('onsite', 'hybrid'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),
  deadline: Joi.date().min('now').optional(),
  attachments: Joi.array().items(Joi.string()).max(5)
});

export const updateJobSchema = createJobSchema.fork(
  ['title', 'description', 'category', 'skills', 'budget', 'duration', 'experienceLevel', 'location'],
  (field) => field.optional()
);

export const jobQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  category: Joi.string(),
  skills: Joi.array().items(Joi.string()),
  budgetType: Joi.string().valid('fixed', 'hourly'),
  minBudget: Joi.number().min(0),
  maxBudget: Joi.number().min(0),
  duration: Joi.string().valid('short', 'medium', 'long'),
  experienceLevel: Joi.string().valid('entry', 'intermediate', 'expert'),
  location: Joi.string().valid('remote', 'onsite', 'hybrid'),
  status: Joi.string().valid('open', 'in-progress', 'completed', 'cancelled'),
  sort: Joi.string().valid('createdAt', 'budget', 'deadline'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

export const jobIdParamSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId')
});

export default {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
  jobIdParamSchema
};
