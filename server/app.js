import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from './models/User.js';
import logger from './config/logger.js';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Route imports
import authRoutes from './routes/auth.js';
import clientRoutes from './routes/client.js';
import userRoutes from './routes/user.js';
import jobRoutes from './routes/job.js';
import chatRoutes from './routes/chat.js';
import directMessageRoutes from './routes/directMessage.js';
import directContractRoutes from './routes/directContract.js';
import documentRoutes from './routes/document.js';
import escrowRoutes from './routes/escrow.js';
import jobAlertRoutes from './routes/jobAlert.js';
import jobMatchRoutes from './routes/jobMatch.js';
import meetingRoutes from './routes/meeting.js';
import milestoneRoutes from './routes/milestone.js';
import notificationRoutes from './routes/notification.js';
import paymentRoutes from './routes/payment.js';
import reviewRoutes from './routes/review.js';
import timeTrackingRoutes from './routes/workDiary.js';
import transactionRoutes from './routes/transaction.js';
import twoFactorRoutes from './routes/twoFactor.js';
import whiteboardRoutes from './routes/whiteboard.js';
import codeSnippetRoutes from './routes/codeSnippet.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://[::1]:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }
});

app.get('/',(req,res)=>{res.send("welcome")})

// Socket.io middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    // Get user data and attach to socket
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.user.name} (${socket.user.id})`);
  
  // Join user's room for private messages
  socket.join(socket.user.id);

  // Update user's online status
  User.findByIdAndUpdate(socket.user.id, {
    isOnline: true,
    lastSeen: new Date()
  }).catch(error => {
    logger.error('Error updating user online status:', error);
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    logger.info(`User disconnected: ${socket.user.name} (${socket.user.id})`);
    
    // Update user's last seen
    await User.findByIdAndUpdate(socket.user.id, {
      isOnline: false,
      lastSeen: new Date()
    }).catch(error => {
      logger.error('Error updating user offline status:', error);
    });
  });

  // Handle typing indicators
  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(chatId).emit('userTyping', {
      userId: socket.user.id,
      name: socket.user.name,
      isTyping
    });
  });

  // Handle chat room joins
  socket.on('joinRoom', (chatId) => {
    socket.join(chatId);
    logger.debug(`User ${socket.user.id} joined room ${chatId}`);
  });

  // Handle chat room leaves
  socket.on('leaveRoom', (chatId) => {
    socket.leave(chatId);
    logger.debug(`User ${socket.user.id} left room ${chatId}`);
  });
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Essential middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://[::1]:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Apply rate limiting to API routes
app.use('/api/', limiter);
*/

// Basic routes for testing
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Mount API routes
app.use('/api/v1/auth', authRoutes); // Auth routes
app.use('/api/v1/client', clientRoutes); // Client routes
app.use('/api/v1/users', userRoutes); // User routes
app.use('/api/v1/jobs', jobRoutes); // Job routes
app.use('/api/v1/chat', chatRoutes); // Chat routes
app.use('/api/v1/messages', directMessageRoutes); // Direct messages
app.use('/api/v1/contracts', directContractRoutes); // Contracts
app.use('/api/v1/documents', documentRoutes); // Documents
app.use('/api/v1/escrow', escrowRoutes); // Escrow
app.use('/api/v1/job-alerts', jobAlertRoutes); // Job alerts
app.use('/api/v1/job-matches', jobMatchRoutes); // Job matches
app.use('/api/v1/meetings', meetingRoutes); // Meetings
app.use('/api/v1/milestones', milestoneRoutes); // Milestones
app.use('/api/v1/notifications', notificationRoutes); // Notifications
app.use('/api/v1/payments', paymentRoutes); // Payments
app.use('/api/v1/reviews', reviewRoutes); // Reviews
app.use('/api/v1/time-tracking', timeTrackingRoutes); // Time tracking
app.use('/api/v1/transactions', transactionRoutes); // Transactions
app.use('/api/v1/2fa', twoFactorRoutes); // 2FA
app.use('/api/v1/whiteboard', whiteboardRoutes); // Whiteboard
app.use('/api/v1/code-snippets', codeSnippetRoutes); // Code snippets
app.use('/api/v1/admin', adminRoutes); // Admin routes

// Serve static files
app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  logger.debug('404 Not Found:', { method: req.method, url: req.url });
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack
  });
  
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || 'Something broke!',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Export server-related objects
export { httpServer, io };
export default app;
