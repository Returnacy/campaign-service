import { z } from 'zod';
import { SchedulePayload } from './schedulePayloadSchema.js';

// Messaging schedule input (mirror of messaging-service schedule.schema.ts)
export const ScheduleInput = z.object({
  campaignId: z.string().uuid().optional(),
  recipientId: z.string().uuid(),
  channel: z.enum(['EMAIL', 'SMS']),
  payload: SchedulePayload,
  scheduledAt: z.date(),
  maxAttempts: z.number().min(1).default(1),
});