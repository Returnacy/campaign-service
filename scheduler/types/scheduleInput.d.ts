import { z } from 'zod';
import { ScheduleInput } from './zod/scheduleInputSchema.js';

export type ScheduleInput = z.infer<typeof ScheduleInput>;