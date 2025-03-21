import { logger } from '../config/logger.js';
import { emitToRoom, emitToUser } from '../services/socketService.js';

const whiteboardRooms = new Map();

export const registerWhiteboardHandlers = (io) => {
  io.on('connection', (socket) => {
    // Join whiteboard session
    socket.on('whiteboard:join', async (data) => {
      try {
        const { roomId, userInfo } = data;
        await handleJoinWhiteboard(socket, roomId, userInfo);
      } catch (error) {
        logger.error('Error joining whiteboard:', error);
        socket.emit('whiteboard:error', {
          message: 'Failed to join whiteboard session',
          error: error.message
        });
      }
    });

    // Leave whiteboard session
    socket.on('whiteboard:leave', async (data) => {
      try {
        const { roomId } = data;
        await handleLeaveWhiteboard(socket, roomId);
      } catch (error) {
        logger.error('Error leaving whiteboard:', error);
      }
    });

    // Drawing events
    socket.on('whiteboard:draw', (data) => {
      handleDraw(socket, data);
    });

    socket.on('whiteboard:draw-end', (data) => {
      handleDrawEnd(socket, data);
    });

    // Shape events
    socket.on('whiteboard:add-shape', (data) => {
      handleAddShape(socket, data);
    });

    socket.on('whiteboard:modify-shape', (data) => {
      handleModifyShape(socket, data);
    });

    socket.on('whiteboard:delete-shape', (data) => {
      handleDeleteShape(socket, data);
    });

    // Tool selection
    socket.on('whiteboard:select-tool', (data) => {
      handleToolSelect(socket, data);
    });

    // Canvas operations
    socket.on('whiteboard:clear', (data) => {
      handleClear(socket, data);
    });

    socket.on('whiteboard:undo', (data) => {
      handleUndo(socket, data);
    });

    socket.on('whiteboard:redo', (data) => {
      handleRedo(socket, data);
    });

    // Background operations
    socket.on('whiteboard:set-background', (data) => {
      handleSetBackground(socket, data);
    });
  });
};

// Room management
const handleJoinWhiteboard = async (socket, roomId, userInfo) => {
  try {
    await socket.join(roomId);

    if (!whiteboardRooms.has(roomId)) {
      whiteboardRooms.set(roomId, {
        participants: new Map(),
        shapes: [],
        background: null,
        history: [],
        historyIndex: -1
      });
    }

    const room = whiteboardRooms.get(roomId);
    room.participants.set(socket.id, {
      ...userInfo,
      socketId: socket.id,
      tool: 'pencil',
      color: '#000000',
      lineWidth: 2
    });

    // Notify others
    emitToRoom(roomId, 'whiteboard:participant-joined', {
      participant: room.participants.get(socket.id)
    }, socket.id);

    // Send current state to new participant
    socket.emit('whiteboard:state', {
      participants: Array.from(room.participants.values()),
      shapes: room.shapes,
      background: room.background
    });

    logger.info(`User ${socket.id} joined whiteboard ${roomId}`);
  } catch (error) {
    logger.error('Error in handleJoinWhiteboard:', error);
    throw error;
  }
};

const handleLeaveWhiteboard = async (socket, roomId) => {
  try {
    const room = whiteboardRooms.get(roomId);
    if (!room) return;

    room.participants.delete(socket.id);

    if (room.participants.size === 0) {
      whiteboardRooms.delete(roomId);
    } else {
      emitToRoom(roomId, 'whiteboard:participant-left', {
        participantId: socket.id
      });
    }

    await socket.leave(roomId);
    logger.info(`User ${socket.id} left whiteboard ${roomId}`);
  } catch (error) {
    logger.error('Error in handleLeaveWhiteboard:', error);
    throw error;
  }
};

// Drawing handlers
const handleDraw = (socket, { roomId, path, tool, color, lineWidth }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room) return;

  const drawData = {
    userId: socket.id,
    path,
    tool,
    color,
    lineWidth,
    timestamp: Date.now()
  };

  emitToRoom(roomId, 'whiteboard:draw', drawData, socket.id);
};

const handleDrawEnd = (socket, { roomId, path, tool, color, lineWidth }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room) return;

  const shapeData = {
    id: Date.now().toString(),
    userId: socket.id,
    type: 'path',
    path,
    tool,
    color,
    lineWidth,
    timestamp: Date.now()
  };

  room.shapes.push(shapeData);
  updateHistory(room, shapeData);

  emitToRoom(roomId, 'whiteboard:draw-end', shapeData, socket.id);
};

