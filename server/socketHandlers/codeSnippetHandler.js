import { logger } from '../config/logger.js';
import { emitToRoom, emitToUser } from '../services/socketService.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { throttle } from 'lodash';

const SAVE_INTERVAL = 5000; // 5 seconds
const MAX_HISTORY_SIZE = 50;
const CACHE_TTL = 3600 * 24; // 24 hours

const activeSnippets = new Map();

export const registerCodeSnippetHandlers = (io) => {
  io.on('connection', (socket) => {
    // Join code snippet session
    socket.on('code:join', async (data) => {
      try {
        const { snippetId, userId } = data;
        await handleJoinSnippet(socket, snippetId, userId);
      } catch (error) {
        logger.error('Error joining code snippet:', error);
        socket.emit('code:error', {
          message: 'Failed to join code session',
          error: error.message
        });
      }
    });

    // Leave code snippet session
    socket.on('code:leave', async (data) => {
      try {
        const { snippetId } = data;
        await handleLeaveSnippet(socket, snippetId);
      } catch (error) {
        logger.error('Error leaving code snippet:', error);
      }
    });

    // Code changes
    socket.on('code:change', throttle((data) => {
      handleCodeChange(socket, data);
    }, 100));

    // Version control
    socket.on('code:save-version', async (data) => {
      try {
        await handleSaveVersion(socket, data);
      } catch (error) {
        logger.error('Error saving code version:', error);
        socket.emit('code:error', {
          message: 'Failed to save version',
          error: error.message
        });
      }
    });

    socket.on('code:restore-version', async (data) => {
      try {
        await handleRestoreVersion(socket, data);
      } catch (error) {
        logger.error('Error restoring code version:', error);
        socket.emit('code:error', {
          message: 'Failed to restore version',
          error: error.message
        });
      }
    });

    // Cursor and selection sync
    socket.on('code:cursor', (data) => {
      handleCursorUpdate(socket, data);
    });

    socket.on('code:selection', (data) => {
      handleSelectionUpdate(socket, data);
    });

    // Language and theme
    socket.on('code:set-language', (data) => {
      handleSetLanguage(socket, data);
    });

    socket.on('code:set-theme', (data) => {
      handleSetTheme(socket, data);
    });
  });
};

// Session management
const handleJoinSnippet = async (socket, snippetId, userId) => {
  try {
    await socket.join(snippetId);

    if (!activeSnippets.has(snippetId)) {
      const cachedSnippet = await cacheGet(`snippet:${snippetId}`);
      activeSnippets.set(snippetId, {
        participants: new Map(),
        content: cachedSnippet?.content || '',
        language: cachedSnippet?.language || 'javascript',
        theme: cachedSnippet?.theme || 'vs-dark',
        versions: cachedSnippet?.versions || [],
        lastSaved: Date.now()
      });
    }

    const snippet = activeSnippets.get(snippetId);
    snippet.participants.set(socket.id, {
      userId,
      socketId: socket.id,
      cursor: null,
      selection: null
    });

    // Send current state to new participant
    socket.emit('code:state', {
      content: snippet.content,
      language: snippet.language,
      theme: snippet.theme,
      versions: snippet.versions,
      participants: Array.from(snippet.participants.values())
    });

    // Notify others
    emitToRoom(snippetId, 'code:participant-joined', {
      participant: {
        userId,
        socketId: socket.id
      }
    }, socket.id);

    logger.info(`User ${userId} joined code snippet ${snippetId}`);
  } catch (error) {
    logger.error('Error in handleJoinSnippet:', error);
    throw error;
  }
};

const handleLeaveSnippet = async (socket, snippetId) => {
  try {
    const snippet = activeSnippets.get(snippetId);
    if (!snippet) return;

    snippet.participants.delete(socket.id);

    if (snippet.participants.size === 0) {
      // Save final state before cleanup
      await cacheSet(`snippet:${snippetId}`, {
        content: snippet.content,
        language: snippet.language,
        theme: snippet.theme,
        versions: snippet.versions
      }, CACHE_TTL);
      activeSnippets.delete(snippetId);
    } else {
      // Notify others
      emitToRoom(snippetId, 'code:participant-left', {
        socketId: socket.id
      });
    }

    await socket.leave(snippetId);
    logger.info(`User left code snippet ${snippetId}`);
  } catch (error) {
    logger.error('Error in handleLeaveSnippet:', error);
    throw error;
  }
};

