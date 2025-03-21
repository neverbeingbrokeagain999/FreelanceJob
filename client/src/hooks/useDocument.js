import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';

const useDocument = (documentId) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [cursors, setCursors] = useState(new Map());
  const [activeUsers, setActiveUsers] = useState(new Map());
  const [locks, setLocks] = useState(new Map());
  
  // Keep track of pending operations
  const pendingOps = useRef([]);
  const changeBuffer = useRef([]);
  const bufferTimeout = useRef(null);

  // Initialize document connection
  useEffect(() => {
    if (!socket || !documentId) return;

    // Join document room
    socket.emit('document:join', { documentId });

    // Handle successful join
    const handleJoined = ({ document, state, cursors, presence, isOwner, canEdit }) => {
      setDocument(document);
      setContent(state.content);
      setVersion(state.version);
      setCursors(new Map(cursors));
      setActiveUsers(new Map(presence));
      setStatus('connected');
      setError(null);
    };

    // Handle incoming operations
    const handleOperation = ({ operation, userId, version: newVersion }) => {
      if (userId !== user._id) {
        setContent(prevContent => {
          try {
            const result = applyOperation(prevContent, operation);
            setVersion(newVersion);
            return result;
          } catch (err) {
            console.error('Error applying operation:', err);
            return prevContent;
          }
        });
      }
    };

    // Handle cursor updates
    const handleCursor = ({ userId, position }) => {
      if (userId !== user._id) {
        setCursors(prev => {
          const next = new Map(prev);
          next.set(userId, position);
          return next;
        });
      }
    };

    // Handle section locks
    const handleLocked = ({ lockId, userId, range, expiresAt }) => {
      setLocks(prev => {
        const next = new Map(prev);
        next.set(lockId, { userId, range, expiresAt });
        return next;
      });
    };

    const handleUnlocked = ({ lockId }) => {
      setLocks(prev => {
        const next = new Map(prev);
        next.delete(lockId);
        return next;
      });
    };

    // Handle user presence
    const handleUserJoined = ({ userId, user }) => {
      setActiveUsers(prev => {
        const next = new Map(prev);
        next.set(userId, { user, status: 'active', lastActivity: new Date() });
        return next;
      });
    };

    const handleUserLeft = ({ userId }) => {
      setActiveUsers(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });

      setCursors(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    const handlePresenceUpdate = ({ userId, status, timestamp }) => {
      setActiveUsers(prev => {
        const next = new Map(prev);
        const existing = next.get(userId);
        if (existing) {
          next.set(userId, {
            ...existing,
            status,
            lastActivity: new Date(timestamp)
          });
        }
        return next;
      });
    };

    // Handle errors
    const handleError = (error) => {
      setError(error);
      setStatus('error');
    };

    // Subscribe to document events
    socket.on('document:joined', handleJoined);
    socket.on('document:operation', handleOperation);
    socket.on('document:cursor', handleCursor);
    socket.on('document:locked', handleLocked);
    socket.on('document:unlocked', handleUnlocked);
    socket.on('document:user-joined', handleUserJoined);
    socket.on('document:user-left', handleUserLeft);
    socket.on('document:presence-updated', handlePresenceUpdate);
    socket.on('document:error', handleError);

    // Cleanup
    return () => {
      socket.emit('document:leave', { documentId });
      socket.off('document:joined', handleJoined);
      socket.off('document:operation', handleOperation);
      socket.off('document:cursor', handleCursor);
      socket.off('document:locked', handleLocked);
      socket.off('document:unlocked', handleUnlocked);
      socket.off('document:user-joined', handleUserJoined);
      socket.off('document:user-left', handleUserLeft);
      socket.off('document:presence-updated', handlePresenceUpdate);
      socket.off('document:error', handleError);
    };
  }, [socket, documentId, user._id]);

  // Handle text changes with buffering
  const handleChange = useCallback((change) => {
    if (!socket || status !== 'connected') return;

    changeBuffer.current.push(change);

    // Clear existing timeout
    if (bufferTimeout.current) {
      clearTimeout(bufferTimeout.current);
    }

    // Set new timeout to process buffer
    bufferTimeout.current = setTimeout(() => {
      if (changeBuffer.current.length > 0) {
        const operation = {
          type: 'insert',
          changes: [...changeBuffer.current]
        };

        // Send operation to server
        socket.emit('document:operation', {
          documentId,
          operation
        });

        // Add to pending operations
        pendingOps.current.push(operation);

        // Clear buffer
        changeBuffer.current = [];
      }
    }, 300); // 300ms buffer window
  }, [socket, status, documentId]);

  // Update cursor position
  const updateCursor = useCallback((position) => {
    if (!socket || status !== 'connected') return;

    socket.emit('document:cursor', {
      documentId,
      position
    });
  }, [socket, status, documentId]);

  // Acquire section lock
  const acquireLock = useCallback(async (range) => {
    if (!socket || status !== 'connected') return null;

    return new Promise((resolve) => {
      socket.emit('document:lock', {
        documentId,
        range
      });

      const handleLockAcquired = ({ lockId }) => {
        socket.off('document:lock-acquired', handleLockAcquired);
        resolve(lockId);
      };

      socket.once('document:lock-acquired', handleLockAcquired);
    });
  }, [socket, status, documentId]);

  // Release section lock
  const releaseLock = useCallback((lockId) => {
    if (!socket || status !== 'connected') return;

    socket.emit('document:unlock', {
      documentId,
      lockId
    });
  }, [socket, status, documentId]);

  // Update presence status
  const updatePresence = useCallback((status) => {
    if (!socket) return;

    socket.emit('document:presence', {
      documentId,
      status
    });
  }, [socket, documentId]);

  // Check if a range is locked
  const isRangeLocked = useCallback((range) => {
    for (const lock of locks.values()) {
      if (lock.userId !== user._id && // Not locked by current user
          !(range.end <= lock.range.start || range.start >= lock.range.end)) { // Overlaps
        return true;
      }
    }
    return false;
  }, [locks, user._id]);

  return {
    document,
    content,
    version,
    status,
    error,
    cursors,
    activeUsers,
    locks,
    handleChange,
    updateCursor,
    acquireLock,
    releaseLock,
    updatePresence,
    isRangeLocked
  };
};

export default useDocument;
