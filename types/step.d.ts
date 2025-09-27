import { Channel } from "./channel.js";
import { TargetingRule } from "./targetingRule.js";
import { Template } from "./template.js";

export type Step = {
  id: string;
  campaignId: string;
  stepOrder: number;
  name: string;
  description: string | null;
  channel: Channel;
  createdAt: Date;
  updatedAt: Date;
  template: Template;
  targetingRules: TargetingRule[];
}