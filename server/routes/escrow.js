import express from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validation/validator.js';
import { escrowSchema, releaseSchema, disputeSchema } from '../middleware/validation/schemas/escrowValidation.js';
import {
  createEscrow,
  getEscrow,
  getEscrows,
  releaseEscrow,
  disputeEscrow
} from '../controllers/escrowController.js';

const router = express.Router();

// Protect all escrow routes
router.use(protect);

router.route('/')
  .post(validate(escrowSchema), createEscrow)
  .get(getEscrows);

router.route('/:id')
  .get(getEscrow);

router.route('/:id/release')
  .post(validate(releaseSchema), releaseEscrow);

router.route('/:id/dispute')
  .post(validate(disputeSchema), disputeEscrow);

export default router;
