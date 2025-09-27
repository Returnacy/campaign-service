import { z } from 'zod';

export const manageCampaignSchema = z.object({
  action: z.enum(["start", "stop", "pause", "resume", "reschedule"]),
  payload: z.object({
    startAt: z.string().optional(),
    endAt: z.string().optional(),
  }).optional(),
});