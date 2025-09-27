import { z } from 'zod';
import { createStepRecipientSchema } from './zod/createStepRecipientSchema.js';

export type CreateStepRecipient = z.infer<typeof createStepRecipientSchema>;