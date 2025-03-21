import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import AuditLog from '../models/AuditLog.js';

// CORS configuration
const corsOptions = {
  origin: (process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'])
    .map(origin => origin.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Helmet security configuration
const securityConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:*', process.env.API_URL],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
};

// Rate limiting configurations
const createRateLimiters = () => {
  const apiLimiter = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      const trustedIps = process.env.TRUSTED_IPS?.split(',') || [];
      return trustedIps.includes(req.ip);
    }
  };

  const authLimiter = {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: 'Too many authentication attempts, please try again later'
  };

  const profileLimiter = {
    windowMs: 15 * 60 * 1000,
    max: 500,
    skipFailedRequests: true
  };

  return { apiLimiter, authLimiter, profileLimiter };
};

// File upload security configuration
const fileUploadConfig = {
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxSize: '10mb'
};

// Security headers
const securityHeaders = {
  removeHeaders: ['X-Powered-By'],
  setHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    ...(process.env.NODE_ENV === 'production' ? {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    } : {})
  }
};

// Data sanitization configuration
const sanitizationConfig = {
  mongo: {
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Attempted NoSQL injection: ${key}`);
    }
  },
  hpp: {
    whitelist: [
      'sort',
      'page',
      'limit',
      'fields',
      'price',
      'rating',
      'category'
    ]
  }
};

// Security monitoring patterns
const securityMonitoring = {
  suspiciousPatterns: [
    /\.\.[\/\\]/,          // Directory traversal
    /<script\b[^>]*>/i,    // XSS attempts
    /\$where\b/,           // NoSQL injection
    /\b(admin|root)\b/i    // Privilege escalation attempts
  ],
  async logViolation(pattern, data, req) {
    if (process.env.NODE_ENV === 'production') {
      await AuditLog.logUserAction({
        event: 'security-violation',
        severity: 'high',
        actor: {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        },
        metadata: {
          type: 'suspicious-pattern',
          pattern: pattern.toString(),
          data
        }
      });
    }
  }
};

const requestSizeLimits = {
  json: '10kb',
  urlencoded: '10kb'
};

export {
  corsOptions,
  securityConfig,
  createRateLimiters,
  fileUploadConfig,
  securityHeaders,
  sanitizationConfig,
  securityMonitoring,
  requestSizeLimits
};
