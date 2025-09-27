import { Status } from "./status.js";
import { ScheduleType } from "./scheduleType.js";
import { Step } from "./step.js";

export type Campaign = {
  id: string;
  businessId: string | null;
  brandId: string | null;
  name: string;
  description: string | null;
  status: Status;
  scheduleType: ScheduleType;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  steps: Step[];
}