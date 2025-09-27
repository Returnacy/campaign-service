import { z } from 'zod';
import { manageCampaignExecutionSchema } from './zod/manageCampaignExecutionSchema.js';

export type ManageCampaignExecution = z.infer<typeof manageCampaignExecutionSchema>;
