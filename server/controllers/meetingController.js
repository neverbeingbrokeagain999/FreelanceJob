import { Meeting } from '../models/Meeting.js';
import { ApiError } from '../utils/errorHandler.js';
import asyncHandler from '../middleware/async.js';
import { Whiteboard } from '../models/Whiteboard.js';
import chatHandler from '../socketHandlers/chatHandler.js';
const { broadcastSystemMessage } = chatHandler;

// @desc    Create a new meeting
// @route   POST /api/meetings
// @access  Private
export const createMeeting = asyncHandler(async (req, res) => {
  // Add host to the request body
  req.body.host = req.user._id;

  // Create whiteboard if enabled
  if (req.body.settings?.enableWhiteboard) {
    const whiteboard = await Whiteboard.create({
      owner: req.user._id,
      title: `Whiteboard for ${req.body.title}`,
      type: 'meeting'
    });
    req.body.whiteboard = whiteboard._id;
  }

  const meeting = await Meeting.create(req.body);
  
  // Add host as first participant
  await meeting.addParticipant(req.user._id, 'host');

  res.status(201).json({ success: true, data: meeting });
});

// @desc    Get meetings (with filters)
// @route   GET /api/meetings
// @access  Private
export const getMeetings = asyncHandler(async (req, res) => {
  const { status, fromDate, toDate, hasRecording } = req.query.filter || {};
  const query = { $or: [{ host: req.user._id }, { 'participants.user': req.user._id }] };

  // Apply filters
  if (status) query.status = status;
  if (fromDate) query.scheduledStart = { $gte: new Date(fromDate) };
  if (toDate) query.scheduledStart = { ...query.scheduledStart, $lte: new Date(toDate) };
  if (hasRecording === 'true') query['recordings.0'] = { $exists: true };

  const meetings = await Meeting.find(query)
    .populate('host', 'name email')
    .populate('participants.user', 'name email')
    .sort({ scheduledStart: 'desc' });

  res.status(200).json({
    success: true,
    count: meetings.length,
    data: meetings
  });
});

// @desc    Get single meeting
// @route   GET /api/meetings/:id
// @access  Private
export const getMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id)
    .populate('host', 'name email')
    .populate('participants.user', 'name email')
    .populate('whiteboard');

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  // Check if user has access
  const isParticipant = meeting.participants.some(p => 
    p.user._id.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    throw new ApiError('Not authorized to access this meeting', 403);
  }

  res.status(200).json({ success: true, data: meeting });
});

// @desc    Update meeting
// @route   PUT /api/meetings/:id
// @access  Private
export const updateMeeting = asyncHandler(async (req, res) => {
  let meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  // Make sure user is meeting host
  if (meeting.host.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized to update this meeting', 403);
  }

  // Handle whiteboard changes
  if (req.body.settings?.enableWhiteboard && !meeting.whiteboard) {
    const whiteboard = await Whiteboard.create({
      owner: req.user._id,
      title: `Whiteboard for ${meeting.title}`,
      type: 'meeting'
    });
    req.body.whiteboard = whiteboard._id;
  }

  meeting = await Meeting.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: meeting });
});

// @desc    Delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private
export const deleteMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  // Make sure user is meeting host
  if (meeting.host.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized to delete this meeting', 403);
  }

  // Delete associated whiteboard if exists
  if (meeting.whiteboard) {
    await Whiteboard.findByIdAndDelete(meeting.whiteboard);
  }

  await meeting.remove();

  res.status(200).json({ success: true, data: {} });
});

// @desc    Add participant to meeting
// @route   POST /api/meetings/:id/participants
// @access  Private
export const addParticipant = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  // Only host and cohosts can add participants
  const currentParticipant = meeting.participants.find(p => 
    p.user.toString() === req.user._id.toString()
  );

  if (!['host', 'cohost'].includes(currentParticipant?.role)) {
    throw new ApiError('Not authorized to add participants', 403);
  }

  await meeting.addParticipant(req.body.userId, req.body.role);

  res.status(200).json({
    success: true,
    data: meeting
  });
});

// @desc    Remove participant from meeting
// @route   DELETE /api/meetings/:id/participants/:userId
// @access  Private
export const removeParticipant = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  // Only host can remove participants or user can remove themselves
  const isHost = meeting.host.toString() === req.user._id.toString();
  const isSelf = req.params.userId === req.user._id.toString();

  if (!isHost && !isSelf) {
    throw new ApiError('Not authorized to remove participants', 403);
  }

  await meeting.removeParticipant(req.params.userId);

  // Notify room if participant was removed
  if (!isSelf) {
    broadcastSystemMessage(req.io, req.params.id, 'participant-removed', {
      userId: req.params.userId,
      removedBy: req.user._id
    });
  }

  res.status(200).json({
    success: true,
    data: meeting
  });
});

// @desc    Update participant role
// @route   PUT /api/meetings/:id/participants/:userId
// @access  Private
export const updateParticipantRole = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  // Only host can update roles
  if (meeting.host.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized to update participant roles', 403);
  }

  await meeting.updateParticipantRole(req.params.userId, req.body.role);

  res.status(200).json({
    success: true,
    data: meeting
  });
});

// @desc    End meeting
// @route   POST /api/meetings/:id/end
// @access  Private
export const endMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  // Only host can end meeting
  if (meeting.host.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized to end meeting', 403);
  }

  await meeting.end();

  // Notify all participants
  broadcastSystemMessage(req.io, req.params.id, 'meeting-ended', {
    endedBy: req.user._id,
    endedAt: new Date().toISOString()
  });

  res.status(200).json({
    success: true,
    data: meeting
  });
});

// @desc    Get meeting recordings
// @route   GET /api/meetings/:id/recordings
// @access  Private
export const getRecordings = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id)
    .select('recordings host participants');

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  // Check if user has access
  const isParticipant = meeting.participants.some(p => 
    p.user.toString() === req.user._id.toString()
  );

  if (!isParticipant) {
    throw new ApiError('Not authorized to access recordings', 403);
  }

  res.status(200).json({
    success: true,
    count: meeting.recordings.length,
    data: meeting.recordings
  });
});

export default {
  createMeeting,
  getMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  addParticipant,
  removeParticipant,
  updateParticipantRole,
  endMeeting,
  getRecordings
};
