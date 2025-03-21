import express from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../config/redis.js';
import logger from '../config/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check Redis connection
    let redisStatus = 'disconnected';
    try {
      await redisClient.ping();
      redisStatus = 'connected';
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        mongodb: {
          status: mongoStatus,
          version: mongoose.version
        },
        redis: {
          status: redisStatus
        }
      },
      system: {
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
        },
        nodeVersion: process.version
      }
    };

    // Set overall status based on service health
    if (mongoStatus !== 'connected') {
      healthStatus.status = 'degraded';
      return res.status(503).json(healthStatus);
    }

    res.json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;