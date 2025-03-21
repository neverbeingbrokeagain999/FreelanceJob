import express from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validation/validator.js';
import { upload } from '../middleware/upload.js';
import {
  conversationQuerySchema,
  messageQuerySchema,
  sendMessageSchema,
  readMessagesSchema,
  messageIdParamSchema,
  userIdParamSchema
} from '../middleware/validation/schemas/directMessageValidation.js';
import { 
  sendDirectMessage, 
  getDirectMessages, 
  markDirectMessageAsRead,
  getConversations,
  deleteMessage 
} from '../controllers/directMessageController.js';

const router = express.Router();

// Get user conversations
router.get('/conversations', 
  auth,
  validate(conversationQuerySchema, 'query'),
  getConversations
);

// Get messages with a specific user
router.get('/:userId',
  auth,
  validate(userIdParamSchema, 'params'),
  validate(messageQuerySchema, 'query'),
  getDirectMessages
);

// Send a message
router.post('/',
  auth,
  upload.array('files', 5), // Limit to 5 files
  validate(sendMessageSchema),
  sendDirectMessage
);

// Mark messages as read
router.put('/read',
  auth,
  validate(readMessagesSchema),
  markDirectMessageAsRead
);

// Delete a message
router.delete('/:messageId',
  auth,
  validate(messageIdParamSchema, 'params'),
  deleteMessage
);

export default router;
