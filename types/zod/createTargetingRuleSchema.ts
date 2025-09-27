import { z } from 'zod';
import type { Database } from '../database.js';
import type { Operator } from '../operator.js';

export const createTargetingRuleSchema = z.object({
  database: z.enum(['USER', 'MESSAGING', 'CAMPAIGN']) as z.ZodType<Database>,
  field: z.string().min(1).max(100),
  operator: z.enum(['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'GREATER_THAN', 'LESS_THAN', 'IN', 'NOT_IN']) as z.ZodType<Operator>,
  value: z.any(),
});