import { z } from 'zod';
import { updateStepTemplateSchema } from './zod/updateStepTemplateSchema.js';

export type UpdateStepTemplate = z.infer<typeof updateStepTemplateSchema>;