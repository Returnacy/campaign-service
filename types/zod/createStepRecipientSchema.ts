import { z } from 'zod';
import type { StepRecipientStatus } from '../recipientStatus.js';

export const createStepRecipientSchema = z.object({
  stepExecutionId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['PENDING', 'SCHEDULED', 'SENT', 'DELIVERED', 'FAILED']) as z.ZodType<StepRecipientStatus>,
  enqueuedAt: z.date().nullable().optional(),
  sentAt: z.date().nullable().optional(),
  deliveredAt: z.date().nullable().optional(),
  attempts: z.number().min(0).default(0).optional(),
  externalMessageId: z.string().nullable().optional(),
});