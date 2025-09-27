import { z } from "zod";

export const SchedulePayload = z.object({
  subject: z.string().min(2).max(100).optional(),
  bodyHtml: z.string().min(2).max(1000).optional(),
  bodyText: z.string().min(2).max(1000).optional(),
  from: z.string().min(2).max(100),
  to: z.object({
    email: z.string().email().optional(),
    phone: z.string().min(10).max(15).optional(),
    name: z.string().min(2).max(100).optional(),
  }),
});