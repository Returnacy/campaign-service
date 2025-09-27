import { Operator } from "./operator.js";
import { Database } from "./database.js";

export type TargetingRule = {
  id: string;
  campaignStepId: string;
  database: Database;
  field: string;
  operator: Operator;
  value: any;
  createdAt: Date;
}