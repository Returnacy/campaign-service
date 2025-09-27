import { z } from 'zod';
import { manageCampaignSchema } from './zod/manageCampaignSchema.js';

export type ManageCampaign = z.infer<typeof manageCampaignSchema>;