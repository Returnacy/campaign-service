import { z } from 'zod';
import { SchedulePayload } from './zod/schedulePayloadSchema.js';

export type SchedulePayload = z.infer<typeof SchedulePayload>;