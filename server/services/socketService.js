import { logger } from '../config/logger.js';
import { webRTCConfig, signalingConfig } from '../config/webrtc.js';
import { getRedisClient } from '../config/redis.js';

let io;
const connectedUsers = new Map();
const redisClient = getRedisClient();

// Room tracking with Redis
const ROOM_PREFIX = 'room:';
const USER_ROOMS_PREFIX = 'user_rooms:';

export const initSocketService = (socketIo) => {
  io = socketIo;
  setupConnectionHandlers();
  logger.info('Socket.IO service initialized');
  return io;
};

const setupConnectionHandlers = () => {
  io.on('connection', async (socket) => {
    try {
      logger.info(`Socket connected: ${socket.id}, User: ${socket.user._id}`);
      
      // Store user connection with extended metadata
      const userConnection = {
        socketId: socket.id,
        userId: socket.user._id,
        rooms: new Set(),
        lastActivity: Date.now(),
        clientInfo: {
          userAgent: socket.handshake.headers['user-agent'],
          ip: socket.handshake.address,
          transport: socket.conn.transport.name
        }
      };
      
      connectedUsers.set(socket.user._id, userConnection);

      // Restore user's rooms from Redis
      await restoreUserRooms(socket);

      // Handle disconnection
      socket.on('disconnect', () => handleDisconnect(socket));

      // Handle errors
      socket.on('error', (error) => handleError(socket, error));

      // Setup heartbeat with monitoring
      setupHeartbeat(socket);

      // Update user's last activity periodically
      const activityInterval = setInterval(() => {
        const user = connectedUsers.get(socket.user._id);
        if (user) {
          user.lastActivity = Date.now();
        }
      }, 60000); // Every minute

      socket.on('disconnect', () => {
        clearInterval(activityInterval);
      });

      // Notify user status change
      await broadcastUserStatus(socket.user._id, true);

    } catch (error) {
      logger.error('Error in socket connection handler:', {
        error: error.message,
        socketId: socket.id,
        userId: socket.user?._id
      });
      socket.disconnect();
    }
  });
};

const handleDisconnect = async (socket) => {
  try {
    logger.info(`Socket disconnected: ${socket.id}`);
    
    const userId = socket.user?._id;
    if (userId) {
      const userConnection = connectedUsers.get(userId);
      if (userConnection) {
        // Save rooms to Redis before leaving
        await saveUserRooms(userId, Array.from(userConnection.rooms));

        // Leave all rooms
        for (const room of userConnection.rooms) {
          await handleRoomLeave(socket, room);
        }

        // Remove user from memory
        connectedUsers.delete(userId);

        // Update Redis with disconnection time
        await redisClient.hSet(`user:${userId}`, 'lastDisconnect', Date.now());
      }

      // Notify user status change
      await broadcastUserStatus(userId, false);

      // Log disconnect details
      logger.debug('User disconnected:', {
        userId,
        socketId: socket.id,
        rooms: userConnection?.rooms.size || 0,
        connectedDuration: userConnection ? 
          Date.now() - userConnection.lastActivity : 0
      });
    }
  } catch (error) {
    logger.error('Error in disconnect handler:', {
      error: error.message,
      socketId: socket.id,
      userId
    });
  }
};

const handleError = (socket, error) => {
  const errorInfo = {
    socketId: socket.id,
    userId: socket.user?._id,
    error: error.message,
    stack: error.stack,
    rooms: Array.from(socket.rooms),
    timestamp: new Date().toISOString()
  };

  logger.error('Socket error:', errorInfo);

  // Notify client of error if appropriate
  if (!error.internal) {
    socket.emit('error:socket', {
      message: 'An error occurred with your connection',
      code: error.code || 'SOCKET_ERROR'
    });
  }

  // Consider disconnecting on severe errors
  if (error.fatal) {
    logger.warn('Fatal socket error, disconnecting client:', {
      socketId: socket.id,
      userId: socket.user?._id
    });
    socket.disconnect(true);
  }
};

const setupHeartbeat = (socket) => {
  let missedHeartbeats = 0;
  const MAX_MISSED_HEARTBEATS = 3;

  // Send heartbeat
  const heartbeatInterval = setInterval(() => {
    if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
      logger.warn('Client unresponsive, disconnecting:', {
        socketId: socket.id,
        userId: socket.user?._id,
        missedHeartbeats
      });
      socket.disconnect(true);
      return;
    }

    missedHeartbeats++;
    socket.emit('ping', { timestamp: Date.now() });
  }, signalingConfig.heartbeat.interval);

  // Handle pong response
  socket.on('pong', () => {
    const userConnection = connectedUsers.get(socket.user._id);
    if (userConnection) {
      userConnection.lastPong = Date.now();
      missedHeartbeats = 0;
    }
  });

  // Clear interval on disconnect
  socket.on('disconnect', () => {
    clearInterval(heartbeatInterval);
  });
};

const broadcastUserStatus = async (userId, isOnline) => {
  try {
    // Update Redis with user status
    await redisClient.hSet(
      `user:${userId}`, 
      'status', 
      isOnline ? 'online' : 'offline'
    );
    
    // Broadcast to all relevant rooms
    const userRooms = await getUserRooms(userId);
    const status = {
      userId,
      status: isOnline ? 'online' : 'offline',
      timestamp: new Date().toISOString(),
      rooms: userRooms
    };

    // Emit to user's rooms
    for (const room of userRooms) {
      io.to(room).emit('user:status', status);
    }

    // Also emit to user's contacts/followers
    const contacts = await getRedisClient().sMembers(`user:${userId}:contacts`);
    for (const contactId of contacts) {
      emitToUser(contactId, 'contact:status', status);
    }
  } catch (error) {
    logger.error('Error broadcasting user status:', {
      error: error.message,
      userId,
      isOnline
    });
  }
};

