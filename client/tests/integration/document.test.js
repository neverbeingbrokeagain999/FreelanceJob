import request from 'supertest';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import mongoose from 'mongoose';
import app from '../../server/app.js';
import { registerDocumentHandlers } from '../../server/socketHandlers/documentHandler.js';
import Document from '../../server/models/Document.js';
import { connectDB } from '../../server/config/database.js';
import { generateToken } from '../../server/utils/auth.js';

describe('Document Collaboration Integration Tests', () => {
  let httpServer;
  let io;
  let clientSocket1;
  let clientSocket2;
  let port;
  let token;
  let documentId;

  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // Create HTTP server
    httpServer = createServer(app);
    
    // Setup Socket.IO server
    io = new Server(httpServer);
    registerDocumentHandlers(io);

    // Start server
    port = 4000;
    httpServer.listen(port);

    // Create test document
    const doc = await Document.create({
      title: 'Test Document',
      content: 'Initial content',
      ownerId: new mongoose.Types.ObjectId(),
      collaborators: []
    });
    documentId = doc._id.toString();

    // Generate auth token for test
    token = generateToken({ id: 'test-user-id' });
  });

  beforeEach(async () => {
    // Setup client sockets
    const options = {
      'transports': ['websocket'],
      'extraHeaders': {
        'Authorization': `Bearer ${token}`
      }
    };

    clientSocket1 = Client(`http://localhost:${port}`, options);
    clientSocket2 = Client(`http://localhost:${port}`, options);

    await Promise.all([
      new Promise(resolve => clientSocket1.on('connect', resolve)),
      new Promise(resolve => clientSocket2.on('connect', resolve))
    ]);
  });

  afterEach(() => {
    clientSocket1.close();
    clientSocket2.close();
  });

  afterAll(async () => {
    await Document.deleteMany({});
    await mongoose.connection.close();
    httpServer.close();
  });

  test('users can join document session and receive initial state', done => {
    const userInfo = { name: 'Test User' };

    clientSocket1.emit('document:join', { documentId, userInfo });

    clientSocket1.on('document:state', data => {
      expect(data).toHaveProperty('content');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('metadata');
      expect(data).toHaveProperty('participants');
      done();
    });
  });

  test('users receive notifications when others join/leave', done => {
    const user1Info = { name: 'User 1' };
    const user2Info = { name: 'User 2' };

    clientSocket1.emit('document:join', { documentId, userInfo: user1Info });

    clientSocket1.on('document:participant-joined', data => {
      expect(data.participant.userId).toBeTruthy();
      expect(data.participant.socketId).toBeTruthy();
      done();
    });

    setTimeout(() => {
      clientSocket2.emit('document:join', { documentId, userInfo: user2Info });
    }, 100);
  });

  test('operations are broadcasted to all participants', done => {
    const operation = {
      type: 'insert',
      position: 0,
      chars: 'Hello, '
    };

    let joinCount = 0;
    const handleJoined = () => {
      joinCount++;
      if (joinCount === 2) {
        // Both clients have joined, now send operation
        clientSocket1.emit('document:operation', {
          documentId,
          operation,
          baseVersion: 0
        });
      }
    };

    clientSocket1.emit('document:join', { documentId, userInfo: { name: 'User 1' }});
    clientSocket2.emit('document:join', { documentId, userInfo: { name: 'User 2' }});

    clientSocket1.on('document:state', handleJoined);
    clientSocket2.on('document:state', handleJoined);

    clientSocket2.on('document:operation', data => {
      expect(data.operation).toBeDefined();
      expect(data.version).toBeDefined();
      expect(data.userId).toBeDefined();
      done();
    });
  });

  test('cursor positions are synced between users', done => {
    const position = { line: 1, column: 5 };

    clientSocket1.emit('document:join', { documentId, userInfo: { name: 'User 1' }});
    clientSocket2.emit('document:join', { documentId, userInfo: { name: 'User 2' }});

    clientSocket2.on('document:cursor', data => {
      expect(data.socketId).toBeTruthy();
      expect(data.position).toEqual(position);
      done();
    });

    setTimeout(() => {
      clientSocket1.emit('document:cursor', { documentId, position });
    }, 100);
  });

  test('selections are synced between users', done => {
    const range = { start: { line: 1, column: 0 }, end: { line: 1, column: 5 }};

    clientSocket1.emit('document:join', { documentId, userInfo: { name: 'User 1' }});
    clientSocket2.emit('document:join', { documentId, userInfo: { name: 'User 2' }});

    clientSocket2.on('document:selection', data => {
      expect(data.socketId).toBeTruthy();
      expect(data.range).toEqual(range);
      done();
    });

    setTimeout(() => {
      clientSocket1.emit('document:selection', { documentId, range });
    }, 100);
  });

  test('document state is saved periodically', done => {
    const operation = {
      type: 'insert',
      position: 0,
      chars: 'Updated content'
    };

    clientSocket1.emit('document:join', { documentId, userInfo: { name: 'User 1' }});

    clientSocket1.emit('document:operation', {
      documentId,
      operation,
      baseVersion: 0
    });

    clientSocket1.on('document:saved', async () => {
      const doc = await Document.findById(documentId);
      expect(doc.content).toContain('Updated content');
      done();
    });
  });

  test('concurrent edits maintain consistency', done => {
    const operation1 = {
      type: 'insert',
      position: 0,
      chars: 'Hello'
    };

    const operation2 = {
      type: 'insert',
      position: 0,
      chars: 'World'
    };

    let finalContent1;
    let finalContent2;

    clientSocket1.emit('document:join', { documentId, userInfo: { name: 'User 1' }});
    clientSocket2.emit('document:join', { documentId, userInfo: { name: 'User 2' }});

    clientSocket1.on('document:operation', () => {
      if (finalContent1 && finalContent2) {
        expect(finalContent1).toEqual(finalContent2);
        done();
      }
    });

    clientSocket2.on('document:operation', () => {
      if (finalContent1 && finalContent2) {
        expect(finalContent1).toEqual(finalContent2);
        done();
      }
    });

    setTimeout(() => {
      clientSocket1.emit('document:operation', {
        documentId,
        operation: operation1,
        baseVersion: 0
      });

      clientSocket2.emit('document:operation', {
        documentId,
        operation: operation2,
        baseVersion: 0
      });
    }, 100);
  });
});
