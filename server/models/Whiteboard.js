import mongoose from 'mongoose';

const elementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['path', 'line', 'rectangle', 'circle', 'text', 'image'],
    required: true
  },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: Number,
  height: Number,
  color: String,
  strokeWidth: Number,
  fill: String,
  text: String,
  fontSize: Number,
  fontFamily: String,
  path: String,
  points: [{ x: Number, y: Number }],
  radius: Number,
  rotation: { type: Number, default: 0 },
  scale: { type: Number, default: 1 },
  imageUrl: String,
  opacity: { type: Number, min: 0, max: 1, default: 1 },
  zIndex: { type: Number, default: 0 },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const whiteboardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['meeting', 'standalone'],
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  elements: [elementSchema],
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    maxElements: {
      type: Number,
      default: 1000
    },
    allowExport: {
      type: Boolean,
      default: true
    },
    exportFormats: [{
      type: String,
      enum: ['png', 'svg', 'json'],
      default: ['png']
    }],
    gridEnabled: {
      type: Boolean,
      default: true
    },
    gridSize: {
      type: Number,
      default: 20
    },
    snapToGrid: {
      type: Boolean,
      default: true
    },
    backgroundColor: {
      type: String,
      default: '#ffffff'
    }
  },
  canvas: {
    width: {
      type: Number,
      default: 1920
    },
    height: {
      type: Number,
      default: 1080
    },
    zoom: {
      type: Number,
      default: 1
    },
    offset: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    }
  },
  history: [{
    action: {
      type: String,
      enum: ['add', 'update', 'delete', 'clear', 'reorder'],
      required: true
    },
    elementIds: [{
      type: mongoose.Schema.Types.ObjectId
    }],
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  lastClearedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastClearedAt: Date,
  metadata: {
    createdFrom: {
      type: String,
      enum: ['meeting', 'template', 'blank'],
      default: 'blank'
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhiteboardTemplate'
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting'
    }
  }
}, {
  timestamps: true
});

// Instance methods
whiteboardSchema.methods.addCollaborator = async function(userId, role = 'viewer') {
  const exists = this.collaborators.some(c => 
    c.user.toString() === userId.toString()
  );

  if (!exists) {
    this.collaborators.push({
      user: userId,
      role,
      addedAt: new Date()
    });
    await this.save();
  }
};

whiteboardSchema.methods.removeCollaborator = async function(userId) {
  this.collaborators = this.collaborators.filter(c => 
    c.user.toString() !== userId.toString()
  );
  await this.save();
};

whiteboardSchema.methods.updateCollaboratorRole = async function(userId, newRole) {
  const collaborator = this.collaborators.find(c => 
    c.user.toString() === userId.toString()
  );

  if (collaborator) {
    collaborator.role = newRole;
    await this.save();
  }
};

whiteboardSchema.methods.addElement = async function(element, userId) {
  element.createdBy = userId;
  element.lastModifiedBy = userId;
  this.elements.push(element);
  
  this.history.push({
    action: 'add',
    elementIds: [element._id],
    performedBy: userId
  });

  await this.save();
  return element;
};

whiteboardSchema.methods.updateElement = async function(elementId, updates, userId) {
  const element = this.elements.id(elementId);
  if (!element) return null;

  Object.assign(element, updates);
  element.lastModifiedBy = userId;

  this.history.push({
    action: 'update',
    elementIds: [elementId],
    performedBy: userId
  });

  await this.save();
  return element;
};

whiteboardSchema.methods.deleteElement = async function(elementId, userId) {
  const element = this.elements.id(elementId);
  if (!element) return false;

  element.remove();

  this.history.push({
    action: 'delete',
    elementIds: [elementId],
    performedBy: userId
  });

  await this.save();
  return true;
};

whiteboardSchema.methods.clearElements = async function(userId) {
  this.elements = [];
  this.lastClearedBy = userId;
  this.lastClearedAt = new Date();

  this.history.push({
    action: 'clear',
    elementIds: [],
    performedBy: userId
  });

  await this.save();
};

// Static methods
whiteboardSchema.statics.findByCollaborator = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'collaborators.user': userId }
    ]
  });
};

// Indexes
whiteboardSchema.index({ owner: 1, type: 1 });
whiteboardSchema.index({ 'collaborators.user': 1 });
whiteboardSchema.index({ 'metadata.meetingId': 1 });

export const Whiteboard = mongoose.model('Whiteboard', whiteboardSchema);

export default Whiteboard;
