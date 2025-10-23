import type { ScheduleInput } from '../../types/scheduleInput.js';
import type { BuildScheduleInputParams } from '../../types/buildScheduleInputParams.js';

export function buildScheduleInput(params: BuildScheduleInputParams): ScheduleInput {
  const scheduledAt = params.scheduledAt || new Date();
  const subj = params.rendered.subject ?? undefined;
  const bodyText = params.rendered.bodyText ?? '';
  const bodyHtml = params.rendered.bodyHtml ?? undefined;
  // Guard: messaging-service schema requires bodyText non-empty
  const safeBodyText = bodyText && bodyText.length > 0 ? bodyText : ' ';
  return {
    campaignId: params.campaignId,
    recipientId: params.recipient.id,
    channel: params.channel as any,
    scheduledAt,
    payload: {
      subject: subj,
      bodyText: safeBodyText,
      bodyHtml: bodyHtml,
      from: params.from || 'noreply@example.com',
      to: {
        email: params.recipient.email,
        phone: params.recipient.phone,
        name: params.recipient.name || 'Customer',
      }
    },
    maxAttempts: 1,
  };
}