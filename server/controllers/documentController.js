import mongoose from 'mongoose';
import Document from '../models/Document.js';
import { ApiError } from '../utils/errorHandler.js';
import asyncHandler from '../middleware/async.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { logger } from '../config/logger.js';

// Get documents
export const getDocuments = asyncHandler(async (req, res) => {
  const { 
    q, tags, collaborator, isPublic, 
    from, to, sort = '-updatedAt', 
    page = 1, limit = 10 
  } = req.query;

  const query = { isArchived: false };

  // Search by title or content
  if (q) {
    query.$text = { $search: q };
  }

  // Filter by tags
  if (tags) {
    query.tags = { $all: Array.isArray(tags) ? tags : [tags] };
  }

  // Filter by collaborator
  if (collaborator) {
    query.$or = [
      { ownerId: collaborator },
      { 'collaborators.userId': collaborator }
    ];
  }

  // Filter by visibility
  if (typeof isPublic === 'boolean') {
    query.isPublic = isPublic;
  }

  // Filter by date range
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  // Access control
  if (!req.user.roles?.includes('admin')) {
    query.$or = [
      { ownerId: req.user._id },
      { 'collaborators.userId': req.user._id },
      { isPublic: true }
    ];
  }

  const documents = await Document.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('ownerId', 'name email')
    .populate('collaborators.userId', 'name email');

  const total = await Document.countDocuments(query);

  res.status(200).json({
    success: true,
    data: documents,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    }
  });
});

// Get single document
export const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('ownerId', 'name email')
    .populate('collaborators.userId', 'name email')
    .populate('comments.userId', 'name email')
    .populate('comments.replies.userId', 'name email');

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  // Check access rights
  if (!document.isPublic && 
      !document.ownerId.equals(req.user._id) && 
      !document.isCollaborator(req.user._id)) {
    throw new ApiError('Not authorized to access this document', 403);
  }

  res.status(200).json({
    success: true,
    data: document
  });
});

// Create document
export const createDocument = asyncHandler(async (req, res) => {
  req.body.ownerId = req.user._id;

  const document = await Document.create(req.body);

  res.status(201).json({
    success: true,
    data: document
  });
});

// Update document content
export const updateDocument = asyncHandler(async (req, res) => {
  let document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  // Check editing rights
  if (!document.canEdit(req.user._id)) {
    throw new ApiError('Not authorized to edit this document', 403);
  }

  // Version conflict check
  if (req.body.version !== document.version) {
    throw new ApiError('Document version conflict', 409);
  }

  document.content = req.body.content;
  document = await document.save();

  // Update cache
  const cacheKey = `document:${document._id}:content`;
  await cacheSet(cacheKey, document.content);

  res.status(200).json({
    success: true,
    data: document
  });
});

// Update document metadata
export const updateMetadata = asyncHandler(async (req, res) => {
  let document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  if (!document.canEdit(req.user._id)) {
    throw new ApiError('Not authorized to edit this document', 403);
  }

  document.metadata = { ...document.metadata, ...req.body.metadata };
  document = await document.save();

  res.status(200).json({
    success: true,
    data: document
  });
});

// Add collaborator
export const addCollaborator = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  if (!document.ownerId.equals(req.user._id)) {
    throw new ApiError('Only the owner can manage collaborators', 403);
  }

  document.addCollaborator(req.body.userId, req.body.role);
  await document.save();

  res.status(200).json({
    success: true,
    data: document
  });
});

// Remove collaborator
export const removeCollaborator = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  if (!document.ownerId.equals(req.user._id)) {
    throw new ApiError('Only the owner can manage collaborators', 403);
  }

  document.removeCollaborator(req.params.userId);
  await document.save();

  res.status(200).json({
    success: true,
    data: document
  });
});

// Add comment
export const addComment = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  if (!document.canEdit(req.user._id)) {
    throw new ApiError('Not authorized to comment on this document', 403);
  }

  document.addComment(req.user._id, req.body.content, req.body.position);
  await document.save();

  res.status(201).json({
    success: true,
    data: document.comments[document.comments.length - 1]
  });
});

// Resolve comment
export const resolveComment = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  if (!document.canEdit(req.user._id)) {
    throw new ApiError('Not authorized to resolve comments', 403);
  }

  document.resolveComment(req.params.commentId);
  await document.save();

  res.status(200).json({
    success: true,
    data: document.comments.id(req.params.commentId)
  });
});

// Add version
export const addVersion = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  if (!document.canEdit(req.user._id)) {
    throw new ApiError('Not authorized to create versions', 403);
  }

  document.addVersion(req.user._id, req.body.content, req.body.description);
  await document.save();

  res.status(201).json({
    success: true,
    data: document.history[document.history.length - 1]
  });
});

// Generate share link
export const generateShareLink = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  if (!document.ownerId.equals(req.user._id)) {
    throw new ApiError('Only the owner can generate share links', 403);
  }

  const code = document.generateShareLink(req.body.expiryHours);
  await document.save();

  res.status(200).json({
    success: true,
    data: {
      code,
      expiresAt: document.shareLink.expiresAt
    }
  });
});

// Revoke share link
export const revokeShareLink = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  if (!document.ownerId.equals(req.user._id)) {
    throw new ApiError('Only the owner can revoke share links', 403);
  }

  document.revokeShareLink();
  await document.save();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Archive document
export const archiveDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);

  if (!document) {
    throw new ApiError('Document not found', 404);
  }

  if (!document.ownerId.equals(req.user._id)) {
    throw new ApiError('Only the owner can archive the document', 403);
  }

  document.isArchived = true;
  await document.save();

  res.status(200).json({
    success: true,
    data: {}
  });
});

export default {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  updateMetadata,
  addCollaborator,
  removeCollaborator,
  addComment,
  resolveComment,
  addVersion,
  generateShareLink,
  revokeShareLink,
  archiveDocument
};
