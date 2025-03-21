import Chat from '../models/Chat.js';
import { io } from '../app.js';
import { errorResponse } from '../utils/errorHandler.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

const MESSAGES_PER_PAGE = 50;

export const getConversations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;

    const query = {
      participants: req.user.id
    };

    // Add search if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const conversations = await Chat.find(query)
      .populate('participants', 'name email avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name avatar'
        }
      })
      .sort('-updatedAt')
      .skip((page - 1) * limit)
      .limit(limit);

    // Get total count for pagination
    const total = await Chat.countDocuments(query);

    res.json({
      success: true,
      data: conversations,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get conversations error:', error);
    return errorResponse(res, 500, 'Error fetching conversations');
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || MESSAGES_PER_PAGE;
    const before = req.query.before ? new Date(req.query.before) : new Date();

    // Verify conversation exists and user is participant
    const chat = await Chat.findOne({
      _id: conversationId,
      participants: req.user.id
    });

    if (!chat) {
      return errorResponse(res, 404, 'Conversation not found or access denied');
    }

    const messages = await chat.messages
      .find({
        createdAt: { $lt: before }
      })
      .populate('sender', 'name email avatar')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);

    // Mark messages as read
    await chat.messages.updateMany(
      {
        sender: { $ne: req.user.id },
        read: false
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );

    // Notify other participants
    chat.participants
      .filter(p => p.toString() !== req.user.id)
      .forEach(participantId => {
        io.to(participantId.toString()).emit('messagesRead', {
          conversationId,
          reader: req.user.id
        });
      });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        chat
      },
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    return errorResponse(res, 500, 'Error fetching messages');
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, attachments } = req.body;
    
    // Verify conversation exists and user is participant
    const chat = await Chat.findOne({
      _id: conversationId,
      participants: req.user.id
    });

    if (!chat) {
      return errorResponse(res, 404, 'Conversation not found or access denied');
    }

    // Create and add message to chat
    const message = await chat.messages.create({
      sender: req.user.id,
      content,
      attachments
    });

    // Update chat's last message and activity
    chat.lastMessage = message._id;
    chat.lastActivity = new Date();
    await chat.save();

    await message.populate('sender', 'name email avatar');

    // Notify other participants
    chat.participants
      .filter(p => p.toString() !== req.user.id)
      .forEach(participantId => {
        io.to(participantId.toString()).emit('newMessage', {
          conversationId,
          message
        });
      });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Send message error:', error);
    return errorResponse(res, 500, 'Error sending message');
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { lastReadMessage } = req.body;
    
    // Verify conversation exists and user is participant
    const chat = await Chat.findOne({
      _id: conversationId,
      participants: req.user.id
    });

    if (!chat) {
      return errorResponse(res, 404, 'Conversation not found or access denied');
    }

    // Update all unread messages up to lastReadMessage
    const result = await chat.messages.updateMany(
      {
        _id: { $lte: lastReadMessage },
        sender: { $ne: req.user.id },
        read: false
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      // Notify other participants
      chat.participants
        .filter(p => p.toString() !== req.user.id)
        .forEach(participantId => {
          io.to(participantId.toString()).emit('messagesRead', {
            conversationId,
            reader: req.user.id,
            lastReadMessage
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
    logger.error('Mark as read error:', error);
    return errorResponse(res, 500, 'Error marking messages as read');
  }
};
