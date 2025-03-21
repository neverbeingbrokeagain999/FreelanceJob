import { Escrow } from '../models/Escrow.js';
import { Job } from '../models/Job.js';
import { Transaction } from '../models/Transaction.js';
import { errorResponse } from '../utils/errorHandler.js';
import { logger } from '../config/logger.js';
import { calculateFees } from '../utils/feeCalculator.js';

// @desc    Create new escrow
// @route   POST /api/escrow
// @access  Private
export const createEscrow = async (req, res) => {
  try {
    const { jobId, amount, currency, description, milestoneNumber, dueDate } = req.body;

    // Verify job exists and user has permission
    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Only client can create escrow
    if (job.client.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized - only the client can create escrow');
    }

    // Calculate fees
    const { platformFee, processingFee, totalAmount } = calculateFees(amount);

    const escrow = await Escrow.create({
      job: jobId,
      client: req.user._id,
      freelancer: job.freelancer,
      amount,
      currency,
      description,
      milestoneNumber,
      dueDate,
      platformFee,
      processingFee,
      totalAmount
    });

    // Create pending transaction
    await Transaction.create({
      escrow: escrow._id,
      amount: totalAmount,
      type: 'escrow_creation',
      status: 'pending',
      currency,
      payer: req.user._id,
      payee: job.freelancer
    });

    res.status(201).json({
      success: true,
      data: escrow
    });
  } catch (error) {
    logger.error('Error creating escrow:', error);
    return errorResponse(res, 500, 'Error creating escrow');
  }
};

// @desc    Get all escrows for user
// @route   GET /api/escrow
// @access  Private
export const getEscrows = async (req, res) => {
  try {
    const query = {
      $or: [
        { client: req.user._id },
        { freelancer: req.user._id }
      ]
    };

    const escrows = await Escrow.find(query)
      .populate('job', 'title')
      .populate('client freelancer', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: escrows
    });
  } catch (error) {
    logger.error('Error fetching escrows:', error);
    return errorResponse(res, 500, 'Error fetching escrows');
  }
};

// @desc    Get single escrow
// @route   GET /api/escrow/:id
// @access  Private
export const getEscrow = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id)
      .populate('job', 'title description')
      .populate('client freelancer', 'name email')
      .populate('transactions');

    if (!escrow) {
      return errorResponse(res, 404, 'Escrow not found');
    }

    // Check if user is involved in escrow
    if (escrow.client.toString() !== req.user._id.toString() &&
        escrow.freelancer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to view this escrow');
    }

    res.json({
      success: true,
      data: escrow
    });
  } catch (error) {
    logger.error('Error fetching escrow:', error);
    return errorResponse(res, 500, 'Error fetching escrow');
  }
};

// @desc    Release escrow funds
// @route   POST /api/escrow/:id/release
// @access  Private
export const releaseEscrow = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return errorResponse(res, 404, 'Escrow not found');
    }

    // Only client can release funds
    if (escrow.client.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized - only the client can release funds');
    }

    if (escrow.status !== 'funded') {
      return errorResponse(res, 400, 'Escrow must be funded to release');
    }

    // Update escrow status
    escrow.status = 'released';
    escrow.releaseDate = Date.now();
    escrow.releaseReason = req.body.reason;
    await escrow.save();

    // Create release transaction
    await Transaction.create({
      escrow: escrow._id,
      amount: escrow.amount,
      type: 'escrow_release',
      status: 'completed',
      currency: escrow.currency,
      payer: escrow.client,
      payee: escrow.freelancer,
      description: `Escrow release: ${req.body.reason}`
    });

    res.json({
      success: true,
      data: escrow
    });
  } catch (error) {
    logger.error('Error releasing escrow:', error);
    return errorResponse(res, 500, 'Error releasing escrow');
  }
};

// @desc    Raise dispute for escrow
// @route   POST /api/escrow/:id/dispute
// @access  Private
export const disputeEscrow = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id);

    if (!escrow) {
      return errorResponse(res, 404, 'Escrow not found');
    }

    // Check if user is involved in escrow
    if (escrow.client.toString() !== req.user._id.toString() &&
        escrow.freelancer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to dispute this escrow');
    }

    if (escrow.status !== 'funded') {
      return errorResponse(res, 400, 'Can only dispute funded escrow');
    }

    if (escrow.disputeStatus === 'active') {
      return errorResponse(res, 400, 'Dispute already exists for this escrow');
    }

    // Update escrow status
    escrow.status = 'disputed';
    escrow.disputeStatus = 'active';
    escrow.disputeReason = req.body.reason;
    escrow.disputeEvidence = req.body.evidence;
    escrow.disputeInitiator = req.user._id;
    escrow.desiredResolution = req.body.desiredResolution;
    await escrow.save();

    // Create dispute transaction record
    await Transaction.create({
      escrow: escrow._id,
      amount: escrow.amount,
      type: 'escrow_dispute',
      status: 'pending',
      currency: escrow.currency,
      description: `Dispute initiated: ${req.body.reason}`
    });

    res.json({
      success: true,
      data: escrow
    });
  } catch (error) {
    logger.error('Error disputing escrow:', error);
    return errorResponse(res, 500, 'Error disputing escrow');
  }
};

export default {
  createEscrow,
  getEscrows,
  getEscrow,
  releaseEscrow,
  disputeEscrow
};
