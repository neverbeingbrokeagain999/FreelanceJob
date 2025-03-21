import express from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validation/validator.js';
import {
  createWhiteboard,
  getWhiteboards,
  getWhiteboard,
  updateWhiteboard,
  deleteWhiteboard,
  addElement,
  updateElement,
  deleteElement,
  clearElements,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
  getHistory,
  getCollaborators,
  exportWhiteboard
} from '../controllers/whiteboardController.js';
import {
  createWhiteboardSchema,
  updateWhiteboardSchema,
  elementSchema,
  collaboratorSchema,
  querySchema
} from '../middleware/validation/schemas/whiteboardValidation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Whiteboard CRUD routes
router.route('/')
  .post(validate(createWhiteboardSchema), createWhiteboard)
  .get(validate(querySchema, 'query'), getWhiteboards);

router.route('/:id')
  .get(getWhiteboard)
  .put(validate(updateWhiteboardSchema), updateWhiteboard)
  .delete(deleteWhiteboard);

// Element management routes
router.route('/:id/elements')
  .post(validate(elementSchema), addElement);

router.route('/:id/elements/:elementId')
  .put(validate(elementSchema), updateElement)
  .delete(deleteElement);

router.route('/:id/clear')
  .post(clearElements);

// Collaborator management routes
router.route('/:id/collaborators')
  .post(validate(collaboratorSchema), addCollaborator)
  .get(getCollaborators);

router.route('/:id/collaborators/:userId')
  .delete(removeCollaborator)
  .put(validate(collaboratorSchema), updateCollaboratorRole);

// History route
router.route('/:id/history')
  .get(getHistory);

// Export route
router.route('/:id/export')
  .get(exportWhiteboard);

export default router;
