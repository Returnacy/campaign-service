import { z } from 'zod';
import type { Channel } from '../channel.js';

export const updateStepTemplateSchema = z.object({
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WHATSAPP', 'VOICE']).optional() as z.ZodType<Channel>,
  subject: z.string().max(255).optional(),
  bodyText: z.string().max(5000).optional(),
  bodyHtml: z.string().max(10000).optional(),
});
