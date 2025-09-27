import type { ScheduleInput } from '../../types/scheduleInput.js';
import type { Template } from '@campaign-service/types';
import type { BuildScheduleInputParams } from '../../types/buildScheduleInputParams.js';

export function buildScheduleInput(params: BuildScheduleInputParams): ScheduleInput {
  const scheduledAt = params.scheduledAt || new Date();
  return {
    campaignId: params.campaignId,
    recipientId: params.recipient.id,
    channel: params.channel as any,
    scheduledAt,
    payload: {
      subject: params.rendered.subject ?? undefined,
      bodyText: params.rendered.bodyText ?? undefined,
      bodyHtml: params.rendered.bodyHtml ?? undefined,
      from: params.from || 'noreply@example.com',
      to: {
        email: params.recipient.email,
        phone: params.recipient.phone,
        name: params.recipient.name,
      }
    },
    maxAttempts: 1,
  };
}