﻿import mongoose from 'mongoose';
import app, { httpServer, io } from './app.js';
import { connectDB } from './config/database.js';
import logger from './config/logger.js';

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

const startServer = async () => {
  try {
    logger.info('🚀 Starting server initialization...');
    logger.info('Environment:', process.env.NODE_ENV);
    logger.info('Debug mode:', process.env.DEBUG);

    // Connect to MongoDB
    logger.info('📡 Attempting database connection...');
    await connectDB();
    logger.info('✅ Database connection successful');

    if (!isVercel) {
      // Start server only in non-Vercel environment
      const PORT = process.env.PORT || 5000;
      
      logger.info('🌐 Initializing HTTP server...');
      httpServer.listen(PORT, () => {
        logger.info(`
==================================
🚀 Server Status
----------------------------------
Mode: ${process.env.NODE_ENV}
Port: ${PORT}
Database: Connected
Socket.IO: Initialized
API Docs: http://localhost:${PORT}/api/docs
==================================
        `);
      });
    }

    // Handle server shutdown
    const gracefulShutdown = async () => {
      logger.info('🛑 Received shutdown signal');

      try {
        // Close HTTP server
        await new Promise((resolve) => {
          httpServer.close(resolve);
        });
        logger.info('✅ HTTP server closed');

        // Close Socket.IO connections
        await io.close();
        logger.info('✅ Socket.IO server closed');

        // Close database connection
        await mongoose.connection.close();
        logger.info('✅ Database connection closed');

        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Listen for shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', {
        message: error.message,
        stack: error.stack
      });
      gracefulShutdown();
    });

    process.on('unhandledRejection', (error) => {
      logger.error('❌ Unhandled Rejection:', {
        message: error.message,
        stack: error.stack
      });
      gracefulShutdown();
    });

  } catch (error) {
    logger.error('❌ Server startup error:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

startServer();
