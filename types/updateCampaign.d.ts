import { z } from 'zod';
import { updateCampaignSchema } from './zod/updateCampaignSchema.js';

export type UpdateCampaign = z.infer<typeof updateCampaignSchema>;