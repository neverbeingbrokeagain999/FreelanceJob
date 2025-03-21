import User from '../models/User.js';
import { errorResponse } from '../utils/errorHandler.js';
import logger from '../config/logger.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return errorResponse(res, 400, 'User already exists with this email');
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role
    });

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return errorResponse(res, 500, 'Error registering user');
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    if (!user.isActive) {
      return errorResponse(res, 401, 'Your account has been deactivated');
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: [user.role], // Convert single role to array format
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    return errorResponse(res, 500, 'Error logging in');
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('profile');
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    logger.error('Get user error:', error);
    return errorResponse(res, 500, 'Error getting user data');
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 401, 'Current password is incorrect');
    }

    user.password = newPassword;
    user.lastPasswordUpdate = Date.now();
    await user.save();

    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      token,
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error('Update password error:', error);
    return errorResponse(res, 500, 'Error updating password');
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });

    if (!user) {
      return errorResponse(res, 404, 'No user found with this email');
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // TODO: Send email with reset token
    // For development, just return the token
    res.json({
      success: true,
      resetToken,
      message: 'Password reset email sent'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    return errorResponse(res, 500, 'Error processing forgot password request');
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 400, 'Invalid or expired reset token');
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.lastPasswordUpdate = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    return errorResponse(res, 500, 'Error resetting password');
  }
};

// @desc    Update email
// @route   PUT /api/auth/update-email
// @access  Private
export const updateEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Password is incorrect');
    }

    // Check if email is already taken
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return errorResponse(res, 400, 'Email is already taken');
    }

    user.email = email.toLowerCase();
    user.emailVerified = false; // Require verification of new email
    await user.save();

    // TODO: Send verification email to new address

    res.json({
      success: true,
      message: 'Email updated successfully'
    });
  } catch (error) {
    logger.error('Update email error:', error);
    return errorResponse(res, 500, 'Error updating email');
  }
};

// @desc    Update profile
// @route   PUT /api/auth/update-profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    return errorResponse(res, 500, 'Error updating profile');
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return errorResponse(res, 500, 'Error logging out');
  }
};

export default {
  register,
  login,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  updateEmail,
  updateProfile,
  logout
};
