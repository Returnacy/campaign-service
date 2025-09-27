import { z } from 'zod';
import { updateStepExecutionSchema } from './zod/updateStepExecutionSchema.js';

export type UpdateStepExecution = z.infer<typeof updateStepExecutionSchema>;