export const handleRoomJoin = async (socket, roomId) => {
  try {
    // Validate room ID
    if (!roomId?.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error('Invalid room ID format');
    }

    await socket.join(roomId);
    
    const userConnection = connectedUsers.get(socket.user._id);
    if (userConnection) {
      userConnection.rooms.add(roomId);
      
      // Update Redis
      await redisClient.sAdd(
        `${ROOM_PREFIX}${roomId}:members`,
        socket.user._id
      );
      await redisClient.sAdd(
        `${USER_ROOMS_PREFIX}${socket.user._id}`,
        roomId
      );
    }

    // Get room members with their status
    const roomMembers = await getRoomMembers(roomId);
    
    // Notify room of new member
    io.to(roomId).emit('room:user_joined', {
      userId: socket.user._id,
      username: socket.user.username,
      timestamp: new Date().toISOString()
    });

    // Send current members to joining user
    socket.emit('room:users', roomMembers);
    
    logger.info(`User ${socket.user._id} joined room ${roomId}`);
  } catch (error) {
    logger.error('Error joining room:', {
      error: error.message,
      userId: socket.user._id,
      roomId
    });
    socket.emit('error:room', { 
      message: 'Failed to join room',
      code: 'ROOM_JOIN_ERROR' 
    });
  }
};

export const handleRoomLeave = async (socket, roomId) => {
  try {
    await socket.leave(roomId);
    
    const userConnection = connectedUsers.get(socket.user._id);
    if (userConnection) {
      userConnection.rooms.delete(roomId);
      
      // Update Redis
      await redisClient.sRem(
        `${ROOM_PREFIX}${roomId}:members`, 
        socket.user._id
      );
      await redisClient.sRem(
        `${USER_ROOMS_PREFIX}${socket.user._id}`,
        roomId
      );

      // Check if room is empty and clean up if needed
      const roomMembers = await getRoomMembers(roomId);
      if (roomMembers.length === 0) {
        await cleanupRoom(roomId);
      } else {
        // Notify remaining members
        io.to(roomId).emit('room:user_left', {
          userId: socket.user._id,
          username: socket.user.username,
          timestamp: new Date().toISOString()
        });
        io.to(roomId).emit('room:users', roomMembers);
      }
    }
    
    logger.info(`User ${socket.user._id} left room ${roomId}`);
  } catch (error) {
    logger.error('Error leaving room:', {
      error: error.message,
      userId: socket.user._id,
      roomId
    });
  }
};

// Helper functions for room management
const getRoomMembers = async (roomId) => {
  const members = await redisClient.sMembers(`${ROOM_PREFIX}${roomId}:members`);
  return Promise.all(members.map(async (userId) => {
    const status = await redisClient.hGetAll(`user:${userId}`);
    return {
      userId,
      status: status.status || 'offline',
      lastSeen: status.lastActivity || null
    };
  }));
};

const cleanupRoom = async (roomId) => {
  const keys = await redisClient.keys(`${ROOM_PREFIX}${roomId}:*`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
  logger.info(`Cleaned up empty room: ${roomId}`);
};

const getUserRooms = async (userId) => {
  return redisClient.sMembers(`${USER_ROOMS_PREFIX}${userId}`);
};

const restoreUserRooms = async (socket) => {
  try {
    const rooms = await getUserRooms(socket.user._id);
    for (const room of rooms) {
      await handleRoomJoin(socket, room);
    }
  } catch (error) {
    logger.error('Error restoring user rooms:', {
      error: error.message,
      userId: socket.user._id
    });
  }
};

const saveUserRooms = async (userId, rooms) => {
  if (rooms.length > 0) {
    await redisClient.sAdd(
      `${USER_ROOMS_PREFIX}${userId}`,
      rooms
    );
  }
};

export const emitToUser = async (userId, event, data) => {
  try {
    const userConnection = connectedUsers.get(userId);
    if (userConnection) {
      io.to(userConnection.socketId).emit(event, data);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error emitting to user:', {
      error: error.message,
      userId,
      event
    });
    return false;
  }
};

export const emitToRoom = async (roomId, event, data, except = null) => {
  try {
    if (except) {
      io.to(roomId).except(except).emit(event, data);
    } else {
      io.to(roomId).emit(event, data);
    }
    return true;
  } catch (error) {
    logger.error('Error emitting to room:', {
      error: error.message,
      roomId,
      event
    });
    return false;
  }
};

// Expose connection monitoring
export const getConnectionStats = () => ({
  totalConnections: connectedUsers.size,
  connectionsByTransport: Array.from(connectedUsers.values()).reduce((acc, conn) => {
    const transport = conn.clientInfo.transport;
    acc[transport] = (acc[transport] || 0) + 1;
    return acc;
  }, {}),
  roomStats: Array.from(connectedUsers.values()).reduce((acc, conn) => {
    acc.totalRooms = new Set([...acc.totalRooms, ...conn.rooms]).size;
    acc.usersInRooms = conn.rooms.size > 0 ? acc.usersInRooms + 1 : acc.usersInRooms;
    return acc;
  }, { totalRooms: 0, usersInRooms: 0 })
});

export default {
  initSocketService,
  emitToUser,
  emitToRoom,
  handleRoomJoin,
  handleRoomLeave,
  getConnectionStats
};
