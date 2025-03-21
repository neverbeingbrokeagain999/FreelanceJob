import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    minlength: [50, 'Description must be at least 50 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client reference is required']
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: String,
    required: [true, 'Job category is required'],
    enum: ['web', 'mobile', 'desktop', 'api', 'database', 'devops', 'other']
  },
  skills: [{
    type: String,
    required: true
  }],
  budget: {
    type: {
      min: {
        type: Number,
        required: true,
        min: [5, 'Minimum budget cannot be less than 5']
      },
      max: {
        type: Number,
        required: true
      }
    },
    required: true,
    validate: {
      validator: function(budget) {
        return budget.max >= budget.min;
      },
      message: 'Maximum budget cannot be less than minimum budget'
    }
  },
  duration: {
    type: {
      min: {
        type: Number,
        required: true,
        min: [1, 'Minimum duration must be at least 1 day']
      },
      max: {
        type: Number,
        required: true,
        max: [365, 'Maximum duration cannot exceed 365 days']
      }
    },
    required: true,
    validate: {
      validator: function(duration) {
        return duration.max >= duration.min;
      },
      message: 'Maximum duration cannot be less than minimum duration'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'in_progress', 'under_review', 'completed', 'cancelled', 'disputed'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite_only'],
    default: 'public'
  },
  paymentType: {
    type: String,
    enum: ['fixed', 'hourly'],
    required: [true, 'Payment type is required']
  },
  workingHours: {
    min: {
      type: Number,
      min: [1, 'Minimum working hours must be at least 1']
    },
    max: {
      type: Number,
      max: [168, 'Maximum working hours cannot exceed 168 (1 week)']
    }
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'intermediate', 'expert'],
    required: [true, 'Experience level is required']
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  milestones: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    dueDate: Date,
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    }
  }],
  proposals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal'
  }],
  startDate: Date,
  completionDate: Date,
  cancelledDate: Date,
  cancelReason: String,
  totalAmount: Number,
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  proposalCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ client: 1, status: 1 });
jobSchema.index({ freelancer: 1, status: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ 'budget.min': 1, 'budget.max': 1 });
jobSchema.index({ createdAt: -1 });

// Virtual for proposal stats
jobSchema.virtual('proposalStats').get(function() {
  return {
    total: this.proposalCount,
    averageBid: this.proposals?.reduce((acc, p) => acc + p.amount, 0) / this.proposalCount || 0
  };
});

// Virtual for job duration in days
jobSchema.virtual('durationInDays').get(function() {
  if (this.startDate && this.completionDate) {
    return Math.ceil((this.completionDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Static method to get featured jobs
jobSchema.statics.getFeaturedJobs = async function(limit = 5) {
  return this.find({
    status: 'open',
    isActive: true,
    visibility: 'public'
  })
  .sort({ views: -1, createdAt: -1 })
  .limit(limit)
  .populate('client', 'name');
};

// Method to increment view count
jobSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

// Method to update proposal count
jobSchema.methods.updateProposalCount = async function() {
  this.proposalCount = await this.model('Proposal').countDocuments({ job: this._id });
  return this.save();
};

export const Job = mongoose.model('Job', jobSchema);

export default Job;
