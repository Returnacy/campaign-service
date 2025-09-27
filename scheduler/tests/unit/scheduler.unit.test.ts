import { describe, test, expect, vi, beforeEach } from 'vitest';
import { scheduler } from '../../src/scheduler.js';

vi.mock('../../src/queue.ts', () => ({ createQueue: () => ({ add: vi.fn() }) }));

function buildRepo(overrides: any = {}) {
  return {
    findDueActiveCampaigns: vi.fn().mockResolvedValue([{ id: 'c1' }]),
    findCampaignById: vi.fn().mockResolvedValue({ id: 'c1', status: 'ACTIVE', businessId: 'b1', scheduleType: 'ONE_TIME' }),
    ...overrides,
  };
}

vi.mock('@campaign-service/db', () => ({ RepositoryPrisma: vi.fn().mockImplementation(() => buildRepo()) }));

import { RepositoryPrisma } from '@campaign-service/db';
import { CampaignOrchestrator } from '../../src/orchestrator.js';

vi.spyOn(CampaignOrchestrator.prototype, 'enqueueIfDue').mockResolvedValue({ enqueued: true, executionId: 'exec1' });

describe('scheduler', () => {
  beforeEach(() => {
    (CampaignOrchestrator.prototype.enqueueIfDue as any).mockClear();
  });
  test('enqueues campaigns', async () => {
    await scheduler({ redisConnection: {}, businessIds: ['b1'], logger: { info: vi.fn() } });
    expect(CampaignOrchestrator.prototype.enqueueIfDue).toHaveBeenCalled();
  });

  test('skips missing campaign details', async () => {
    (RepositoryPrisma as any).mockImplementationOnce(() => buildRepo({ findCampaignById: vi.fn().mockResolvedValue(null) }));
    await scheduler({ redisConnection: {}, businessIds: ['b1'], logger: { info: vi.fn() } });
    expect(CampaignOrchestrator.prototype.enqueueIfDue).toHaveBeenCalledTimes(0);
  });
});
