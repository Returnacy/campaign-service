import { z } from 'zod';
import type { Channel } from '../channel.js';

export const createStepTemplateSchema = z.object({
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WHATSAPP', 'VOICE']) as z.ZodType<Channel>,
  subject: z.string().min(1).max(200).optional(),
  bodyText: z.string().min(1).max(5000),
  bodyHtml: z.string().min(1).max(10000).optional(),
});