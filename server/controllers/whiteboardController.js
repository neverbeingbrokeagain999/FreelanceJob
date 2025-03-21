import { Whiteboard } from '../models/Whiteboard.js';
import { ApiError } from '../utils/errorHandler.js';
import asyncHandler from '../middleware/async.js';

// @desc    Create a new whiteboard
// @route   POST /api/whiteboards
// @access  Private
export const createWhiteboard = asyncHandler(async (req, res) => {
  // Add owner to request body
  req.body.owner = req.user._id;
  
  const whiteboard = await Whiteboard.create(req.body);
  res.status(201).json({ success: true, data: whiteboard });
});

// @desc    Get all whiteboards (with filters)
// @route   GET /api/whiteboards
// @access  Private
export const getWhiteboards = asyncHandler(async (req, res) => {
  const { type, createdAt, hasElements } = req.query.filter || {};
  const query = {
    $or: [
      { owner: req.user._id },
      { 'collaborators.user': req.user._id }
    ]
  };

  // Apply filters
  if (type) query.type = type;
  if (createdAt?.from) query.createdAt = { $gte: new Date(createdAt.from) };
  if (createdAt?.to) query.createdAt = { ...query.createdAt, $lte: new Date(createdAt.to) };
  if (hasElements === 'true') query['elements.0'] = { $exists: true };

  const whiteboards = await Whiteboard.find(query)
    .populate('owner', 'name email')
    .populate('collaborators.user', 'name email')
    .sort({ updatedAt: 'desc' });

  res.status(200).json({
    success: true,
    count: whiteboards.length,
    data: whiteboards
  });
});

// @desc    Get single whiteboard
// @route   GET /api/whiteboards/:id
// @access  Private
export const getWhiteboard = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('collaborators.user', 'name email');

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check if user has access
  const hasAccess = checkAccess(whiteboard, req.user._id);
  if (!hasAccess) {
    throw new ApiError('Not authorized to access this whiteboard', 403);
  }

  res.status(200).json({ success: true, data: whiteboard });
});

// @desc    Update whiteboard
// @route   PUT /api/whiteboards/:id
// @access  Private
export const updateWhiteboard = asyncHandler(async (req, res) => {
  let whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check ownership
  if (whiteboard.owner.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized to update this whiteboard', 403);
  }

  whiteboard = await Whiteboard.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: whiteboard });
});

// @desc    Delete whiteboard
// @route   DELETE /api/whiteboards/:id
// @access  Private
export const deleteWhiteboard = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check ownership
  if (whiteboard.owner.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized to delete this whiteboard', 403);
  }

  await whiteboard.remove();

  res.status(200).json({ success: true, data: {} });
});

// @desc    Add element to whiteboard
// @route   POST /api/whiteboards/:id/elements
// @access  Private
export const addElement = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check edit permissions
  if (!canEdit(whiteboard, req.user._id)) {
    throw new ApiError('Not authorized to edit this whiteboard', 403);
  }

  const element = await whiteboard.addElement(req.body, req.user._id);

  res.status(200).json({
    success: true,
    data: element
  });
});

// @desc    Update element
// @route   PUT /api/whiteboards/:id/elements/:elementId
// @access  Private
export const updateElement = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check edit permissions
  if (!canEdit(whiteboard, req.user._id)) {
    throw new ApiError('Not authorized to edit this whiteboard', 403);
  }

  const element = await whiteboard.updateElement(req.params.elementId, req.body, req.user._id);

  if (!element) {
    throw new ApiError('Element not found', 404);
  }

  res.status(200).json({
    success: true,
    data: element
  });
});

// @desc    Delete element
// @route   DELETE /api/whiteboards/:id/elements/:elementId
// @access  Private
export const deleteElement = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check edit permissions
  if (!canEdit(whiteboard, req.user._id)) {
    throw new ApiError('Not authorized to edit this whiteboard', 403);
  }

  const deleted = await whiteboard.deleteElement(req.params.elementId, req.user._id);

  if (!deleted) {
    throw new ApiError('Element not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Clear all elements
// @route   POST /api/whiteboards/:id/clear
// @access  Private
export const clearElements = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check edit permissions
  if (!canEdit(whiteboard, req.user._id)) {
    throw new ApiError('Not authorized to clear this whiteboard', 403);
  }

  await whiteboard.clearElements(req.user._id);

  res.status(200).json({
    success: true,
    data: whiteboard
  });
});

