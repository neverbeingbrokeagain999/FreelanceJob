import express from 'express';
import { upload } from '../middleware/upload.js';
import { protect as auth } from '../middleware/auth.js';
import { validate } from '../middleware/validation/validator.js';
import * as userController from '../controllers/userController.js';
import * as clientController from '../controllers/clientController.js';
import * as freelancerController from '../controllers/freelancerController.js';
import {
  profileSchema,
  clientProfileSchema,
  freelancerProfileSchema,
  endorsementSchema,
  testimonialSchema,
  querySchema,
  idParamSchema
} from '../middleware/validation/schemas/userValidation.js';

const router = express.Router();

// Basic user routes
router.get('/profile', auth, userController.getProfile);

router.put('/profile',
  auth,
  validate(profileSchema),
  userController.updateProfile
);

router.get('/:id',
  auth,
  validate(idParamSchema, 'params'),
  userController.getUserById
);

router.get('/',
  auth,
  validate(querySchema, 'query'),
  userController.getAllUsers
);

router.delete('/:id',
  auth,
  validate(idParamSchema, 'params'),
  userController.deleteUser
);

// Client routes
router.get('/client/profile/:id?',
  auth,
  validate(idParamSchema, 'params'),
  clientController.getClientProfile
);

router.put('/client/profile',
  auth,
  upload.single('profilePicture'),
  validate(clientProfileSchema),
  clientController.updateClientProfile
);

router.get('/client/:id/history',
  auth,
  validate(idParamSchema, 'params'),
  validate(querySchema, 'query'),
  clientController.getClientHiringHistory
);

router.get('/client/:id/stats',
  auth,
  validate(idParamSchema, 'params'),
  clientController.getClientStats
);

// Freelancer routes
router.get('/freelancer/:id?',
  auth,
  validate(idParamSchema, 'params'),
  freelancerController.getFreelancerProfile
);

router.put('/freelancer/profile',
  auth,
  upload.single('profilePicture'),
  validate(freelancerProfileSchema),
  freelancerController.updateFreelancerProfile
);

router.post('/freelancer/:id/endorsements',
  auth,
  validate(idParamSchema, 'params'),
  validate(endorsementSchema),
  freelancerController.addSkillEndorsement
);

router.get('/freelancer/:id/endorsements',
  auth,
  validate(idParamSchema, 'params'),
  freelancerController.getSkillEndorsements
);

router.post('/freelancer/:id/testimonials',
  auth,
  validate(idParamSchema, 'params'),
  validate(testimonialSchema),
  freelancerController.addTestimonial
);

router.get('/freelancer/:id/testimonials',
  auth,
  validate(idParamSchema, 'params'),
  validate(querySchema, 'query'),
  freelancerController.getTestimonials
);

export default router;
