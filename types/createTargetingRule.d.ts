import { z } from 'zod';
import { createTargetingRuleSchema } from './zod/createTargetingRuleSchema.js';

export type CreateTargetingRule = z.infer<typeof createTargetingRuleSchema>;