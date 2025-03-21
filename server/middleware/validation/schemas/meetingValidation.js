import { z } from 'zod';

export const createMeetingSchema = z.object({
  body: z.object({
    title: z.string()
      .min(2, 'Title must be at least 2 characters')
      .max(100, 'Title cannot exceed 100 characters'),
    description: z.string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
    scheduledStart: z.string()
      .refine(val => !isNaN(Date.parse(val)), 'Invalid date format'),
    duration: z.number()
      .min(5, 'Duration must be at least 5 minutes')
      .max(480, 'Duration cannot exceed 480 minutes'),
    settings: z.object({
      enableVideo: z.boolean().optional(),
      enableAudio: z.boolean().optional(),
      enableChat: z.boolean().optional(),
      enableScreenShare: z.boolean().optional(),
      enableRecording: z.boolean().optional(),
      enableWhiteboard: z.boolean().optional(),
      waitingRoom: z.boolean().optional(),
      requirePassword: z.boolean().optional(),
      password: z.string().optional(),
      maxParticipants: z.number()
        .min(2, 'Meeting must allow at least 2 participants')
        .max(100, 'Meeting cannot exceed 100 participants')
        .optional()
    }).optional(),
    recurrence: z.object({
      pattern: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().min(1).max(52),
      endDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format')
    }).optional()
  })
});

export const updateMeetingSchema = z.object({
  body: z.object({
    title: z.string()
      .min(2, 'Title must be at least 2 characters')
      .max(100, 'Title cannot exceed 100 characters')
      .optional(),
    description: z.string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
    scheduledStart: z.string()
      .refine(val => !isNaN(Date.parse(val)), 'Invalid date format')
      .optional(),
    duration: z.number()
      .min(5, 'Duration must be at least 5 minutes')
      .max(480, 'Duration cannot exceed 480 minutes')
      .optional(),
    settings: z.object({
      enableVideo: z.boolean().optional(),
      enableAudio: z.boolean().optional(),
      enableChat: z.boolean().optional(),
      enableScreenShare: z.boolean().optional(),
      enableRecording: z.boolean().optional(),
      enableWhiteboard: z.boolean().optional(),
      waitingRoom: z.boolean().optional(),
      requirePassword: z.boolean().optional(),
      password: z.string().optional(),
      maxParticipants: z.number()
        .min(2, 'Meeting must allow at least 2 participants')
        .max(100, 'Meeting cannot exceed 100 participants')
        .optional()
    }).optional(),
    recurrence: z.object({
      pattern: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().min(1).max(52),
      endDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date format')
    }).optional()
  })
});

export const participantSchema = z.object({
  body: z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
    role: z.enum(['host', 'cohost', 'participant']).optional(),
    permissions: z.object({
      canVideo: z.boolean().optional(),
      canAudio: z.boolean().optional(),
      canChat: z.boolean().optional(),
      canScreenShare: z.boolean().optional(),
      canRecord: z.boolean().optional(),
      canWhiteboard: z.boolean().optional()
    }).optional()
  })
});

export const querySchema = z.object({
  query: z.object({
    sort: z.string().optional(),
    limit: z.string()
      .refine(val => !isNaN(parseInt(val)), 'Limit must be a number')
      .refine(val => parseInt(val) > 0, 'Limit must be positive')
      .optional(),
    skip: z.string()
      .refine(val => !isNaN(parseInt(val)), 'Skip must be a number')
      .refine(val => parseInt(val) >= 0, 'Skip must be non-negative')
      .optional(),
    filter: z.object({
      status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).optional(),
      fromDate: z.string()
        .refine(val => !isNaN(Date.parse(val)), 'Invalid from date')
        .optional(),
      toDate: z.string()
        .refine(val => !isNaN(Date.parse(val)), 'Invalid to date')
        .optional(),
      hasRecording: z.boolean().optional()
    }).optional()
  })
});

export default {
  createMeetingSchema,
  updateMeetingSchema,
  participantSchema,
  querySchema
};
