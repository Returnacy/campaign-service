import { Template } from '@campaign-service/types';

export type BuildScheduleInputParams = {
  campaignId: string;
  recipient: { id: string; email?: string; phone?: string; name?: string };
  channel: string;
  rendered: { subject?: string | null; bodyText?: string | null; bodyHtml?: string | null };
  template: Template;
  scheduledAt?: Date;
  from?: string;
}