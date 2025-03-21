export const webRTCConfig = {
  // ICE (Interactive Connectivity Establishment) servers configuration
  iceServers: [
    // Default STUN servers
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302'
      ]
    },
    // Fallback STUN server
    {
      urls: 'stun:stun.services.mozilla.com'
    },
    // Use environment variables for TURN server credentials in production
    {
      urls: process.env.TURN_SERVER_URL || 'turn:your-turn-server.com:3478',
      username: process.env.TURN_SERVER_USERNAME || 'default_username',
      credential: process.env.TURN_SERVER_CREDENTIAL || 'default_password'
    }
  ],

  // WebRTC options
  options: {
    // The maximum number of milliseconds to wait for ICE gathering to complete
    iceGatheringTimeout: 5000,

    // Options for media constraints
    mediaConstraints: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    },

    // Screen sharing options
    screenSharing: {
      video: {
        cursor: 'always',
        displaySurface: 'monitor',
        logicalSurface: true,
        width: { max: 1920 },
        height: { max: 1080 },
        frameRate: { max: 30 }
      }
    }
  },

  // Room configuration
  room: {
    maxParticipants: 10, // Maximum participants per room
    autoCloseEmpty: true, // Automatically close empty rooms
    timeoutEmpty: 300000, // Close empty room after 5 minutes (in milliseconds)
    reconnectTimeout: 15000 // Time to wait for reconnection attempts (in milliseconds)
  },

  // Connection quality thresholds
  quality: {
    minBitrate: 100000, // Minimum acceptable bitrate in bits per second
    lowQualityThreshold: 250000, // Threshold for low quality warning
    connectionTimeout: 10000, // Time to wait before considering connection failed
    poorConnectionTimeout: 5000 // Time to wait before showing poor connection warning
  },

  // Recording options
  recording: {
    enabled: true,
    maxDuration: 7200000, // Maximum recording duration (2 hours in milliseconds)
    mimeType: 'video/webm;codecs=vp8,opus',
    videoBitsPerSecond: 2500000, // Video bitrate for recording
    audioBitsPerSecond: 128000 // Audio bitrate for recording
  }
};

// Signaling configuration
export const signalingConfig = {
  // Heartbeat configuration
  heartbeat: {
    interval: 30000, // Send heartbeat every 30 seconds
    timeout: 60000 // Consider connection lost after 60 seconds without heartbeat
  },

  // Message types for signaling
  messageTypes: {
    JOIN: 'join',
    LEAVE: 'leave',
    OFFER: 'offer',
    ANSWER: 'answer',
    ICE_CANDIDATE: 'ice-candidate',
    ROOM_INFO: 'room-info',
    ERROR: 'error',
    HEARTBEAT: 'heartbeat'
  },

  // Reconnection configuration
  reconnection: {
    attempts: 3,
    delay: 2000, // Delay between reconnection attempts in milliseconds
    backoff: 1.5 // Exponential backoff factor
  }
};

// Error types
export const webRTCErrors = {
  CONNECTION_FAILED: 'connection_failed',
  ICE_FAILED: 'ice_failed',
  MEDIA_ERROR: 'media_error',
  PERMISSION_DENIED: 'permission_denied',
  ROOM_FULL: 'room_full',
  USER_OFFLINE: 'user_offline',
  SIGNALING_ERROR: 'signaling_error',
  NETWORK_ERROR: 'network_error'
};

export default {
  webRTCConfig,
  signalingConfig,
  webRTCErrors
};
