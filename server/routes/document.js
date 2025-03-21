import express from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validation/validator.js';
import {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  updateMetadata,
  addCollaborator,
  removeCollaborator,
  addComment,
  resolveComment,
  addVersion,
  generateShareLink,
  revokeShareLink,
  archiveDocument
} from '../controllers/documentController.js';
import {
  createDocumentSchema,
  updateDocumentSchema
} from '../middleware/validation/schemas/documentValidation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Document CRUD routes
router.route('/')
  .post(validate(createDocumentSchema), createDocument)
  .get(getDocuments);

router.route('/:id')
  .get(getDocument)
  .put(validate(updateDocumentSchema), updateDocument);

// Collaborator management routes
router.route('/:id/collaborators')
  .post(addCollaborator)
  .get(getDocument);

router.route('/:id/collaborators/:userId')
  .delete(removeCollaborator);

// Comment routes
router.route('/:id/comments')
  .post(addComment);

router.route('/:id/comments/:commentId/resolve')
  .post(resolveComment);

// Version management routes
router.route('/:id/versions')
  .post(addVersion);

// Share link routes
router.route('/:id/share')
  .post(generateShareLink)
  .delete(revokeShareLink);

// Archive route
router.route('/:id/archive')
  .post(archiveDocument);

export default router;