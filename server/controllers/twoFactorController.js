import asyncHandler from '../middleware/async.js';
import { ApiError } from '../utils/errorHandler.js';
import TwoFactorAuth from '../models/TwoFactorAuth.js';
import User from '../models/User.js';
import { sendSMS } from '../services/smsService.js';
import { sendEmail } from '../services/emailService.js';
import { generateTOTP, verifyTOTP } from '../utils/totp.js';
import { logger } from '../config/logger.js';

// @desc    Setup 2FA for user
// @route   POST /api/v1/2fa/setup
// @access  Private
export const setup2FA = asyncHandler(async (req, res) => {
  const { phoneNumber, backupEmail } = req.body;
  const userId = req.user.id;

  // Check if 2FA is already enabled
  let twoFactorAuth = await TwoFactorAuth.findOne({ user: userId });
  if (twoFactorAuth && twoFactorAuth.isEnabled) {
    throw new ApiError('2FA is already enabled for this account', 400);
  }

  // Generate TOTP secret
  const { secret, qrCode } = generateTOTP(req.user.email);

  // Create or update 2FA record
  twoFactorAuth = await TwoFactorAuth.findOneAndUpdate(
    { user: userId },
    {
      secret,
      phoneNumber,
      backupEmail,
      isEnabled: false,
      recoveryCode: generateRecoveryCode()
    },
    { upsert: true, new: true }
  );

  // Generate and send verification codes
  const smsCode = generateVerificationCode();
  const emailCode = generateVerificationCode();

  // Store codes temporarily (expires in 10 minutes)
  twoFactorAuth.verificationCodes = {
    sms: { code: smsCode, expires: Date.now() + 600000 },
    email: { code: emailCode, expires: Date.now() + 600000 }
  };
  await twoFactorAuth.save();

  // Send verification codes
  try {
    await Promise.all([
      sendSMS(phoneNumber, `Your 2FA verification code is: ${smsCode}`),
      sendEmail(backupEmail, '2FA Setup Verification', `Your verification code is: ${emailCode}`)
    ]);
  } catch (error) {
    logger.error('Error sending verification codes:', error);
    throw new ApiError('Failed to send verification codes', 500);
  }

  res.status(200).json({
    success: true,
    data: {
      qrCode,
      recoveryCode: twoFactorAuth.recoveryCode
    }
  });
});

// @desc    Verify 2FA setup
// @route   POST /api/v1/2fa/verify
// @access  Private
export const verify2FA = asyncHandler(async (req, res) => {
  const { code, method } = req.body;
  const userId = req.user.id;

  const twoFactorAuth = await TwoFactorAuth.findOne({ user: userId });
  if (!twoFactorAuth) {
    throw new ApiError('2FA setup not initiated', 400);
  }

  let isValid = false;
  
  switch (method) {
    case 'sms':
    case 'email':
      const storedCode = twoFactorAuth.verificationCodes[method];
      if (!storedCode || storedCode.expires < Date.now()) {
        throw new ApiError('Verification code expired', 400);
      }
      isValid = code === storedCode.code;
      break;
    case 'app':
      isValid = verifyTOTP(code, twoFactorAuth.secret);
      break;
    default:
        throw new ApiError('Invalid verification method', 400);
  }

  if (!isValid) {
    throw new ApiError('Invalid verification code', 400);
  }

  // Enable 2FA
  twoFactorAuth.isEnabled = true;
  twoFactorAuth.verificationCodes = {}; // Clear temporary codes
  await twoFactorAuth.save();

  // Update user model
  await User.findByIdAndUpdate(userId, { has2FAEnabled: true });

  res.status(200).json({
    success: true,
    message: '2FA successfully enabled'
  });
});

// @desc    Disable 2FA
// @route   POST /api/v1/2fa/disable
// @access  Private
export const disable2FA = asyncHandler(async (req, res) => {
  const { password, confirmDisable } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new ApiError('Invalid password', 401);
  }

  // Confirm user wants to disable
  if (confirmDisable !== 'true') {
    throw new ApiError('Must confirm 2FA disable', 400);
  }

  // Disable 2FA
  await TwoFactorAuth.findOneAndUpdate(
    { user: userId },
    { isEnabled: false, secret: null }
  );

  // Update user model
  user.has2FAEnabled = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: '2FA successfully disabled'
  });
});

// @desc    Use recovery code
// @route   POST /api/v1/2fa/recovery
// @access  Public
export const useRecoveryCode = asyncHandler(async (req, res) => {
  const { recoveryCode } = req.body;
  
  const twoFactorAuth = await TwoFactorAuth.findOne({ recoveryCode });
  if (!twoFactorAuth) {
    throw new ApiError('Invalid recovery code', 400);
  }

  // Generate new recovery code
  const newRecoveryCode = generateRecoveryCode();
  twoFactorAuth.recoveryCode = newRecoveryCode;
  await twoFactorAuth.save();

  res.status(200).json({
    success: true,
    data: {
      newRecoveryCode
    },
    message: 'Recovery successful. Please save your new recovery code.'
  });
});

// Helper functions
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateRecoveryCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
