import { logger } from '../config/logger.js';
import { emitToRoom, emitToUser } from '../services/socketService.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { transformOperation, serializeOperation, deserializeOperation } from '../utils/operationalTransform.js';

const SAVE_INTERVAL = 5000; // 5 seconds
const MAX_HISTORY_SIZE = 100;
const CACHE_TTL = 3600 * 24; // 24 hours

const activeDocuments = new Map();
const saveTimeouts = new Map();

export const registerDocumentHandlers = (io) => {
  io.on('connection', (socket) => {
    // Join document session
    socket.on('document:join', async (data) => {
      try {
        const { documentId, userId } = data;
        await handleJoinDocument(socket, documentId, userId);
      } catch (error) {
        logger.error('Error joining document:', error);
        socket.emit('document:error', {
          message: 'Failed to join document session',
          error: error.message
        });
      }
    });

    // Leave document session
    socket.on('document:leave', async (data) => {
      try {
        const { documentId } = data;
        await handleLeaveDocument(socket, documentId);
      } catch (error) {
        logger.error('Error leaving document:', error);
      }
    });

    // Document operations
    socket.on('document:operation', async (data) => {
      try {
        await handleOperation(socket, data);
      } catch (error) {
        logger.error('Error handling document operation:', error);
        socket.emit('document:error', {
          message: 'Failed to apply operation',
          error: error.message
        });
      }
    });

    // Cursor position updates
    socket.on('document:cursor', (data) => {
      handleCursorUpdate(socket, data);
    });

    // Selection updates
    socket.on('document:selection', (data) => {
      handleSelectionUpdate(socket, data);
    });

    // Document metadata updates
    socket.on('document:metadata', async (data) => {
      try {
        await handleMetadataUpdate(socket, data);
      } catch (error) {
        logger.error('Error updating document metadata:', error);
      }
    });
  });
};

// Session management
const handleJoinDocument = async (socket, documentId, userId) => {
  try {
    await socket.join(documentId);

    if (!activeDocuments.has(documentId)) {
      const cachedDoc = await cacheGet(`document:${documentId}`);
      activeDocuments.set(documentId, {
        participants: new Map(),
        content: cachedDoc?.content || '',
        version: cachedDoc?.version || 0,
        operations: [],
        metadata: cachedDoc?.metadata || {
          title: 'Untitled Document',
          lastModified: new Date().toISOString()
        }
      });
    }

    const doc = activeDocuments.get(documentId);
    doc.participants.set(socket.id, {
      userId,
      socketId: socket.id,
      cursor: null,
      selection: null
    });

    // Send current state to new participant
    socket.emit('document:state', {
      content: doc.content,
      version: doc.version,
      metadata: doc.metadata,
      participants: Array.from(doc.participants.values())
    });

    // Notify others
    emitToRoom(documentId, 'document:participant-joined', {
      participant: {
        userId,
        socketId: socket.id
      }
    }, socket.id);

    logger.info(`User ${userId} joined document ${documentId}`);
  } catch (error) {
    logger.error('Error in handleJoinDocument:', error);
    throw error;
  }
};

const handleLeaveDocument = async (socket, documentId) => {
  try {
    const doc = activeDocuments.get(documentId);
    if (!doc) return;

    doc.participants.delete(socket.id);

    if (doc.participants.size === 0) {
      // Save final state before cleanup
      await saveDocument(documentId);
      activeDocuments.delete(documentId);
    } else {
      // Notify others
      emitToRoom(documentId, 'document:participant-left', {
        socketId: socket.id
      });
    }

    await socket.leave(documentId);
    logger.info(`User left document ${documentId}`);
  } catch (error) {
    logger.error('Error in handleLeaveDocument:', error);
    throw error;
  }
};

// Operation handling
const handleOperation = async (socket, { documentId, operation, baseVersion }) => {
  const doc = activeDocuments.get(documentId);
  if (!doc) return;

  // Deserialize operation
  const op = deserializeOperation(operation);

  // Transform operation against concurrent operations
  const concurrentOps = doc.operations.slice(baseVersion);
  const transformedOp = concurrentOps.reduce((op, concurrentOp) => 
    transformOperation(op, concurrentOp), op);

  // Apply operation
  doc.content = applyOperation(doc.content, transformedOp);
  doc.version++;
  doc.operations.push(transformedOp);

  // Update metadata
  doc.metadata.lastModified = new Date().toISOString();

  // Broadcast to others
  emitToRoom(documentId, 'document:operation', {
    operation: serializeOperation(transformedOp),
    version: doc.version,
    userId: socket.id
  }, socket.id);

  // Schedule auto-save
  scheduleDocumentSave(documentId);
};

const applyOperation = (content, operation) => {
  switch (operation.type) {
    case 'insert':
      return content.slice(0, operation.position) +
             operation.chars +
             content.slice(operation.position);
    
    case 'delete':
      return content.slice(0, operation.position) +
             content.slice(operation.position + operation.count);
    
    case 'format':
      // Apply formatting (if implementing rich text)
      return content;
    
    default:
      return content;
  }
};

// Cursor and selection handling
const handleCursorUpdate = (socket, { documentId, position }) => {
  const doc = activeDocuments.get(documentId);
  if (!doc) return;

  const participant = doc.participants.get(socket.id);
  if (participant) {
    participant.cursor = position;
    emitToRoom(documentId, 'document:cursor', {
      socketId: socket.id,
      position
    }, socket.id);
  }
};

const handleSelectionUpdate = (socket, { documentId, range }) => {
  const doc = activeDocuments.get(documentId);
  if (!doc) return;

  const participant = doc.participants.get(socket.id);
  if (participant) {
    participant.selection = range;
    emitToRoom(documentId, 'document:selection', {
      socketId: socket.id,
      range
    }, socket.id);
  }
};

// Metadata handling
const handleMetadataUpdate = async (socket, { documentId, metadata }) => {
  const doc = activeDocuments.get(documentId);
  if (!doc) return;

  Object.assign(doc.metadata, metadata);

  // Broadcast update
  emitToRoom(documentId, 'document:metadata', {
    metadata: doc.metadata,
    userId: socket.id
  });

  // Schedule save
  scheduleDocumentSave(documentId);
};

// Auto-save functionality
const scheduleDocumentSave = (documentId) => {
  if (saveTimeouts.has(documentId)) {
    clearTimeout(saveTimeouts.get(documentId));
  }

  saveTimeouts.set(documentId, setTimeout(async () => {
    try {
      await saveDocument(documentId);
    } catch (error) {
      logger.error('Error in document auto-save:', error);
    }
  }, SAVE_INTERVAL));
};

const saveDocument = async (documentId) => {
  const doc = activeDocuments.get(documentId);
  if (!doc) return;

  // Trim operation history
  if (doc.operations.length > MAX_HISTORY_SIZE) {
    doc.operations = doc.operations.slice(-MAX_HISTORY_SIZE);
  }

  // Save to cache
  await cacheSet(`document:${documentId}`, {
    content: doc.content,
    version: doc.version,
    metadata: doc.metadata
  }, CACHE_TTL);

  // Notify participants
  emitToRoom(documentId, 'document:saved', {
    timestamp: new Date().toISOString()
  });

  logger.info(`Document ${documentId} saved`);
};

export default {
  registerDocumentHandlers
};
