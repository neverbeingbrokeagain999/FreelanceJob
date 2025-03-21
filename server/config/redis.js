import Redis from 'ioredis';
import { logger } from './logger.js';

let redisClient = null;

export const initRedis = async () => {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Using mock Redis client for testing');
    redisClient = {
      set: async () => 'OK',
      get: async () => null,
      del: async () => 1,
      exists: async () => 0,
      expire: async () => 1,
      disconnect: async () => true,
      status: 'ready'
    };
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', {
        message: err.message,
        stack: err.stack
      });
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    // Test the connection
    await redisClient.ping();
    logger.info('Redis connection test successful');

    return redisClient;
  } catch (error) {
    logger.error('Redis connection error:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const getRedisClient = () => redisClient;

export const cacheGet = async (key, defaultValue = null) => {
  try {
    if (!redisClient || redisClient.status !== 'ready') {
      return defaultValue;
    }
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    logger.error('Redis get error:', {
      key,
      error: error.message
    });
    return defaultValue;
  }
};

export const cacheSet = async (key, value, expirySeconds = 3600) => {
  try {
    if (!redisClient || redisClient.status !== 'ready') {
      return false;
    }
    const result = await redisClient.set(
      key,
      JSON.stringify(value),
      'EX',
      expirySeconds
    );
    return result === 'OK';
  } catch (error) {
    logger.error('Redis set error:', {
      key,
      error: error.message
    });
    return false;
  }
};

export const cacheDelete = async (...keys) => {
  try {
    if (!redisClient || redisClient.status !== 'ready' || !keys.length) {
      return 0;
    }
    return await redisClient.del(...keys);
  } catch (error) {
    logger.error('Redis delete error:', {
      keys,
      error: error.message
    });
    return 0;
  }
};

export const cacheExists = async (key) => {
  try {
    if (!redisClient || redisClient.status !== 'ready') {
      return false;
    }
    return await redisClient.exists(key) === 1;
  } catch (error) {
    logger.error('Redis exists error:', {
      key,
      error: error.message
    });
    return false;
  }
};

export const cacheExpire = async (key, seconds) => {
  try {
    if (!redisClient || redisClient.status !== 'ready') {
      return false;
    }
    return await redisClient.expire(key, seconds) === 1;
  } catch (error) {
    logger.error('Redis expire error:', {
      key,
      seconds,
      error: error.message
    });
    return false;
  }
};

export const cacheClear = async (pattern = '*') => {
  try {
    if (!redisClient || redisClient.status !== 'ready') {
      return 0;
    }
    const keys = await redisClient.keys(pattern);
    if (!keys.length) return 0;
    return await redisClient.del(...keys);
  } catch (error) {
    logger.error('Redis clear error:', {
      pattern,
      error: error.message
    });
    return 0;
  }
};

export default {
  initRedis,
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheExists,
  cacheExpire,
  cacheClear
};
