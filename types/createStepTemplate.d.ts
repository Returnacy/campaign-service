import { z } from "zod";
import { createStepTemplateSchema } from "./zod/createStepTemplateSchema.js";

export type CreateStepTemplate = z.infer<typeof createStepTemplateSchema>;