import { z } from 'zod';
import type { RecurrenceRule } from '../recurrenceRule.js';
import type { ScheduleType } from '../scheduleType.js';

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  brandId: z.string().optional(),
  businessId: z.string().optional(),
  scheduleType: z.enum(['ONE_TIME', 'RECURRING']).optional() as z.ZodType<ScheduleType>,
  recurrenceRule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional() as z.ZodType<RecurrenceRule>,
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable()
});