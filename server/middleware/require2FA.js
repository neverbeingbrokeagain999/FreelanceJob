import { ApiError } from '../utils/errorHandler.js';
import TwoFactorAuth from '../models/TwoFactorAuth.js';
import { verifyTOTP } from '../utils/totp.js';
import asyncHandler from './async.js';

/**
 * Middleware to require 2FA verification for sensitive routes
 * @param {Object} options - Configuration options
 * @param {boolean} options.strict - If true, requires 2FA to be enabled, if false only verifies if enabled
 */
export const require2FA = (options = { strict: false }) => asyncHandler(async (req, res, next) => {
  // Skip for non-authenticated routes
  if (!req.user) {
    return next();
  }

  const twoFactorAuth = await TwoFactorAuth.findOne({ user: req.user.id });

  // If 2FA is not enabled
  if (!twoFactorAuth?.isEnabled) {
    if (options.strict) {
        throw new ApiError('Two-factor authentication is required for this action', 403);
    }
    return next();
  }

  // Get 2FA token from header or query
  const token = req.headers['x-2fa-token'] || req.query.twoFactorToken;

  if (!token) {
    throw new ApiError('Two-factor authentication token is required', 401);
  }

  // Verify token
  const isValid = verifyTOTP(token, twoFactorAuth.secret);
  if (!isValid) {
    throw new ApiError('Invalid two-factor authentication token', 401);
  }

  // Add 2FA info to request for downstream use
  req.twoFactorAuth = {
    verified: true,
    method: 'totp'
  };

  next();
});

/**
 * Middleware to require 2FA recovery verification
 * Specifically for recovery flow where user needs to verify ownership without TOTP
 */
export const requireRecovery2FA = asyncHandler(async (req, res, next) => {
  const { recoveryToken } = req.session;
  
  if (!recoveryToken) {
    throw new ApiError('Recovery verification required', 401);
  }

  const twoFactorAuth = await TwoFactorAuth.findOne({ 
    recoveryToken,
    recoveryTokenExpires: { $gt: Date.now() }
  });

  if (!twoFactorAuth) {
    throw new ApiError('Invalid or expired recovery token', 401);
  }

  // Add recovery info to request
  req.twoFactorAuth = {
    verified: true,
    method: 'recovery',
    userId: twoFactorAuth.user
  };

  next();
});

/**
 * Helper function to check if route should bypass 2FA
 * @param {string} path - Route path to check
 * @returns {boolean}
 */
export const shouldBypass2FA = (path) => {
  const bypassPaths = [
    '/api/v1/2fa/setup',
    '/api/v1/2fa/verify',
    '/api/v1/2fa/recovery',
    '/api/v1/auth/login',
    '/api/v1/auth/register'
  ];
  
  return bypassPaths.some(bypassPath => path.startsWith(bypassPath));
};
