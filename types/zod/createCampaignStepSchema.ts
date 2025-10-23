import { z } from 'zod';
import { createTargetingRuleSchema } from './createTargetingRuleSchema.js';
import { createStepTemplateSchema } from './createStepTemplateSchema.js';
import type { Channel } from '../channel.js';

export const createCampaignStepSchema = z.object({
  campaignId: z.string().optional(),
  stepOrder: z.number().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WHATSAPP', 'VOICE']) as z.ZodType<Channel>,
  template: createStepTemplateSchema,
  prize: z.object({ id: z.string().min(1) }).optional(),
  targetingRules: z.array(createTargetingRuleSchema).optional(),
});