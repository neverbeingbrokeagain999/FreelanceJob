import mongoose from 'mongoose';

const escrowSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job reference is required']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client reference is required']
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Freelancer reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['USD', 'EUR', 'GBP']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'funded', 'released', 'disputed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  milestoneNumber: {
    type: Number,
    required: [true, 'Milestone number is required'],
    min: [1, 'Milestone number must be at least 1']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  platformFee: {
    type: Number,
    required: true
  },
  processingFee: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  fundedDate: {
    type: Date
  },
  releaseDate: {
    type: Date
  },
  releaseReason: {
    type: String,
    trim: true
  },
  disputeStatus: {
    type: String,
    enum: ['none', 'active', 'resolved'],
    default: 'none'
  },
  disputeReason: {
    type: String,
    trim: true
  },
  disputeEvidence: [{
    type: {
      type: String,
      enum: ['document', 'image', 'message']
    },
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  disputeInitiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  desiredResolution: {
    type: String,
    trim: true
  },
  resolution: {
    type: String,
    trim: true
  },
  resolutionDate: {
    type: Date
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
escrowSchema.index({ job: 1, milestoneNumber: 1 }, { unique: true });
escrowSchema.index({ client: 1, status: 1 });
escrowSchema.index({ freelancer: 1, status: 1 });
escrowSchema.index({ status: 1, dueDate: 1 });
escrowSchema.index({ disputeStatus: 1 });

// Virtual for dispute duration
escrowSchema.virtual('disputeDuration').get(function() {
  if (this.disputeStatus === 'active' && this.disputeInitiator) {
    const now = new Date();
    const disputeStart = this.updatedAt;
    return Math.ceil((now - disputeStart) / (1000 * 60 * 60 * 24)); // Days
  }
  return 0;
});

// Virtual for escrow age
escrowSchema.virtual('age').get(function() {
  const now = new Date();
  return Math.ceil((now - this.createdAt) / (1000 * 60 * 60 * 24)); // Days
});

// Virtual for days until due
escrowSchema.virtual('daysUntilDue').get(function() {
  const now = new Date();
  return Math.ceil((this.dueDate - now) / (1000 * 60 * 60 * 24));
});

// Check if escrow is overdue
escrowSchema.virtual('isOverdue').get(function() {
  return this.status === 'funded' && this.dueDate < new Date();
});

export const Escrow = mongoose.model('Escrow', escrowSchema);

export default Escrow;
