import Joi from 'joi';

export const profileSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim(),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^\+?[\d\s-]{8,20}$/),
  bio: Joi.string().max(1000).trim()
});

export const clientProfileSchema = Joi.object({
  companyName: Joi.string().min(2).max(100).trim(),
  industry: Joi.string().trim().required(),
  description: Joi.string().max(2000).trim(),
  website: Joi.string().uri()
});

export const freelancerProfileSchema = Joi.object({
  title: Joi.string().min(2).max(100).trim(),
  skills: Joi.array().items(Joi.string().trim().required()),
  hourlyRate: Joi.number().min(0),
  availability: Joi.string().valid('full-time', 'part-time', 'contract')
});

export const endorsementSchema = Joi.object({
  skill: Joi.string().trim().required()
});

export const testimonialSchema = Joi.object({
  content: Joi.string().min(10).max(1000).trim().required(),
  rating: Joi.number().integer().min(1).max(5).required()
});

export const querySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(50),
  role: Joi.string().valid('client', 'freelancer', 'admin'),
  sort: Joi.string().valid('createdAt', 'name', 'rating'),
  order: Joi.string().valid('asc', 'desc')
});

export const idParamSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId')
});

export default {
  profileSchema,
  clientProfileSchema,
  freelancerProfileSchema,
  endorsementSchema,
  testimonialSchema,
  querySchema,
  idParamSchema
};
