import express from 'express';
const router = express.Router();

import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validation/validator.js';
import {
  registerSchema,
  loginSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateEmailSchema,
  updateProfileSchema
} from '../middleware/validation/schemas/authValidation.js';

import {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  updateEmail,
  updateProfile
} from '../controllers/authController.js';


// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth route working' });
});

// Public routes
router.route('/register').post(validate(registerSchema), register);
router.route('/login').post(validate(loginSchema), login);
router.route('/forgot-password').post(validate(forgotPasswordSchema), forgotPassword);
router.route('/reset-password').post(validate(resetPasswordSchema), resetPassword);

// Protected routes
router.use(protect); // Apply authentication middleware to all routes below

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/update-password', validate(updatePasswordSchema), updatePassword);
router.put('/update-email', validate(updateEmailSchema), updateEmail);
router.put('/update-profile', validate(updateProfileSchema), updateProfile);

// Test route for checking auth
router.get('/check-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Authenticated',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      roles: req.user.roles
    }
  });
});

export default router;
