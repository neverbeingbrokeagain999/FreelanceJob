﻿import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import logger from "./logger.js";

let mongod = null;

export const connectDB = async () => {
  try {
    logger.info('🔄 Initializing MongoDB connection...');
    logger.info('Environment:', process.env.NODE_ENV);
    
    const isDev = process.env.NODE_ENV === "development";
    const isTest = process.env.NODE_ENV === "test";

    let uri;

    // Use real MongoDB URI for all environments except test
    if (isTest) {
      if (!mongod) {
        mongod = await MongoMemoryServer.create();
      }
      uri = mongod.getUri();
      logger.info('🔄 Using MongoDB Memory Server for testing');
    } else {
      uri = process.env.MONGODB_URI;
      if (!uri) {
        if (isDev) {
          uri = 'mongodb://localhost:27017/freelancedb';
          logger.warn('⚠️ No MongoDB URI found, using default local connection:', uri);
        } else {
          throw new Error("MongoDB URI is not defined in environment variables");
        }
      } else {
        // Mask sensitive parts of the URI for logging
        const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//[USER]:[PASS]@');
        logger.info('🔄 Using MongoDB connection:', maskedUri);
      }
    }

    // Set up Mongoose event listeners
    mongoose.connection.on('connecting', () => {
      logger.info('🔄 Mongoose: Connecting...');
    });

    mongoose.connection.on('connected', () => {
      logger.info('✅ Mongoose: Connected');
    });

    mongoose.connection.on('disconnecting', () => {
      logger.warn('⚠️ Mongoose: Disconnecting...');
    });

    mongoose.connection.on('disconnected', () => {
      logger.error('❌ Mongoose: Disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('❌ Mongoose Error:', err);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 Mongoose: Reconnected');
    });

    // Configure Mongoose
    mongoose.set('strictQuery', false);
    mongoose.set('debug', process.env.NODE_ENV === 'development');

    // Connection options optimized for MongoDB Atlas
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      autoIndex: process.env.NODE_ENV === 'development'
    };

    logger.info('🔄 Attempting MongoDB connection with options:', options);

    // Connect to MongoDB
    const conn = await mongoose.connect(uri, options);

    logger.info('✅ MongoDB Connected Successfully');
    logger.info('Connection Details:', {
      host: conn.connection.host,
      port: conn.connection.port,
      name: conn.connection.name,
      readyState: conn.connection.readyState
    });

    return conn;
  } catch (error) {
    logger.error('❌ MongoDB Connection Error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    throw error;
  }
};

export const closeDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed successfully");
    }
    if (mongod) {
      await mongod.stop();
      logger.info("MongoDB Memory Server stopped successfully");
    }
  } catch (error) {
    logger.error("Error closing MongoDB connection:", {
      message: error.message,
      name: error.name
    });
    throw error;
  }
};

export default {
  connectDB,
  closeDB
};
