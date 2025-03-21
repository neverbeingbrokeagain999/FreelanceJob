import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireAdmin, requireAll } from '../middleware/roles.js';
import { auditAdminAction, auditCriticalAction, auditBatchAction } from '../middleware/auditMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';
import * as adminController from '../controllers/adminController.js';
import { validate } from '../middleware/validation/validator.js';
import { adminValidationSchemas } from '../middleware/validation/schemas/adminValidation.js';
import logger from '../config/logger.js';

const router = express.Router();

// Protect all admin routes with authentication and admin role check
router.use(protect);
router.use(requireAdmin);

// Add rate limiting for admin endpoints
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many admin requests from this IP, please try again later'
});

router.use(adminRateLimit);

// Log all admin route access
router.use((req, res, next) => {
  logger.info('Admin route accessed:', {
    userId: req.user.id,
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
  next();
});

// Dashboard analytics
router.get('/dashboard/analytics',
  auditAdminAction('DASHBOARD_ACCESS', 'SYSTEM'),
  adminController.getDashboardAnalytics
);

// User management
router.get('/users',
  validate(adminValidationSchemas.listUsers),
  auditAdminAction('USER_LIST_VIEW', 'USER'),
  adminController.listUsers
);

router.patch('/users/:userId/status',
  validate(adminValidationSchemas.updateUserStatus),
  auditAdminAction('USER_STATUS_CHANGE', 'USER'),
  adminController.updateUserStatus
);

router.patch('/users/:userId/roles',
  validate(adminValidationSchemas.updateUserRoles),
  auditCriticalAction('USER_ROLE_CHANGE', 'USER'),
  adminController.updateUserRoles
);

export default router;
