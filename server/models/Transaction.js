import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  escrow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: ['USD', 'EUR', 'GBP']
  },
  type: {
    type: String,
    required: true,
    enum: [
      'escrow_creation',
      'escrow_release',
      'escrow_refund',
      'escrow_dispute',
      'platform_fee',
      'processing_fee',
      'withdrawal',
      'deposit'
    ]
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'disputed'],
    default: 'pending'
  },
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return ['escrow_creation', 'platform_fee', 'processing_fee'].includes(this.type);
    }
  },
  payee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return ['escrow_release', 'escrow_refund'].includes(this.type);
    }
  },
  description: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'paypal', 'system'],
    default: 'system'
  },
  paymentDetails: {
    provider: String,
    transactionId: String,
    last4: String,
    processorResponse: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  errorDetails: {
    code: String,
    message: String,
    processorError: mongoose.Schema.Types.Mixed
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
transactionSchema.index({ escrow: 1, type: 1 });
transactionSchema.index({ payer: 1, status: 1 });
transactionSchema.index({ payee: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: 1 });
transactionSchema.index({ type: 1, createdAt: 1 });

// Virtual for transaction age
transactionSchema.virtual('age').get(function() {
  const now = new Date();
  return Math.ceil((now - this.createdAt) / (1000 * 60 * 60 * 24)); // Days
});

// Virtual for processing time
transactionSchema.virtual('processingTime').get(function() {
  if (this.processedAt && this.createdAt) {
    return (this.processedAt - this.createdAt) / 1000; // Seconds
  }
  return null;
});

// Methods
transactionSchema.methods.markAsProcessing = async function() {
  this.status = 'processing';
  this.processedAt = new Date();
  return this.save();
};

transactionSchema.methods.markAsCompleted = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

transactionSchema.methods.markAsFailed = async function(error) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.errorDetails = error;
  return this.save();
};

transactionSchema.methods.markAsCancelled = async function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.description = reason;
  return this.save();
};

// Static methods
transactionSchema.statics.getTotalAmountByStatus = async function(status) {
  const result = await this.aggregate([
    { $match: { status } },
    {
      $group: {
        _id: '$currency',
        total: { $sum: '$amount' }
      }
    }
  ]);
  return result;
};

transactionSchema.statics.getTransactionStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          status: '$status',
          currency: '$currency'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

export const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
