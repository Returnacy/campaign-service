import { describe, it, expect } from 'vitest';
import { createEvent, validateEvent, EventTypes } from '@returnacy/event-contracts';

describe('event-contracts (campaign-service)', () => {
  it('creates and validates campaign.step.ready event', () => {
    const evt = createEvent({
      type: EventTypes.CAMPAIGN_STEP_READY,
      version: 1,
      producer: 'campaign-service.scheduler',
      payload: {
        stepExecutionId: 'se_123',
        campaignId: 'c_456',
        businessId: 'b_789',
        channel: 'EMAIL',
        batchSize: 10
      }
    });
    const res = validateEvent(evt);
    expect(res.ok).toBe(true);
    expect(res.event?.payload.campaignId).toBe('c_456');
  });

  it('rejects invalid payload (missing batchSize)', () => {
    const bad: any = {
      id: '00000000-0000-4000-8000-000000000000',
      type: EventTypes.CAMPAIGN_STEP_READY,
      version: 1,
      occurredAt: new Date().toISOString(),
      producer: 'campaign-service.scheduler',
      schemaVersion: 1,
      payload: { stepExecutionId: 'x', campaignId: 'c', businessId: 'b', channel: 'EMAIL' }
    };
    const res = validateEvent(bad);
    expect(res.ok).toBe(false);
  });
});
