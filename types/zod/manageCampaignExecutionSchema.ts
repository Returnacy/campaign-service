import { z } from 'zod';

export const manageCampaignExecutionSchema = z.object({
  action: z.enum(['retry', 'stop']),
});
