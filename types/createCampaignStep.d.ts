import { z } from "zod";
import { createCampaignStepSchema } from "./zod/createCampaignStepSchema.js";

export type CreateCampaignStep = z.infer<typeof createCampaignStepSchema>;