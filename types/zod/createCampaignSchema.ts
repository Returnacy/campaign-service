import { z } from 'zod';
import { createCampaignStepSchema } from './createCampaignStepSchema.js'
import type { RecurrenceRule } from '../recurrenceRule.js';
import type { ScheduleType } from '../scheduleType.js';

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  brandId: z.string().optional(),
  businessId: z.string().optional(),
  scheduleType: z.enum(['ONE_TIME', 'RECURRING']) as z.ZodType<ScheduleType>,
  recurrenceRule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']) as z.ZodType<RecurrenceRule>,
  steps: z.array(createCampaignStepSchema).min(1),
});