// Code editing handlers
const handleCodeChange = (socket, { snippetId, changes, version }) => {
  const snippet = activeSnippets.get(snippetId);
  if (!snippet) return;

  // Apply changes to content
  snippet.content = applyChanges(snippet.content, changes);

  // Broadcast changes to others
  emitToRoom(snippetId, 'code:change', {
    changes,
    version,
    userId: socket.id
  }, socket.id);

  // Schedule auto-save
  scheduleAutoSave(snippetId);
};

const applyChanges = (content, changes) => {
  let result = content;
  changes.forEach(change => {
    const start = change.range.start;
    const end = change.range.end;
    const before = result.substring(0, start);
    const after = result.substring(end);
    result = before + change.text + after;
  });
  return result;
};

// Version control handlers
const handleSaveVersion = async (socket, { snippetId, name, description }) => {
  const snippet = activeSnippets.get(snippetId);
  if (!snippet) return;

  const version = {
    id: Date.now().toString(),
    name,
    description,
    content: snippet.content,
    createdBy: socket.id,
    timestamp: new Date().toISOString()
  };

  snippet.versions.unshift(version);
  if (snippet.versions.length > MAX_HISTORY_SIZE) {
    snippet.versions.pop();
  }

  // Notify all participants
  emitToRoom(snippetId, 'code:version-saved', { version });

  // Update cache
  await cacheSet(`snippet:${snippetId}`, {
    content: snippet.content,
    language: snippet.language,
    theme: snippet.theme,
    versions: snippet.versions
  }, CACHE_TTL);
};

const handleRestoreVersion = async (socket, { snippetId, versionId }) => {
  const snippet = activeSnippets.get(snippetId);
  if (!snippet) return;

  const version = snippet.versions.find(v => v.id === versionId);
  if (!version) return;

  snippet.content = version.content;

  // Notify all participants
  emitToRoom(snippetId, 'code:version-restored', {
    versionId,
    content: version.content
  });
};

// Cursor and selection handlers
const handleCursorUpdate = (socket, { snippetId, position }) => {
  const snippet = activeSnippets.get(snippetId);
  if (!snippet) return;

  const participant = snippet.participants.get(socket.id);
  if (participant) {
    participant.cursor = position;
    emitToRoom(snippetId, 'code:cursor', {
      socketId: socket.id,
      position
    }, socket.id);
  }
};

const handleSelectionUpdate = (socket, { snippetId, range }) => {
  const snippet = activeSnippets.get(snippetId);
  if (!snippet) return;

  const participant = snippet.participants.get(socket.id);
  if (participant) {
    participant.selection = range;
    emitToRoom(snippetId, 'code:selection', {
      socketId: socket.id,
      range
    }, socket.id);
  }
};

// Settings handlers
const handleSetLanguage = (socket, { snippetId, language }) => {
  const snippet = activeSnippets.get(snippetId);
  if (!snippet) return;

  snippet.language = language;
  emitToRoom(snippetId, 'code:language-changed', { language });
};

const handleSetTheme = (socket, { snippetId, theme }) => {
  const snippet = activeSnippets.get(snippetId);
  if (!snippet) return;

  snippet.theme = theme;
  emitToRoom(snippetId, 'code:theme-changed', { theme });
};

// Auto-save functionality
const autoSaveTimeouts = new Map();

const scheduleAutoSave = (snippetId) => {
  if (autoSaveTimeouts.has(snippetId)) {
    clearTimeout(autoSaveTimeouts.get(snippetId));
  }

  autoSaveTimeouts.set(snippetId, setTimeout(async () => {
    try {
      const snippet = activeSnippets.get(snippetId);
      if (!snippet) return;

      await cacheSet(`snippet:${snippetId}`, {
        content: snippet.content,
        language: snippet.language,
        theme: snippet.theme,
        versions: snippet.versions
      }, CACHE_TTL);

      snippet.lastSaved = Date.now();
      emitToRoom(snippetId, 'code:auto-saved', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error in auto-save:', error);
    }
  }, SAVE_INTERVAL));
};

export default {
  registerCodeSnippetHandlers
};
