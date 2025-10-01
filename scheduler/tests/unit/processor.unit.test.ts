import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Processor } from '../../src/processor.js';

function buildRepo(overrides: any = {}) {
  return {
    findCampaignById: vi.fn(),
    createStepExecution: vi.fn(),
    updateStepExecution: vi.fn().mockResolvedValue(undefined),
    updateCampaignExecution: vi.fn().mockResolvedValue(undefined),
    createStepExecutionRecipient: vi.fn(),
    findStepExecutionRecipient: vi.fn(),
    updateStepExecutionRecipient: vi.fn(),
    createOutboxEvent: vi.fn().mockResolvedValue({ id: 'evt1' }),
    ...overrides,
  } as any;
}

function makeClients(overrides: any = {}) {
  return {
    businessClient: { getAvailableMessages: vi.fn().mockResolvedValue({ daily: { EMAIL: 100 } }) },
    userClient: { getTargetingUsers: vi.fn().mockResolvedValue({ users: [{ id: 'u1', email: 'e', phone: 'p', name: 'n' }] }) },
    messagingClient: { schedule: vi.fn().mockResolvedValue({ ok: true }) },
    ...overrides,
  };
}

vi.mock('../../src/clients/index.ts', () => ({ createClients: () => makeClients() }));
vi.mock('../../src/config/env.ts', () => ({ loadConfig: () => ({}) }));

describe('Processor.processJob', () => {
  let repo: any;
  let processor: Processor;

  beforeEach(() => {
    repo = buildRepo();
    processor = new Processor(repo);
  });

  test('invalid payload throws', async () => {
    // @ts-ignore
    await expect(processor.processJob({})).rejects.toThrow('Invalid processor payload');
  });

  test('campaign not found returns failed finalFailure', async () => {
    repo.findCampaignById.mockResolvedValueOnce(null);
    const res = await processor.processJob({ campaignId: 'c1', campaignExecutionId: 'e1', businessId: 'b1' });
    expect(res.failed).toBe(true);
    expect(res.finalFailure).toBe(true);
  });

  test('status not active skipped', async () => {
    repo.findCampaignById.mockResolvedValueOnce({ status: 'DRAFT' });
    const res = await processor.processJob({ campaignId: 'c1', campaignExecutionId: 'e1', businessId: 'b1' });
    expect(res.skipped).toBe(true);
  });

  test('step with no capacity skipped', async () => {
    repo.findCampaignById.mockResolvedValueOnce({ status: 'ACTIVE', steps: [{ id: 's1', channel: 'EMAIL', targetingRules: [{ database: 'USER' }], template: { subject: '', bodyText: '', bodyHtml: '' } }] });
    // override businessClient to return zero
    (processor as any).clients.businessClient.getAvailableMessages.mockResolvedValueOnce({ daily: { EMAIL: 0 } });
    repo.createStepExecution.mockResolvedValueOnce({ id: 'stepExec1' });
    const res = await processor.processJob({ campaignId: 'c1', campaignExecutionId: 'e1', businessId: 'b1' });
  expect(Array.isArray(res.steps)).toBe(true);
  expect(res.steps.length).toBeGreaterThan(0);
  const first1 = res.steps[0]!;
  expect(first1.skipped).toBe(true);
    expect(res.failed).toBe(false);
  });

  test('happy path schedules user', async () => {
    repo.findCampaignById.mockResolvedValueOnce({ id: 'c1', status: 'ACTIVE', businessId: 'b1', steps: [{ id: 's1', channel: 'EMAIL', targetingRules: [{ database: 'USER' }], template: { subject: 'a', bodyText: 'b', bodyHtml: 'c' } }] });
    repo.createStepExecution.mockResolvedValueOnce({ id: 'stepExec1' });
    const res = await processor.processJob({ campaignId: 'c1', campaignExecutionId: 'e1', businessId: 'b1' });
  expect(Array.isArray(res.steps)).toBe(true);
  expect(res.steps.length).toBeGreaterThan(0);
  const first2 = res.steps[0]!;
  expect(first2.scheduled).toBe(1);
    expect(res.failed).toBe(false);
  });

  test('partial failure path', async () => {
    repo.findCampaignById.mockResolvedValueOnce({ id: 'c1', status: 'ACTIVE', businessId: 'b1', steps: [{ id: 's1', channel: 'EMAIL', targetingRules: [{ database: 'USER' }], template: { subject: 'a', bodyText: 'b', bodyHtml: 'c' } }] });
    repo.createStepExecution.mockResolvedValueOnce({ id: 'stepExec1' });
    // fail scheduling
    (processor as any).clients.messagingClient.schedule.mockRejectedValueOnce(new Error('boom'));
    const res = await processor.processJob({ campaignId: 'c1', campaignExecutionId: 'e1', businessId: 'b1' });
    expect(res.failed).toBe(true);
  expect(Array.isArray(res.steps)).toBe(true);
  expect(res.steps.length).toBeGreaterThan(0);
  const first3 = res.steps[0]!;
  expect(first3.failed).toBe(1);
  });
});
