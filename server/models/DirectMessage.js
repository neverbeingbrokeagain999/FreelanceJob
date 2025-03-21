import mongoose from 'mongoose';

const directMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxLength: 2000
  },
  files: [{
    filename: {
      type: String,
      required: true
    },
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  metadata: {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectContract'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
directMessageSchema.index({ sender: 1, receiver: 1 });
directMessageSchema.index({ createdAt: -1 });
directMessageSchema.index({ 'metadata.job': 1 });
directMessageSchema.index({ 'metadata.contract': 1 });

// Prevent sending messages to self
directMessageSchema.pre('save', function(next) {
  if (this.sender.toString() === this.receiver.toString()) {
    next(new Error('Cannot send message to self'));
  }
  next();
});

// Methods
directMessageSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Static methods
directMessageSchema.statics.getConversationBetween = async function(userId1, userId2, options = {}) {
  const { page = 1, limit = 20, before } = options;
  
  const query = {
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 }
    ]
  };

  if (before) {
    query.createdAt = { $lt: before };
  }

  const messages = await this.find(query)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'name email avatar')
    .populate('receiver', 'name email avatar');

  const total = await this.countDocuments(query);

  return {
    messages: messages.reverse(),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

directMessageSchema.statics.markAllAsRead = async function(senderId, receiverId) {
  const result = await this.updateMany(
    {
      sender: senderId,
      receiver: receiverId,
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
  return result.modifiedCount;
};

export default mongoose.model('DirectMessage', directMessageSchema);
