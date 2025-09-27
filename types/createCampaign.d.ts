import { z } from "zod";
import { createCampaignSchema } from "./zod/createCampaignSchema.js";

export type CreateCampaign = z.infer<typeof createCampaignSchema>;