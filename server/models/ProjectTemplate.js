import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
    minlength: 10,
    maxlength: 1000
  },
  estimatedHours: {
    type: Number,
    required: [true, 'Estimated hours is required'],
    min: 0.5,
    max: 1000
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true
});

const projectTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    minlength: [3, 'Template name must be at least 3 characters long'],
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Template description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['web', 'mobile', 'desktop', 'api', 'database', 'devops', 'other']
  },
  tasks: {
    type: [taskSchema],
    required: [true, 'At least one task is required'],
    validate: {
      validator: function(tasks) {
        return tasks.length > 0;
      },
      message: 'Template must have at least one task'
    }
  },
  tags: {
    type: [String],
    validate: {
      validator: function(tags) {
        return tags.length <= 10 && tags.every(tag => tag.length >= 2 && tag.length <= 20);
      },
      message: 'Tags must be between 2 and 20 characters and maximum 10 tags allowed'
    }
  },
  estimatedDuration: {
    min: {
      type: Number,
      required: [true, 'Minimum duration is required'],
      min: 1,
      validate: {
        validator: function(min) {
          return min <= this.estimatedDuration.max;
        },
        message: 'Minimum duration cannot be greater than maximum duration'
      }
    },
    max: {
      type: Number,
      required: [true, 'Maximum duration is required'],
      max: 365,
      validate: {
        validator: function(max) {
          return max >= this.estimatedDuration.min;
        },
        message: 'Maximum duration cannot be less than minimum duration'
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Template creator is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  usageCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
projectTemplateSchema.index({ name: 'text', description: 'text' });
projectTemplateSchema.index({ category: 1, visibility: 1, isActive: 1 });
projectTemplateSchema.index({ tags: 1 });
projectTemplateSchema.index({ createdBy: 1 });

// Virtual for total estimated hours
projectTemplateSchema.virtual('totalEstimatedHours').get(function() {
  return this.tasks.reduce((total, task) => total + task.estimatedHours, 0);
});

// Static method to get popular templates
projectTemplateSchema.statics.getPopularTemplates = async function(limit = 10) {
  return this.find({ isActive: true, visibility: 'public' })
    .sort({ usageCount: -1, averageRating: -1 })
    .limit(limit);
};

// Method to increment usage count
projectTemplateSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  return this.save();
};

// Method to update rating
projectTemplateSchema.methods.updateRating = async function(newRating) {
  const oldTotal = this.averageRating * this.ratingCount;
  this.ratingCount += 1;
  this.averageRating = (oldTotal + newRating) / this.ratingCount;
  return this.save();
};

export const ProjectTemplate = mongoose.model('ProjectTemplate', projectTemplateSchema);

export default ProjectTemplate;
