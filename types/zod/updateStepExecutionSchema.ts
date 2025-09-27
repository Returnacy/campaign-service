import { z } from 'zod';
import type { ExecutionStatus } from '../executionStatus.js';

export const updateStepExecutionSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED']) as z.ZodType<ExecutionStatus>,
  errorMessage: z.string().max(1000).optional(),
});