// @desc    Add collaborator
// @route   POST /api/whiteboards/:id/collaborators
// @access  Private
export const addCollaborator = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check ownership
  if (whiteboard.owner.toString() !== req.user._id.toString()) {
    throw new ApiError('Only owner can add collaborators', 403);
  }

  await whiteboard.addCollaborator(req.body.userId, req.body.role);

  res.status(200).json({
    success: true,
    data: whiteboard
  });
});

// @desc    Remove collaborator
// @route   DELETE /api/whiteboards/:id/collaborators/:userId
// @access  Private
export const removeCollaborator = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check ownership
  if (whiteboard.owner.toString() !== req.user._id.toString()) {
    throw new ApiError('Only owner can remove collaborators', 403);
  }

  await whiteboard.removeCollaborator(req.params.userId);

  res.status(200).json({
    success: true,
    data: whiteboard
  });
});

// @desc    Update collaborator role
// @route   PUT /api/whiteboards/:id/collaborators/:userId
// @access  Private
export const updateCollaboratorRole = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check ownership
  if (whiteboard.owner.toString() !== req.user._id.toString()) {
    throw new ApiError('Only owner can update collaborator roles', 403);
  }

  await whiteboard.updateCollaboratorRole(req.params.userId, req.body.role);

  res.status(200).json({
    success: true,
    data: whiteboard
  });
});

// @desc    Get whiteboard history
// @route   GET /api/whiteboards/:id/history
// @access  Private
export const getHistory = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id)
    .select('history')
    .populate('history.performedBy', 'name email');

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check access
  const hasAccess = checkAccess(whiteboard, req.user._id);
  if (!hasAccess) {
    throw new ApiError('Not authorized to view this whiteboard', 403);
  }

  res.status(200).json({
    success: true,
    count: whiteboard.history.length,
    data: whiteboard.history
  });
});

// @desc    Get whiteboard collaborators
// @route   GET /api/whiteboards/:id/collaborators
// @access  Private
export const getCollaborators = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id)
    .select('owner collaborators')
    .populate('owner', 'name email')
    .populate('collaborators.user', 'name email');

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check access
  const hasAccess = checkAccess(whiteboard, req.user._id);
  if (!hasAccess) {
    throw new ApiError('Not authorized to view this whiteboard', 403);
  }

  res.status(200).json({
    success: true,
    data: {
      owner: whiteboard.owner,
      collaborators: whiteboard.collaborators
    }
  });
});

// @desc    Export whiteboard
// @route   GET /api/whiteboards/:id/export
// @access  Private
export const exportWhiteboard = asyncHandler(async (req, res) => {
  const whiteboard = await Whiteboard.findById(req.params.id);

  if (!whiteboard) {
    throw new ApiError('Whiteboard not found', 404);
  }

  // Check access
  const hasAccess = checkAccess(whiteboard, req.user._id);
  if (!hasAccess) {
    throw new ApiError('Not authorized to export this whiteboard', 403);
  }

  // Check if export is allowed
  if (!whiteboard.settings.allowExport) {
    throw new ApiError('Export is not allowed for this whiteboard', 403);
  }

  // Check if requested format is allowed
  if (!whiteboard.settings.exportFormats.includes(req.query.format)) {
    throw new ApiError('Requested export format is not allowed', 400);
  }

  // TODO: Implement actual export logic based on format
  const exportData = {
    format: req.query.format,
    data: whiteboard.toJSON()
  };

  res.status(200).json({
    success: true,
    data: exportData
  });
});

// Helper Functions

const checkAccess = (whiteboard, userId) => {
  const userIdStr = userId.toString();
  return (
    whiteboard.owner.toString() === userIdStr ||
    whiteboard.collaborators.some(c => c.user.toString() === userIdStr)
  );
};

const canEdit = (whiteboard, userId) => {
  const userIdStr = userId.toString();
  return (
    whiteboard.owner.toString() === userIdStr ||
    whiteboard.collaborators.some(
      c => c.user.toString() === userIdStr && c.role === 'editor'
    )
  );
};

export default {
  createWhiteboard,
  getWhiteboards,
  getWhiteboard,
  updateWhiteboard,
  deleteWhiteboard,
  addElement,
  updateElement,
  deleteElement,
  clearElements,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
  getHistory,
  getCollaborators,
  exportWhiteboard
};