// Shape handlers
const handleAddShape = (socket, { roomId, shape }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room) return;

  const shapeData = {
    ...shape,
    id: Date.now().toString(),
    userId: socket.id,
    timestamp: Date.now()
  };

  room.shapes.push(shapeData);
  updateHistory(room, shapeData);

  emitToRoom(roomId, 'whiteboard:shape-added', shapeData, socket.id);
};

const handleModifyShape = (socket, { roomId, shapeId, changes }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room) return;

  const shapeIndex = room.shapes.findIndex(s => s.id === shapeId);
  if (shapeIndex === -1) return;

  const updatedShape = {
    ...room.shapes[shapeIndex],
    ...changes,
    timestamp: Date.now()
  };

  room.shapes[shapeIndex] = updatedShape;
  updateHistory(room, { type: 'modify', shape: updatedShape });

  emitToRoom(roomId, 'whiteboard:shape-modified', {
    shapeId,
    changes
  }, socket.id);
};

const handleDeleteShape = (socket, { roomId, shapeId }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room) return;

  const shapeIndex = room.shapes.findIndex(s => s.id === shapeId);
  if (shapeIndex === -1) return;

  const deletedShape = room.shapes.splice(shapeIndex, 1)[0];
  updateHistory(room, { type: 'delete', shape: deletedShape });

  emitToRoom(roomId, 'whiteboard:shape-deleted', { shapeId }, socket.id);
};

// Tool selection handler
const handleToolSelect = (socket, { roomId, tool, options }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room) return;

  const participant = room.participants.get(socket.id);
  if (participant) {
    Object.assign(participant, { tool, ...options });
    emitToRoom(roomId, 'whiteboard:tool-selected', {
      participantId: socket.id,
      tool,
      options
    });
  }
};

// Canvas operation handlers
const handleClear = (socket, { roomId }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room) return;

  updateHistory(room, { type: 'clear', shapes: [...room.shapes] });
  room.shapes = [];

  emitToRoom(roomId, 'whiteboard:cleared', { userId: socket.id });
};

const handleUndo = (socket, { roomId }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room || room.historyIndex < 0) return;

  const action = room.history[room.historyIndex];
  room.historyIndex--;

  applyUndoAction(room, action);
  emitToRoom(roomId, 'whiteboard:undone', {
    userId: socket.id,
    shapes: room.shapes
  });
};

const handleRedo = (socket, { roomId }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room || room.historyIndex >= room.history.length - 1) return;

  room.historyIndex++;
  const action = room.history[room.historyIndex];

  applyRedoAction(room, action);
  emitToRoom(roomId, 'whiteboard:redone', {
    userId: socket.id,
    shapes: room.shapes
  });
};

// Background handler
const handleSetBackground = (socket, { roomId, background }) => {
  const room = whiteboardRooms.get(roomId);
  if (!room) return;

  room.background = background;
  emitToRoom(roomId, 'whiteboard:background-set', {
    userId: socket.id,
    background
  });
};

// History management
const updateHistory = (room, action) => {
  room.historyIndex++;
  room.history = room.history.slice(0, room.historyIndex);
  room.history.push(action);
};

const applyUndoAction = (room, action) => {
  if (action.type === 'clear') {
    room.shapes = action.shapes;
  } else if (action.type === 'delete') {
    room.shapes.push(action.shape);
  } else if (action.type === 'modify') {
    const index = room.shapes.findIndex(s => s.id === action.shape.id);
    if (index !== -1) {
      room.shapes[index] = action.shape;
    }
  } else {
    const index = room.shapes.findIndex(s => s.id === action.id);
    if (index !== -1) {
      room.shapes.splice(index, 1);
    }
  }
};

const applyRedoAction = (room, action) => {
  if (action.type === 'clear') {
    room.shapes = [];
  } else if (action.type === 'delete') {
    const index = room.shapes.findIndex(s => s.id === action.shape.id);
    if (index !== -1) {
      room.shapes.splice(index, 1);
    }
  } else if (action.type === 'modify') {
    const index = room.shapes.findIndex(s => s.id === action.shape.id);
    if (index !== -1) {
      room.shapes[index] = action.shape;
    }
  } else {
    room.shapes.push(action);
  }
};

export default {
  registerWhiteboardHandlers
};
