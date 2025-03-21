import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters']
  },

  content: {
    type: String,
    default: ''
  },

  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Document owner is required']
  },

  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'editor'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  version: {
    type: Number,
    default: 0
  },

  lastModified: {
    type: Date,
    default: Date.now
  },

  metadata: {
    language: {
      type: String,
      default: 'plaintext'
    },
    theme: {
      type: String,
      default: 'default'
    },
    fontSize: {
      type: Number,
      default: 14
    },
    lineNumbers: {
      type: Boolean,
      default: true
    },
    wordWrap: {
      type: Boolean,
      default: true
    },
    autoSave: {
      type: Boolean,
      default: true
    }
  },

  history: [{
    version: Number,
    content: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    description: String
  }],

  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true
    },
    position: {
      line: Number,
      column: Number
    },
    resolved: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date,
    replies: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],

  tags: [{
    type: String,
    trim: true
  }],

  isArchived: {
    type: Boolean,
    default: false
  },

  isPublic: {
    type: Boolean,
    default: false
  },

  shareLink: {
    code: String,
    expiresAt: Date
  }
}, {
  timestamps: true
});

// Indexes
documentSchema.index({ title: 'text', tags: 'text' });
documentSchema.index({ 'collaborators.userId': 1 });
documentSchema.index({ ownerId: 1 });
documentSchema.index({ isPublic: 1 });

// Middleware
documentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.lastModified = Date.now();
    this.version += 1;
  }
  next();
});

// Methods
documentSchema.methods.isCollaborator = function(userId) {
  return this.collaborators.some(c => c.userId.equals(userId));
};

documentSchema.methods.canEdit = function(userId) {
  if (this.ownerId.equals(userId)) return true;
  const collaborator = this.collaborators.find(c => c.userId.equals(userId));
  return collaborator && collaborator.role === 'editor';
};

documentSchema.methods.addCollaborator = function(userId, role = 'editor') {
  if (!this.collaborators.some(c => c.userId.equals(userId))) {
    this.collaborators.push({ userId, role });
  }
};

documentSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(c => !c.userId.equals(userId));
};

documentSchema.methods.addComment = function(userId, content, position) {
  this.comments.push({
    userId,
    content,
    position
  });
};

documentSchema.methods.resolveComment = function(commentId) {
  const comment = this.comments.id(commentId);
  if (comment) {
    comment.resolved = true;
    comment.updatedAt = Date.now();
  }
};

documentSchema.methods.addVersion = function(userId, content, description = '') {
  this.history.push({
    version: this.version + 1,
    content,
    userId,
    description
  });
};

documentSchema.methods.generateShareLink = function(expiryHours = 24) {
  const code = Math.random().toString(36).substring(2, 15);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);

  this.shareLink = {
    code,
    expiresAt
  };

  return code;
};

documentSchema.methods.revokeShareLink = function() {
  this.shareLink = undefined;
};

// Statics
documentSchema.statics.findByShareCode = function(code) {
  return this.findOne({
    'shareLink.code': code,
    'shareLink.expiresAt': { $gt: new Date() }
  });
};

documentSchema.statics.findCollaborations = function(userId) {
  return this.find({
    'collaborators.userId': userId,
    isArchived: false
  }).sort('-updatedAt');
};

const Document = mongoose.model('Document', documentSchema);

export default Document;
