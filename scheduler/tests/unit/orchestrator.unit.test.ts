import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CampaignOrchestrator } from '../../src/orchestrator.js';

function buildRepo(overrides: any = {}) {
  return {
    findLatestCampaignExecution: vi.fn(),
    createCampaignExecution: vi.fn().mockResolvedValue({ id: 'exec1' }),
    ...overrides,
  } as any;
}

function buildQueue() {
  return { add: vi.fn().mockResolvedValue({ id: 'job1' }) } as any;
}

describe('CampaignOrchestrator.enqueueIfDue', () => {
  let logger: any;
  beforeEach(() => { logger = { info: vi.fn(), warn: vi.fn() }; });

  test('skips null campaign', async () => {
    const o = new CampaignOrchestrator(buildRepo(), buildQueue(), { logger });
    const res = await o.enqueueIfDue(null);
    expect(res.skipped).toBe(true);
  });

  test('skips non ACTIVE campaign', async () => {
    const o = new CampaignOrchestrator(buildRepo(), buildQueue(), { logger });
    const res = await o.enqueueIfDue({ id: 'c1', status: 'DRAFT' });
    expect(res.reason).toBe('status-not-active');
  });

  test('one-time already executed skips', async () => {
    const repo = buildRepo({ findLatestCampaignExecution: vi.fn().mockResolvedValue({ id: 'execX' }) });
    const o = new CampaignOrchestrator(repo, buildQueue(), { logger });
    const res = await o.enqueueIfDue({ id: 'c1', status: 'ACTIVE', scheduleType: 'ONE_TIME', businessId: 'b1' });
    expect(res.reason).toBe('one-time-already-executed');
  });

  test('recurring not due skips', async () => {
    const repo = buildRepo({ findLatestCampaignExecution: vi.fn().mockResolvedValue({ runAt: new Date().toISOString() }) });
    const o = new CampaignOrchestrator(repo, buildQueue(), { logger });
    const res = await o.enqueueIfDue({ id: 'c1', status: 'ACTIVE', scheduleType: 'RECURRING', recurrenceRule: 'DAILY', businessId: 'b1' });
    expect(res.reason).toBe('recurrence-not-due');
  });

  test('recurring due enqueues', async () => {
    const old = new Date(Date.now() - 25*60*60*1000).toISOString();
    const repo = buildRepo({ findLatestCampaignExecution: vi.fn().mockResolvedValue({ runAt: old }) });
    const queue = buildQueue();
    const o = new CampaignOrchestrator(repo, queue, { logger });
    const res = await o.enqueueIfDue({ id: 'c1', status: 'ACTIVE', scheduleType: 'RECURRING', recurrenceRule: 'DAILY', businessId: 'b1' });
    expect(res.enqueued).toBe(true);
    expect(queue.add).toHaveBeenCalled();
  });

  test('on error in gating still proceeds', async () => {
    const repo = buildRepo({ findLatestCampaignExecution: vi.fn().mockRejectedValue(new Error('boom')) });
    const queue = buildQueue();
    const o = new CampaignOrchestrator(repo, queue, { logger });
    const res = await o.enqueueIfDue({ id: 'c1', status: 'ACTIVE', scheduleType: 'ONE_TIME', businessId: 'b1' });
    expect(res.enqueued).toBe(true);
  });
});
