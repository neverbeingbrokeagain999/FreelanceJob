import DirectMessage from '../models/DirectMessage.js';
import User from '../models/User.js';
import { io } from '../app.js';
import { getFileUrl, getFilePath } from '../middleware/upload.js';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import { errorResponse } from '../utils/errorHandler.js';
import logger from '../config/logger.js';

const MESSAGES_PER_PAGE = 20;

export const getConversations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user.id;

    const conversations = await DirectMessage.aggregate([
      {
        $match: {
          $or: [{ sender: mongoose.Types.ObjectId(userId) }, { receiver: mongoose.Types.ObjectId(userId) }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', mongoose.Types.ObjectId(userId)] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$receiver', mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ]);

    // Populate user details
    const populatedConversations = await User.populate(conversations, {
      path: '_id',
      select: 'name email avatar isOnline lastSeen'
    });

    res.json({
      success: true,
      data: populatedConversations,
      pagination: {
        page,
        limit,
        hasMore: conversations.length === limit
      }
    });
  } catch (error) {
    logger.error('Error getting conversations:', error);
    return errorResponse(res, 500, 'Error getting conversations');
  }
};

export const getDirectMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || MESSAGES_PER_PAGE;
    const beforeDate = req.query.before ? new Date(req.query.before) : new Date();

    // Validate other user exists
    const otherUser = await User.findById(otherUserId).select('name email avatar isOnline lastSeen');
    if (!otherUser) {
      return errorResponse(res, 404, 'User not found');
    }

    const messages = await DirectMessage.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ],
      createdAt: { $lt: beforeDate }
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'name email avatar');

    // Mark messages as read
    await DirectMessage.updateMany(
      {
        receiver: userId,
        sender: otherUserId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Notify sender that messages were read
    io.to(otherUserId).emit('messagesRead', { reader: userId });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        user: otherUser
      },
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    logger.error('Error getting messages:', error);
    return errorResponse(res, 500, 'Error getting messages');
  }
};

export const sendDirectMessage = async (req, res) => {
  try {
    const { message, receiver } = req.body;
    const sender = req.user.id;

    // Validate receiver exists
    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      return errorResponse(res, 404, 'Receiver not found');
    }

    let files = [];
    if (req.files && req.files.length > 0) {
      files = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: getFileUrl(file.filename)
      }));
    }

    const directMessage = new DirectMessage({
      sender,
      receiver,
      message,
      files
    });

    await directMessage.save();
    await directMessage.populate('sender', 'name email avatar');

    // Emit to specific room
    io.to(receiver).emit('newMessage', {
      message: directMessage
    });

    res.status(201).json({
      success: true,
      data: directMessage
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    // Clean up any uploaded files if message creation fails
    if (req.files) {
      await Promise.all(req.files.map(file => 
        fs.unlink(getFilePath(file.filename)).catch(() => {})
      ));
    }
    return errorResponse(res, 500, 'Error sending message');
  }
};

export const markDirectMessageAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.id;

    const result = await DirectMessage.updateMany(
      {
        _id: { $in: messageIds },
        receiver: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    if (result.modifiedCount > 0) {
      // Get unique senders of the messages that were marked as read
      const messages = await DirectMessage.find({
        _id: { $in: messageIds },
        receiver: userId
      }).distinct('sender');

      // Notify each sender that their messages were read
      messages.forEach(senderId => {
        io.to(senderId.toString()).emit('messagesRead', {
          reader: userId,
          messageIds
        });
      });
    }

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    return errorResponse(res, 500, 'Error marking messages as read');
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await DirectMessage.findOne({
      _id: messageId,
      sender: userId
    });

    if (!message) {
      return errorResponse(res, 404, 'Message not found or unauthorized');
    }

    // Delete associated files
    if (message.files && message.files.length > 0) {
      await Promise.all(message.files.map(file =>
        fs.unlink(getFilePath(file.filename)).catch(() => {})
      ));
    }

    await message.remove();

    // Notify the receiver that message was deleted
    io.to(message.receiver.toString()).emit('messageDeleted', {
      messageId: message._id
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting message:', error);
    return errorResponse(res, 500, 'Error deleting message');
  }
};
