import express from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validation/validator.js';
import {
  setup2FASchema,
  verify2FASchema,
  disable2FASchema,
  recovery2FASchema
} from '../middleware/validation/schemas/twoFactorValidation.js';
import {
  setup2FA,
  verify2FA,
  disable2FA,
  useRecoveryCode
} from '../controllers/twoFactorController.js';

const router = express.Router();

// Public routes
router.post('/recovery', validate(recovery2FASchema), useRecoveryCode);

// Protected routes
router.use(protect); // Apply protection to all routes below

router.post('/setup', validate(setup2FASchema), setup2FA);
router.post('/verify', validate(verify2FASchema), verify2FA);
router.post('/disable', validate(disable2FASchema), disable2FA);

export default router;
