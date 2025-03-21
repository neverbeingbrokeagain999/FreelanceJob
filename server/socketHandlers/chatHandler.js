import { logger } from '../config/logger.js';
import { emitToRoom, emitToUser } from '../services/socketService.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const TYPING_TIMEOUT = 3000; // 3 seconds
const MESSAGE_PAGE_SIZE = 50;
const CACHE_TTL = 3600; // 1 hour

const activeChats = new Map();
const typingUsers = new Map();

export const registerChatHandlers = (io) => {
  io.on('connection', (socket) => {
    // Join chat room
    socket.on('chat:join', async (data) => {
      try {
        const { chatId, userId } = data;
        await handleJoinChat(socket, chatId, userId);
      } catch (error) {
        logger.error('Error joining chat:', error);
        socket.emit('chat:error', {
          message: 'Failed to join chat',
          error: error.message
        });
      }
    });

    // Leave chat room
    socket.on('chat:leave', async (data) => {
      try {
        const { chatId } = data;
        await handleLeaveChat(socket, chatId);
      } catch (error) {
        logger.error('Error leaving chat:', error);
      }
    });

    // Send message
    socket.on('chat:message', async (data) => {
      try {
        await handleNewMessage(socket, data);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('chat:error', {
          message: 'Failed to send message',
          error: error.message
        });
      }
    });

    // Message status updates
    socket.on('chat:message-delivered', (data) => {
      handleMessageDelivered(socket, data);
    });

    socket.on('chat:message-read', (data) => {
      handleMessageRead(socket, data);
    });

    // Typing indicators
    socket.on('chat:typing-start', (data) => {
      handleTypingStart(socket, data);
    });

    socket.on('chat:typing-stop', (data) => {
      handleTypingStop(socket, data);
    });

    // Load message history
    socket.on('chat:load-history', async (data) => {
      try {
        const { chatId, page = 1 } = data;
        await handleLoadHistory(socket, chatId, page);
      } catch (error) {
        logger.error('Error loading chat history:', error);
        socket.emit('chat:error', {
          message: 'Failed to load chat history',
          error: error.message
        });
      }
    });
  });
};

// Chat room management
const handleJoinChat = async (socket, chatId, userId) => {
  try {
    await socket.join(chatId);

    if (!activeChats.has(chatId)) {
      activeChats.set(chatId, {
        participants: new Map(),
        messages: []
      });
    }

    const chat = activeChats.get(chatId);
    chat.participants.set(socket.id, {
      userId,
      socketId: socket.id,
      lastSeen: new Date()
    });

    // Load recent messages from cache
    const cachedMessages = await cacheGet(`chat:${chatId}:messages`);
    if (cachedMessages) {
      socket.emit('chat:history', {
        messages: cachedMessages.slice(-MESSAGE_PAGE_SIZE)
      });
    }

    // Notify others
    emitToRoom(chatId, 'chat:user-joined', {
      userId,
      timestamp: new Date().toISOString()
    }, socket.id);

    logger.info(`User ${userId} joined chat ${chatId}`);
  } catch (error) {
    logger.error('Error in handleJoinChat:', error);
    throw error;
  }
};

const handleLeaveChat = async (socket, chatId) => {
  try {
    const chat = activeChats.get(chatId);
    if (!chat) return;

    const participant = chat.participants.get(socket.id);
    if (participant) {
      chat.participants.delete(socket.id);
      clearTypingTimeout(socket.id, chatId);

      // Notify others
      emitToRoom(chatId, 'chat:user-left', {
        userId: participant.userId,
        timestamp: new Date().toISOString()
      });
    }

    if (chat.participants.size === 0) {
      activeChats.delete(chatId);
    }

    await socket.leave(chatId);
    logger.info(`User left chat ${chatId}`);
  } catch (error) {
    logger.error('Error in handleLeaveChat:', error);
    throw error;
  }
};

// Message handling
const handleNewMessage = async (socket, { chatId, message }) => {
  const chat = activeChats.get(chatId);
  if (!chat) return;

  const participant = chat.participants.get(socket.id);
  if (!participant) return;

  const messageData = {
    id: Date.now().toString(),
    sender: participant.userId,
    content: message,
    timestamp: new Date().toISOString(),
    status: 'sent'
  };

  // Add to chat history
  chat.messages.push(messageData);
  if (chat.messages.length > MESSAGE_PAGE_SIZE * 2) {
    chat.messages = chat.messages.slice(-MESSAGE_PAGE_SIZE);
  }

  // Update cache
  await cacheSet(`chat:${chatId}:messages`, chat.messages, CACHE_TTL);

  // Clear typing indicator
  clearTypingTimeout(socket.id, chatId);

  // Broadcast message
  emitToRoom(chatId, 'chat:message', messageData);
  logger.info(`Message sent in chat ${chatId}`);
};

const handleMessageDelivered = (socket, { chatId, messageId }) => {
  const chat = activeChats.get(chatId);
  if (!chat) return;

  const message = chat.messages.find(m => m.id === messageId);
  if (message) {
    message.status = 'delivered';
    emitToRoom(chatId, 'chat:message-status', {
      messageId,
      status: 'delivered',
      timestamp: new Date().toISOString()
    });
  }
};

const handleMessageRead = (socket, { chatId, messageId }) => {
  const chat = activeChats.get(chatId);
  if (!chat) return;

  const message = chat.messages.find(m => m.id === messageId);
  if (message) {
    message.status = 'read';
    emitToRoom(chatId, 'chat:message-status', {
      messageId,
      status: 'read',
      timestamp: new Date().toISOString()
    });
  }
};

// Typing indicators
const handleTypingStart = (socket, { chatId }) => {
  const chat = activeChats.get(chatId);
  if (!chat) return;

  const participant = chat.participants.get(socket.id);
  if (!participant) return;

  // Set typing timeout
  if (typingUsers.has(socket.id)) {
    clearTimeout(typingUsers.get(socket.id));
  }
  typingUsers.set(socket.id, setTimeout(() => {
    handleTypingStop(socket, { chatId });
  }, TYPING_TIMEOUT));

  // Notify others
  emitToRoom(chatId, 'chat:typing', {
    userId: participant.userId,
    isTyping: true
  }, socket.id);
};

const handleTypingStop = (socket, { chatId }) => {
  const chat = activeChats.get(chatId);
  if (!chat) return;

  const participant = chat.participants.get(socket.id);
  if (!participant) return;

  clearTypingTimeout(socket.id, chatId);

  // Notify others
  emitToRoom(chatId, 'chat:typing', {
    userId: participant.userId,
    isTyping: false
  }, socket.id);
};

const clearTypingTimeout = (socketId, chatId) => {
  if (typingUsers.has(socketId)) {
    clearTimeout(typingUsers.get(socketId));
    typingUsers.delete(socketId);
  }
};

// History loading
const handleLoadHistory = async (socket, chatId, page) => {
  try {
    const cachedMessages = await cacheGet(`chat:${chatId}:messages`);
    if (!cachedMessages) {
      socket.emit('chat:history', { messages: [] });
      return;
    }

    const start = Math.max(0, cachedMessages.length - (page * MESSAGE_PAGE_SIZE));
    const end = Math.max(0, cachedMessages.length - ((page - 1) * MESSAGE_PAGE_SIZE));
    const messages = cachedMessages.slice(start, end).reverse();

    socket.emit('chat:history', { 
      messages,
      hasMore: start > 0
    });
  } catch (error) {
    logger.error('Error loading chat history:', error);
    throw error;
  }
};

export default {
  registerChatHandlers
};
