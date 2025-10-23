import { z } from 'zod';
import type { Channel } from '../channel.js';

export const updateCampaignStepSchema = z.object({
  campaignId: z.string().optional(),
  stepOrder: z.number().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WHATSAPP', 'VOICE']).optional() as z.ZodType<Channel>,
  prize: z.object({ id: z.string().min(1) }).optional(),
});