import Joi from 'joi';

export const conversationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

export const messageQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  before: Joi.date().iso()
});

export const sendMessageSchema = Joi.object({
  receiver: Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId').required(),
  message: Joi.string().trim().min(1).max(2000).required()
});

export const readMessagesSchema = Joi.object({
  messageIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId'))
    .min(1)
    .required()
});

export const messageIdParamSchema = Joi.object({
  messageId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId').required()
});

export const userIdParamSchema = Joi.object({
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId').required()
});

export default {
  conversationQuerySchema,
  messageQuerySchema,
  sendMessageSchema,
  readMessagesSchema,
  messageIdParamSchema,
  userIdParamSchema
};
