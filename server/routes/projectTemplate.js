import express from 'express';
import { protect } from '../middleware/auth.js';
import { validate, validatePagination, validateSort } from '../middleware/validation/validator.js';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from '../controllers/projectTemplateController.js';
import { projectTemplateSchema } from '../middleware/validation/schemas/projectTemplateValidation.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/')
  .get(
    validatePagination,
    validateSort(['name', 'category', 'createdAt']),
    getTemplates
  )
  .post(
    validate(projectTemplateSchema),
    createTemplate
  );

router.route('/:id')
  .get(getTemplate)
  .put(
    validate(projectTemplateSchema),
    updateTemplate
  )
  .delete(deleteTemplate);

export default router;
