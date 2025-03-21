import express from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validation/validator.js';
import {
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
} from '../controllers/meetingController.js';
import {
  createMeetingSchema,
  updateMeetingSchema,
  participantSchema,
  querySchema
} from '../middleware/validation/schemas/meetingValidation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Meeting CRUD routes
router.route('/')
  .post(validate(createMeetingSchema), createMeeting)
  .get(validate(querySchema, 'query'), getMeetings);

router.route('/:id')
  .get(getMeeting)
  .put(validate(updateMeetingSchema), updateMeeting)
  .delete(deleteMeeting);

// Participant management routes
router.route('/:id/participants')
  .post(validate(participantSchema), addParticipant);

router.route('/:id/participants/:userId')
  .delete(removeParticipant)
  .put(validate(participantSchema), updateParticipantRole);

// Meeting control routes
router.route('/:id/end')
  .post(endMeeting);

// Recording routes
router.route('/:id/recordings')
  .get(getRecordings);

export const meetingRouter = router;

export default router;
