import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['host', 'cohost', 'participant'],
    default: 'participant'
  },
  permissions: {
    canVideo: { type: Boolean, default: true },
    canAudio: { type: Boolean, default: true },
    canChat: { type: Boolean, default: true },
    canScreenShare: { type: Boolean, default: true },
    canRecord: { type: Boolean, default: false },
    canWhiteboard: { type: Boolean, default: true }
  },
  joinedAt: { type: Date },
  leftAt: { type: Date }
});

const recordingSchema = new mongoose.Schema({
  startedAt: { type: Date, required: true },
  endedAt: { type: Date },
  duration: { type: Number }, // in seconds
  url: String,
  size: Number, // in bytes
  format: String,
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  scheduledStart: {
    type: Date,
    required: true
  },
  actualStart: {
    type: Date
  },
  actualEnd: {
    type: Date
  },
  duration: {
    type: Number,
    required: true,
    min: 5,
    max: 480
  },
  settings: {
    enableVideo: { type: Boolean, default: true },
    enableAudio: { type: Boolean, default: true },
    enableChat: { type: Boolean, default: true },
    enableScreenShare: { type: Boolean, default: true },
    enableRecording: { type: Boolean, default: false },
    enableWhiteboard: { type: Boolean, default: false },
    waitingRoom: { type: Boolean, default: false },
    requirePassword: { type: Boolean, default: false },
    password: { type: String },
    maxParticipants: { type: Number, min: 2, max: 100, default: 10 }
  },
  participants: [participantSchema],
  recordings: [recordingSchema],
  whiteboard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Whiteboard'
  },
  recurrence: {
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    interval: {
      type: Number,
      min: 1,
      max: 52
    },
    endDate: Date
  },
  peakParticipants: {
    type: Number,
    default: 0
  },
  metadata: {
    createdFrom: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    },
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Instance methods
meetingSchema.methods.addParticipant = async function(userId, role = 'participant') {
  const participantExists = this.participants.some(p => 
    p.user.toString() === userId.toString()
  );

  if (!participantExists) {
    this.participants.push({
      user: userId,
      role,
      joinedAt: new Date()
    });

    if (this.participants.length > this.peakParticipants) {
      this.peakParticipants = this.participants.length;
    }

    await this.save();
  }
};

meetingSchema.methods.removeParticipant = async function(userId) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );

  if (participant && !participant.leftAt) {
    participant.leftAt = new Date();
    await this.save();
  }
};

meetingSchema.methods.updateParticipantRole = async function(userId, newRole) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );

  if (participant) {
    participant.role = newRole;
    await this.save();
  }
};

meetingSchema.methods.start = async function() {
  if (this.status === 'scheduled') {
    this.status = 'active';
    this.actualStart = new Date();
    await this.save();
  }
};

meetingSchema.methods.end = async function() {
  if (this.status === 'active') {
    this.status = 'completed';
    this.actualEnd = new Date();
    await this.save();
  }
};

// Static methods
meetingSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

meetingSchema.statics.findUpcoming = function(minutes = 15) {
  const now = new Date();
  const future = new Date(now.getTime() + minutes * 60000);
  
  return this.find({
    status: 'scheduled',
    scheduledStart: {
      $gte: now,
      $lte: future
    }
  });
};

// Indexes
meetingSchema.index({ status: 1, scheduledStart: 1 });
meetingSchema.index({ host: 1, status: 1 });
meetingSchema.index({ 'participants.user': 1, status: 1 });

export const Meeting = mongoose.model('Meeting', meetingSchema);

export default Meeting;
