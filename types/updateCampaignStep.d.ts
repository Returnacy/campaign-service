import { z } from 'zod';
import { updateCampaignStepSchema } from './zod/updateCampaignStepSchema.js';

export type UpdateCampaignStep = z.infer<typeof updateCampaignStepSchema>;