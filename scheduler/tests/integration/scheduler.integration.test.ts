import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CampaignOrchestrator } from '../../src/orchestrator.js';
import { Processor } from '../../src/processor.js';

// Mock external clients + env
vi.mock('../../src/clients/index.ts', () => ({ createClients: () => ({
  businessClient: { getAvailableMessages: vi.fn().mockResolvedValue({ daily: { EMAIL: 5 } }) },
  userClient: { getTargetingUsers: vi.fn().mockResolvedValue({ users: [{ id: 'u1', email: 'e', phone: 'p', name: 'n' }] }) },
  messagingClient: { schedule: vi.fn().mockResolvedValue({ ok: true }) },
}) }));
vi.mock('../../src/config/env.ts', () => ({ loadConfig: () => ({}) }));

function buildRepo() {
  return {
    findLatestCampaignExecution: vi.fn().mockResolvedValue(null),
    createCampaignExecution: vi.fn().mockResolvedValue({ id: 'exec1' }),
    findCampaignById: vi.fn().mockResolvedValue({ id: 'c1', businessId: 'b1', status: 'ACTIVE', steps: [{ id: 's1', channel: 'EMAIL', targetingRules: [{ database: 'USER' }], template: { subject: 'S', bodyText: 'B', bodyHtml: 'H' } }] }),
    createStepExecution: vi.fn().mockResolvedValue({ id: 'stepExec1' }),
    updateStepExecution: vi.fn().mockResolvedValue(undefined),
    updateCampaignExecution: vi.fn().mockResolvedValue(undefined),
    createStepExecutionRecipient: vi.fn().mockResolvedValue(undefined),
    findStepExecutionRecipient: vi.fn().mockResolvedValue(null),
    updateStepExecutionRecipient: vi.fn().mockResolvedValue(undefined),
    createOutboxEvent: vi.fn().mockResolvedValue({ id: 'evt1' }),
  } as any;
}

function buildQueue() { return { add: vi.fn().mockResolvedValue({ id: 'job1' }) } as any; }

describe('Scheduler Integration (mocked persistence)', () => {
  let repo: any; let queue: any; let orchestrator: CampaignOrchestrator; let processor: Processor;
  beforeEach(() => { repo = buildRepo(); queue = buildQueue(); orchestrator = new CampaignOrchestrator(repo, queue, { logger: { info: vi.fn() } }); processor = new Processor(repo); });

  test('orchestrator + processor full flow success', async () => {
    const enq = await orchestrator.enqueueIfDue({ id: 'c1', businessId: 'b1', status: 'ACTIVE', scheduleType: 'ONE_TIME' });
    expect(enq.enqueued).toBe(true);
    const jobPayload = queue.add.mock.calls[0][1];
    const res = await processor.processJob({ ...jobPayload });
    expect(res.failed).toBe(false);
  expect(Array.isArray(res.steps)).toBe(true);
  expect(res.steps.length).toBeGreaterThan(0);
  const first = res.steps[0]!;
  expect(first.scheduled).toBe(1);
  });

  test('execution retry path (failed step)', async () => {
    (repo.findCampaignById as any).mockResolvedValueOnce({ id: 'c1', businessId: 'b1', status: 'ACTIVE', steps: [{ id: 's1', channel: 'EMAIL', targetingRules: [{ database: 'USER' }], template: { subject: 'S', bodyText: 'B', bodyHtml: 'H' } }] });
    (repo.createStepExecution as any).mockResolvedValueOnce({ id: 'stepExec1' });
    // cause scheduling failure so failed branch triggers
    const clients = (processor as any).clients;
    clients.messagingClient.schedule.mockRejectedValueOnce(new Error('boom'));
    const res = await processor.processJob({ campaignId: 'c1', campaignExecutionId: 'exec1', businessId: 'b1', attempt: 0, maxAttempts: 2 });
    expect(res.failed).toBe(true);
    expect(res.finalFailure).toBe(false);
  });
});
