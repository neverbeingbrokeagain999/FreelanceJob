import express from 'express';
import Joi from 'joi';
import { protect as auth, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation/validator.js';
import {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
  jobIdParamSchema
} from '../middleware/validation/schemas/jobValidation.js';
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  applyToJob as submitProposal,
  getApplicants,
  searchJobs,
  getRecommendedJobs,
  getJobStats,
  getFreelancerJobs,
  getClientJobs
} from '../controllers/jobController.js';

const router = express.Router();

// Client middleware
const clientOnly = authorize('client');

// Search and recommended routes (must be before parameterized routes)
router.get('/search', 
  auth,
  validate(jobQuerySchema, 'query'),
  searchJobs
);

router.get('/recommended',
  auth,
  validate(jobQuerySchema, 'query'),
  getRecommendedJobs
);

router.get('/stats',
  auth,
  validate(jobQuerySchema, 'query'),
  getJobStats
);

// Freelancer routes
router.get('/freelancer',
  auth,
  authorize('freelancer'),
  validate(jobQuerySchema, 'query'),
  getFreelancerJobs
);

// Client routes
router.get('/client',
  auth,
  clientOnly,
  validate(jobQuerySchema, 'query'),
  getClientJobs
);

// Common routes
router.get('/',
  auth,
  validate(jobQuerySchema, 'query'),
  getJobs
);

router.get('/:id',
  auth,
  validate(jobIdParamSchema, 'params'),
  getJob
);

// Client-only routes
router.post('/',
  [auth, clientOnly],
  validate(createJobSchema),
  createJob
);

router.put('/:id',
  [auth, clientOnly],
  validate(jobIdParamSchema, 'params'),
  validate(updateJobSchema),
  updateJob
);

router.delete('/:id',
  [auth, clientOnly],
  validate(jobIdParamSchema, 'params'),
  deleteJob
);

router.get('/:id/applicants',
  [auth, clientOnly],
  validate(jobIdParamSchema, 'params'),
  validate(jobQuerySchema, 'query'),
  getApplicants
);

// Freelancer-only routes
const proposalSchema = Joi.object({
  coverLetter: Joi.string().trim().min(50).max(1000).required(),
  proposedRate: Joi.number().min(0),
  estimatedTime: Joi.number().integer().min(1)
});

router.post('/:id/apply',
  [auth, authorize('freelancer')],
  validate(jobIdParamSchema, 'params'),
  validate(proposalSchema),
  submitProposal
);

export default router;
