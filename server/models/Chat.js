import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['group', 'direct'],
    required: true
  },
  description: String,
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  messages: [messageSchema],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  metadata: {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectContract'
    }
  },
  settings: {
    muted: {
      type: Boolean,
      default: false
    },
    notifications: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
chatSchema.index({ participants: 1 });
chatSchema.index({ 'metadata.job': 1 });
chatSchema.index({ 'metadata.contract': 1 });
chatSchema.index({ lastActivity: -1 });

// Methods
chatSchema.methods.addMessage = async function(messageData) {
  const message = this.messages.create(messageData);
  this.messages.push(message);
  this.lastMessage = message._id;
  this.lastActivity = new Date();
  await this.save();
  return message;
};

chatSchema.methods.addParticipant = async function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    await this.save();
  }
  return this;
};

chatSchema.methods.removeParticipant = async function(userId) {
  if (this.type === 'group') {
    this.participants = this.participants.filter(p => p.toString() !== userId.toString());
    this.admins = this.admins.filter(a => a.toString() !== userId.toString());
    await this.save();
  }
  return this;
};

export default mongoose.model('Chat', chatSchema);
