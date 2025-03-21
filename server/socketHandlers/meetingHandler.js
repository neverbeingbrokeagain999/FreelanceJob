import { logger } from '../config/logger.js';
import { webRTCConfig, signalingConfig } from '../config/webrtc.js';
import { emitToRoom, emitToUser } from '../services/socketService.js';

const meetingRooms = new Map();

export const registerMeetingHandlers = (io) => {
  io.on('connection', (socket) => {
    // Join meeting room
    socket.on('meeting:join', async (data) => {
      try {
        const { meetingId, userInfo } = data;
        await handleJoinMeeting(socket, meetingId, userInfo);
      } catch (error) {
        logger.error('Error joining meeting:', error);
        socket.emit('meeting:error', {
          message: 'Failed to join meeting',
          error: error.message
        });
      }
    });

    // Leave meeting room
    socket.on('meeting:leave', async (data) => {
      try {
        const { meetingId } = data;
        await handleLeaveMeeting(socket, meetingId);
      } catch (error) {
        logger.error('Error leaving meeting:', error);
      }
    });

    // WebRTC signaling
    socket.on('signal:offer', (data) => {
      try {
        const { targetUserId, offer } = data;
        handleSignalOffer(socket, targetUserId, offer);
      } catch (error) {
        logger.error('Error handling offer signal:', error);
      }
    });

    socket.on('signal:answer', (data) => {
      try {
        const { targetUserId, answer } = data;
        handleSignalAnswer(socket, targetUserId, answer);
      } catch (error) {
        logger.error('Error handling answer signal:', error);
      }
    });

    socket.on('signal:ice-candidate', (data) => {
      try {
        const { targetUserId, candidate } = data;
        handleIceCandidate(socket, targetUserId, candidate);
      } catch (error) {
        logger.error('Error handling ICE candidate:', error);
      }
    });

    // Meeting controls
    socket.on('meeting:toggle-audio', (data) => {
      handleToggleAudio(socket, data);
    });

    socket.on('meeting:toggle-video', (data) => {
      handleToggleVideo(socket, data);
    });

    socket.on('meeting:start-screen-share', (data) => {
      handleStartScreenShare(socket, data);
    });

    socket.on('meeting:stop-screen-share', (data) => {
      handleStopScreenShare(socket, data);
    });

    // Handle participant kicked
    socket.on('meeting:kick-participant', async (data) => {
      try {
        const { meetingId, userId } = data;
        await handleKickParticipant(socket, meetingId, userId);
      } catch (error) {
        logger.error('Error kicking participant:', error);
      }
    });

    // Handle recording
    socket.on('meeting:start-recording', (data) => {
      handleStartRecording(socket, data);
    });

    socket.on('meeting:stop-recording', (data) => {
      handleStopRecording(socket, data);
    });
  });
};

// Meeting room management
const handleJoinMeeting = async (socket, meetingId, userInfo) => {
  try {
    // Join the socket.io room
    await socket.join(meetingId);

    // Initialize room if it doesn't exist
    if (!meetingRooms.has(meetingId)) {
      meetingRooms.set(meetingId, {
        participants: new Map(),
        screenShare: null,
        recording: false
      });
    }

    const room = meetingRooms.get(meetingId);
    room.participants.set(socket.id, {
      ...userInfo,
      socketId: socket.id,
      audio: true,
      video: true
    });

    // Notify others in the room
    emitToRoom(meetingId, 'meeting:participant-joined', {
      participant: room.participants.get(socket.id)
    }, socket.id);

    // Send current participants list to the new participant
    const participants = Array.from(room.participants.values());
    socket.emit('meeting:participants', { participants });

    // Send current room state
    socket.emit('meeting:state', {
      screenShare: room.screenShare,
      recording: room.recording
    });

    logger.info(`User ${socket.id} joined meeting ${meetingId}`);
  } catch (error) {
    logger.error('Error in handleJoinMeeting:', error);
    throw error;
  }
};

const handleLeaveMeeting = async (socket, meetingId) => {
  try {
    const room = meetingRooms.get(meetingId);
    if (!room) return;

    // Remove participant
    room.participants.delete(socket.id);

    // If room is empty, clean up
    if (room.participants.size === 0) {
      meetingRooms.delete(meetingId);
    } else {
      // Notify others
      emitToRoom(meetingId, 'meeting:participant-left', {
        participantId: socket.id
      });
    }

    await socket.leave(meetingId);
    logger.info(`User ${socket.id} left meeting ${meetingId}`);
  } catch (error) {
    logger.error('Error in handleLeaveMeeting:', error);
    throw error;
  }
};

// WebRTC signaling handlers
const handleSignalOffer = (socket, targetUserId, offer) => {
  emitToUser(targetUserId, 'signal:offer', {
    fromUserId: socket.id,
    offer
  });
};

const handleSignalAnswer = (socket, targetUserId, answer) => {
  emitToUser(targetUserId, 'signal:answer', {
    fromUserId: socket.id,
    answer
  });
};

const handleIceCandidate = (socket, targetUserId, candidate) => {
  emitToUser(targetUserId, 'signal:ice-candidate', {
    fromUserId: socket.id,
    candidate
  });
};

// Meeting control handlers
const handleToggleAudio = (socket, { meetingId, enabled }) => {
  const room = meetingRooms.get(meetingId);
  if (!room) return;

  const participant = room.participants.get(socket.id);
  if (participant) {
    participant.audio = enabled;
    emitToRoom(meetingId, 'meeting:audio-changed', {
      participantId: socket.id,
      enabled
    });
  }
};

const handleToggleVideo = (socket, { meetingId, enabled }) => {
  const room = meetingRooms.get(meetingId);
  if (!room) return;

  const participant = room.participants.get(socket.id);
  if (participant) {
    participant.video = enabled;
    emitToRoom(meetingId, 'meeting:video-changed', {
      participantId: socket.id,
      enabled
    });
  }
};

const handleStartScreenShare = (socket, { meetingId }) => {
  const room = meetingRooms.get(meetingId);
  if (!room) return;

  if (room.screenShare) {
    socket.emit('meeting:error', {
      message: 'Someone is already sharing their screen'
    });
    return;
  }

  room.screenShare = socket.id;
  emitToRoom(meetingId, 'meeting:screen-share-started', {
    participantId: socket.id
  });
};

const handleStopScreenShare = (socket, { meetingId }) => {
  const room = meetingRooms.get(meetingId);
  if (!room || room.screenShare !== socket.id) return;

  room.screenShare = null;
  emitToRoom(meetingId, 'meeting:screen-share-stopped', {
    participantId: socket.id
  });
};

const handleKickParticipant = async (socket, meetingId, userId) => {
  const room = meetingRooms.get(meetingId);
  if (!room) return;

  // Notify the kicked participant
  emitToUser(userId, 'meeting:kicked', { meetingId });

  // Remove them from the room
  await handleLeaveMeeting({ id: userId }, meetingId);
};

const handleStartRecording = (socket, { meetingId }) => {
  const room = meetingRooms.get(meetingId);
  if (!room) return;

  room.recording = true;
  emitToRoom(meetingId, 'meeting:recording-started', {
    participantId: socket.id
  });
};

const handleStopRecording = (socket, { meetingId }) => {
  const room = meetingRooms.get(meetingId);
  if (!room) return;

  room.recording = false;
  emitToRoom(meetingId, 'meeting:recording-stopped', {
    participantId: socket.id
  });
};

export default {
  registerMeetingHandlers
};
