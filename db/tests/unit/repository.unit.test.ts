import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { RepositoryPrisma } from '../../src/repository.prisma.js';
import { prisma } from '../../src/prismaClient.js';

// Utility to create a shallow mock function if not already mocked
function ensureMock<T extends object, K extends keyof T & string>(obj: T, key: K) {
  const current: any = (obj as any)[key];
  // If method doesn't exist (some delegates may differ or have been tree-shaken), create a stub.
  if (typeof current !== 'function') {
    (obj as any)[key] = vi.fn().mockResolvedValue(undefined);
    return;
  }
  // If it's a real function but not yet a mock, spy on it so we can control return values in tests.
  if (!current._isMockFunction) {
    vi.spyOn(obj as any, key).mockResolvedValue(undefined);
  }
}

// Ensure all prisma model methods we touch are spyable
const campaignModelMethods = ['findMany','findUnique','findFirst','create','update','delete','count'];
const stepModelMethods = ['findMany','findFirst','findUnique','create','update','delete','count'];
const executionModelMethods = ['findFirst','findMany','findUnique','create','update','count'];
const stepExecutionModelMethods = ['findFirst','findMany','findUnique','create','update','count'];
const stepRecipientModelMethods = ['findFirst','findMany','findUnique','create','update','count'];
const stepTemplateModelMethods = ['findFirst','findMany','create','update','delete'];
const auditLogModelMethods = ['deleteMany'];
const targetingRuleModelMethods = ['deleteMany'];

function mockModel(modelName: keyof typeof prisma, methods: string[]) {
  const model: any = (prisma as any)[modelName];
  if (!model) return;
  methods.forEach(m => ensureMock(model, m as any));
}

function resetAll() {
  vi.restoreAllMocks();
  mockModel('campaign', campaignModelMethods);
  mockModel('campaignStep', stepModelMethods);
  mockModel('campaignExecution', executionModelMethods);
  mockModel('stepExecution', stepExecutionModelMethods);
  mockModel('stepRecipient', stepRecipientModelMethods);
  mockModel('stepTemplate', stepTemplateModelMethods);
  mockModel('campaignAuditLog', auditLogModelMethods);
  mockModel('targetingRule', targetingRuleModelMethods);
}

// Minimal fake entities
const baseCampaign = { id: 'camp1', businessId: 'biz1', status: 'ACTIVE', scheduleType: 'ONE_TIME', recurrenceRule: null } as any;
const baseStep = { id: 'step1', campaignId: 'camp1', stepOrder: 1, channel: 'EMAIL', template: { id: 'tmpl1' } } as any;
const baseTemplate = { id: 'tmpl1', subject: 'subj', bodyText: 'txt', bodyHtml: '<p>html</p>' } as any;
const baseExecution = { id: 'exec1', campaignId: 'camp1', status: 'RUNNING', runAt: new Date() } as any;
const baseStepExecution = { id: 'sexec1', campaignStepId: 'step1', status: 'RUNNING', runAt: new Date() } as any;
const baseRecipient = { id: 'rec1', stepExecutionId: 'sexec1', userId: 'user1', status: 'PENDING' } as any;

describe('RepositoryPrisma Unit', () => {
  const repo = new RepositoryPrisma();

  beforeEach(() => {
    resetAll();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('healthCheck executes raw query', async () => {
    const qSpy = vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ '1': 1 }] as any);
    const res = await repo.healthCheck();
    expect(res.db).toBe(true);
    expect(qSpy).toHaveBeenCalled();
  });

  test('findDueActiveCampaigns filters by ACTIVE and window', async () => {
    const fSpy = vi.spyOn(prisma.campaign, 'findMany').mockResolvedValueOnce([{ id: 'x' }] as any);
    const now = new Date();
    const res = await repo.findDueActiveCampaigns(now);
    expect(res).toEqual([{ id: 'x' }]);
    expect(fSpy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
  });

  test('findCampaignById includes steps with template + targetingRules', async () => {
    const ret = { ...baseCampaign, steps: [{ ...baseStep, template: baseTemplate, targetingRules: [] }] };
    vi.spyOn(prisma.campaign, 'findUnique').mockResolvedValueOnce(ret as any);
    const found = await repo.findCampaignById('camp1', ['biz1']);
    expect((found as any)?.steps?.[0]?.template).toBeTruthy();
  });

  test('findCampaignsByBusinessId returns list', async () => {
    vi.spyOn(prisma.campaign, 'findMany').mockResolvedValueOnce([baseCampaign]);
    const list = await repo.findCampaignsByBusinessId('biz1');
    expect(list.length).toBe(1);
  });

  test('findCampaignsByBrandId returns list', async () => {
    const brandCampaign = { ...baseCampaign, id: 'camp2', businessId: null, brandId: 'brand1' } as any;
    vi.spyOn(prisma.campaign, 'findMany').mockResolvedValueOnce([brandCampaign]);
    const list = await repo.findCampaignsByBrandId('brand1');
    expect(list.length).toBe(1);
  });

  test('createCampaign maps steps, template and targetingRules', async () => {
    const createSpy = vi.spyOn(prisma.campaign, 'create').mockResolvedValueOnce(baseCampaign);
    await repo.createCampaign({
      businessId: 'biz1',
      name: 'Name',
      status: 'ACTIVE' as any,
      scheduleType: 'ONE_TIME' as any,
      description: 'd',
      recurrenceRule: null,
      startAt: new Date().toISOString(),
      endAt: null,
      steps: [{
        stepOrder: 1,
        name: 's',
        description: 'sd',
        channel: 'EMAIL' as any,
        template: { channel: 'EMAIL' as any, subject: 'Sub', bodyText: 'Body', bodyHtml: null },
        targetingRules: [{ database: 'USER', field: 'age', operator: 'EQUALS', value: 30 }]
      }]
    } as any);
    expect(createSpy).toHaveBeenCalled();
  });

  test('updateCampaign returns original when no fields provided', async () => {
    const findSpy = vi.spyOn(prisma.campaign, 'findUnique').mockResolvedValueOnce(baseCampaign);
    const res = await repo.updateCampaign('camp1', ['biz1'], {} as any);
    expect(res).toBe(baseCampaign);
    expect(findSpy).toHaveBeenCalled();
  });

  test('updateCampaign updates fields when provided', async () => {
    vi.spyOn(prisma.campaign, 'update').mockResolvedValueOnce({ ...baseCampaign, name: 'New' });
    const res = await repo.updateCampaign('camp1', ['biz1'], { name: 'New' } as any);
    expect(res.name).toBe('New');
  });

  test('deleteCampaign throws when not found', async () => {
    vi.spyOn(repo, 'findCampaignById').mockResolvedValueOnce(null as any);
    await expect(repo.deleteCampaign('x', ['biz1'])).rejects.toThrow('Campaign not found');
  });

  test('deleteCampaign deletes when found', async () => {
    vi.spyOn(repo, 'findCampaignById').mockResolvedValueOnce(baseCampaign as any);
    const delSpy = vi.spyOn(prisma.campaign, 'delete').mockResolvedValueOnce(baseCampaign);
    const res = await repo.deleteCampaign('camp1', ['biz1']);
    expect(res).toBe(baseCampaign);
    expect(delSpy).toHaveBeenCalled();
  });

  test('manageCampaign start', async () => {
    vi.spyOn(repo, 'findCampaignById').mockResolvedValueOnce({ ...baseCampaign, steps: [] } as any);
    const upd = vi.spyOn(prisma.campaign, 'update').mockResolvedValueOnce({ ...baseCampaign, status: 'running' });
  const res = await repo.manageCampaign('camp1', ['biz1'], { action: 'start', payload: { endAt: new Date().toISOString() } } as any);
  expect(res!.status).toBe('running');
    expect(upd).toHaveBeenCalled();
  });

  test('manageCampaign stop/pause/resume/reschedule', async () => {
    vi.spyOn(repo, 'findCampaignById').mockResolvedValue(( { ...baseCampaign, steps: [] }) as any);
    const upd = vi.spyOn(prisma.campaign, 'update').mockResolvedValue({ ...baseCampaign, status: 'paused' } as any);
    await repo.manageCampaign('camp1', ['biz1'], { action: 'pause' } as any);
    await repo.manageCampaign('camp1', ['biz1'], { action: 'resume' } as any);
    await repo.manageCampaign('camp1', ['biz1'], { action: 'stop' } as any);
    await repo.manageCampaign('camp1', ['biz1'], { action: 'reschedule', payload: { startAt: new Date().toISOString() } } as any);
    expect(upd).toHaveBeenCalled();
  });

  test('findCampaignSteps returns [] if campaign missing', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce(null as any);
    const steps = await repo.findCampaignSteps('camp1', ['biz1']);
    expect(steps).toEqual([]);
  });

  test('findCampaignSteps returns steps ordered', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce({ steps: [baseStep] } as any);
  const steps = await repo.findCampaignSteps('camp1', ['biz1']);
  expect(steps.length).toBeGreaterThan(0);
  expect(steps[0]!.id).toBe('step1');
  });

  test('createCampaignStep rejects if campaign missing', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce(null as any);
    await expect(repo.createCampaignStep('camp1', ['biz1'], {} as any)).rejects.toThrow('Campaign not found');
  });

  test('createCampaignStep success', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce({ id: 'camp1' } as any);
    const crt = vi.spyOn(prisma.campaignStep, 'create').mockResolvedValueOnce(baseStep);
    const res = await repo.createCampaignStep('camp1', ['biz1'], { stepOrder: 1, name: 's', description: 'd', channel: 'EMAIL', template: { channel: 'EMAIL', subject: 'S', bodyText: 'B', bodyHtml: null }, targetingRules: [] } as any);
    expect(res).toBe(baseStep); expect(crt).toHaveBeenCalled();
  });

  test('updateCampaignStep no existing throws', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce(null as any);
    await expect(repo.updateCampaignStep('camp1','step1',['biz1'], {} as any)).rejects.toThrow('Campaign step not found');
  });

  test('updateCampaignStep no changes returns existing', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce(baseStep as any);
    const res = await repo.updateCampaignStep('camp1','step1',['biz1'], {} as any);
    expect(res).toBe(baseStep);
  });

  test('updateCampaignStep updates', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce(baseStep as any);
    const upd = vi.spyOn(prisma.campaignStep, 'update').mockResolvedValueOnce({ ...baseStep, name: 'New' });
    const res = await repo.updateCampaignStep('camp1','step1',['biz1'], { name: 'New' } as any);
    expect(res.name).toBe('New'); expect(upd).toHaveBeenCalled();
  });

  test('deleteCampaignStep missing throws', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce(null as any);
    await expect(repo.deleteCampaignStep('camp1','step1',['biz1'])).rejects.toThrow('Campaign step not found');
  });

  test('deleteCampaignStep deletes', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce(baseStep as any);
    const del = vi.spyOn(prisma.campaignStep, 'delete').mockResolvedValueOnce(baseStep);
    const res = await repo.deleteCampaignStep('camp1','step1',['biz1']);
    expect(res).toBe(baseStep); expect(del).toHaveBeenCalled();
  });

  test('findLatestCampaignExecution returns latest', async () => {
    vi.spyOn(prisma.campaignExecution, 'findFirst').mockResolvedValueOnce(baseExecution);
    const res = await repo.findLatestCampaignExecution('camp1');
    expect(res).toBe(baseExecution);
  });

  test('findCampaignExecutions missing campaign throws', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce(null as any);
    await expect(repo.findCampaignExecutions('camp1',['biz1'],1,10)).rejects.toThrow('Campaign not found');
  });

  test('findCampaignExecutions returns paging result', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce({ id: 'camp1' } as any);
    vi.spyOn(prisma, '$transaction').mockResolvedValueOnce([1,[baseExecution]] as any);
    const res = await repo.findCampaignExecutions('camp1',['biz1'],1,10);
    expect(res.items.length).toBe(1);
  });

  test('findCampaignExecutionById returns execution', async () => {
    vi.spyOn(prisma.campaignExecution, 'findFirst').mockResolvedValueOnce(baseExecution);
    const r = await repo.findCampaignExecutionById('camp1','exec1',['biz1']);
    expect(r).toBe(baseExecution);
  });

  test('createCampaignExecution creates', async () => {
    const crt = vi.spyOn(prisma.campaignExecution, 'create').mockResolvedValueOnce(baseExecution);
    const r = await repo.createCampaignExecution('camp1');
    expect(r).toBe(baseExecution); expect(crt).toHaveBeenCalled();
  });

  test('manageCampaignExecution missing campaign throws', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce(null as any);
    await expect(repo.manageCampaignExecution('camp1','exec1',['biz1'], { action: 'retry'})).rejects.toThrow('Campaign not found');
  });

  test('manageCampaignExecution missing execution throws', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce({ id: 'camp1' } as any);
    vi.spyOn(prisma.campaignExecution, 'findUnique').mockResolvedValueOnce(null as any);
    await expect(repo.manageCampaignExecution('camp1','exec1',['biz1'], { action: 'retry'})).rejects.toThrow('Execution not found');
  });

  test('manageCampaignExecution retry idempotent when RUNNING', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce({ id: 'camp1' } as any);
    vi.spyOn(prisma.campaignExecution, 'findUnique').mockResolvedValueOnce({ ...baseExecution, status: 'RUNNING' });
    const r = await repo.manageCampaignExecution('camp1','exec1',['biz1'], { action: 'retry'});
    expect(r.status).toBe('RUNNING');
  });

  test('manageCampaignExecution retry updates when not running', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce({ id: 'camp1' } as any);
    vi.spyOn(prisma.campaignExecution, 'findUnique').mockResolvedValueOnce({ ...baseExecution, status: 'FAILED' });
    const upd = vi.spyOn(prisma.campaignExecution, 'update').mockResolvedValueOnce({ ...baseExecution, status: 'RUNNING' });
    const r = await repo.manageCampaignExecution('camp1','exec1',['biz1'], { action: 'retry'});
    expect(r.status).toBe('RUNNING'); expect(upd).toHaveBeenCalled();
  });

  test('manageCampaignExecution stop transitions', async () => {
    vi.spyOn(prisma.campaign, 'findFirst').mockResolvedValueOnce({ id: 'camp1' } as any);
    vi.spyOn(prisma.campaignExecution, 'findUnique').mockResolvedValueOnce({ ...baseExecution, status: 'RUNNING' });
    const upd = vi.spyOn(prisma.campaignExecution, 'update').mockResolvedValueOnce({ ...baseExecution, status: 'STOPPED' });
    const r = await repo.manageCampaignExecution('camp1','exec1',['biz1'], { action: 'stop'});
    expect(r.status).toBe('STOPPED'); expect(upd).toHaveBeenCalled();
  });

  test('findStepExecutions missing step throws', async () => {
    vi.spyOn(prisma.campaignStep, 'findFirst').mockResolvedValueOnce(null as any);
    await expect(repo.findStepExecutions('camp1','step1',['biz1'],1,10)).rejects.toThrow('Campaign step not found');
  });

  test('findStepExecutions returns paging', async () => {
    vi.spyOn(prisma.campaignStep, 'findFirst').mockResolvedValueOnce({ id: 'step1' } as any);
    vi.spyOn(prisma, '$transaction').mockResolvedValueOnce([1,[baseStepExecution]] as any);
    const r = await repo.findStepExecutions('camp1','step1',['biz1'],1,10);
    expect(r.items.length).toBe(1);
  });

  test('findStepExecutionById returns stepExecution', async () => {
    vi.spyOn(prisma.stepExecution, 'findFirst').mockResolvedValueOnce(baseStepExecution);
    const r = await repo.findStepExecutionById('camp1','step1','sexec1',['biz1']);
    expect(r).toBe(baseStepExecution);
  });

  test('createStepExecution creates', async () => {
    const crt = vi.spyOn(prisma.stepExecution, 'create').mockResolvedValueOnce(baseStepExecution);
    const r = await repo.createStepExecution('exec1','step1');
    expect(r).toBe(baseStepExecution); expect(crt).toHaveBeenCalled();
  });

  test('findStepExecutionRecipients missing stepExecution throws', async () => {
    vi.spyOn(prisma.stepExecution, 'findFirst').mockResolvedValueOnce(null as any);
    await expect(repo.findStepExecutionRecipients('camp1','step1','sexec1',['biz1'],1,10)).rejects.toThrow('Step execution not found');
  });

  test('findStepExecutionRecipients returns paging', async () => {
    vi.spyOn(prisma.stepExecution, 'findFirst').mockResolvedValueOnce({ id: 'sexec1' } as any);
    vi.spyOn(prisma, '$transaction').mockResolvedValueOnce([1,[baseRecipient]] as any);
    const r = await repo.findStepExecutionRecipients('camp1','step1','sexec1',['biz1'],1,10);
    expect(r.items.length).toBe(1);
  });

  test('findStepExecutionRecipientById returns recipient', async () => {
    vi.spyOn(prisma.stepRecipient, 'findFirst').mockResolvedValueOnce(baseRecipient);
    const r = await repo.findStepExecutionRecipientById('sexec1','rec1');
    expect(r).toBe(baseRecipient);
  });

  test('createStepExecutionRecipient missing stepExecution throws', async () => {
    vi.spyOn(prisma.stepExecution, 'findFirst').mockResolvedValueOnce(null as any);
    await expect(repo.createStepExecutionRecipient('camp1','step1','sexec1',{ userId: 'u', status: 'PENDING', attempts:0 } as any)).rejects.toThrow('Step execution not found');
  });

  test('createStepExecutionRecipient creates', async () => {
    vi.spyOn(prisma.stepExecution, 'findFirst').mockResolvedValueOnce({ id: 'sexec1' } as any);
    const crt = vi.spyOn(prisma.stepRecipient, 'create').mockResolvedValueOnce(baseRecipient);
    const r = await repo.createStepExecutionRecipient('camp1','step1','sexec1',{ userId: 'u', status: 'PENDING', attempts:0 } as any);
    expect(r).toBe(baseRecipient); expect(crt).toHaveBeenCalled();
  });

  test('updateStepExecutionRecipient missing recipient throws', async () => {
    vi.spyOn(repo, 'findStepExecutionRecipientById').mockResolvedValueOnce(null as any);
    await expect(repo.updateStepExecutionRecipient('sexec1','rec1', { status: 'FAILED' } as any)).rejects.toThrow('Step execution recipient not found');
  });

  test('updateStepExecutionRecipient no fields returns existing', async () => {
    vi.spyOn(repo, 'findStepExecutionRecipientById').mockResolvedValueOnce(baseRecipient as any);
    const r = await repo.updateStepExecutionRecipient('sexec1','rec1', {} as any);
    expect(r).toBe(baseRecipient);
  });

  test('updateStepExecutionRecipient updates', async () => {
    vi.spyOn(repo, 'findStepExecutionRecipientById').mockResolvedValueOnce(baseRecipient as any);
    const upd = vi.spyOn(prisma.stepRecipient, 'update').mockResolvedValueOnce({ ...baseRecipient, status:'FAILED'});
    const r = await repo.updateStepExecutionRecipient('sexec1','rec1', { status: 'FAILED' } as any);
    expect(r.status).toBe('FAILED'); expect(upd).toHaveBeenCalled();
  });

  test('updateStepExecution no fields returns existing', async () => {
    const find = vi.spyOn(prisma.stepExecution, 'findUnique').mockResolvedValueOnce(baseStepExecution);
    const r = await repo.updateStepExecution('sexec1', {} as any);
    expect(r).toBe(baseStepExecution); expect(find).toHaveBeenCalled();
  });

  test('updateStepExecution updates', async () => {
    // Provide existing record so repository does not early-return undefined
    vi.spyOn(prisma.stepExecution, 'findUnique').mockResolvedValueOnce(baseStepExecution);
    const upd = vi.spyOn(prisma.stepExecution, 'update').mockResolvedValueOnce({ ...baseStepExecution, status: 'FAILED' });
  const r = await repo.updateStepExecution('sexec1', { status: 'FAILED' } as any);
  expect(r!.status).toBe('FAILED'); expect(upd).toHaveBeenCalled();
  });

  test('findStepTemplate missing step throws', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce(null as any);
    await expect(repo.findStepTemplate('camp1','step1',['biz1'])).rejects.toThrow('Campaign step not found');
  });

  test('findStepTemplate returns template', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce({ template: baseTemplate } as any);
    const t = await repo.findStepTemplate('camp1','step1',['biz1']);
    expect(t).toBe(baseTemplate);
  });

  test('updateStepTemplate missing step throws', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce(null as any);
    await expect(repo.updateStepTemplate('camp1','step1',['biz1'], {} as any)).rejects.toThrow('Campaign step not found');
  });

  test('updateStepTemplate no fields returns existing template', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce({ template: baseTemplate } as any);
    const t = await repo.updateStepTemplate('camp1','step1',['biz1'], {} as any);
    expect(t).toBe(baseTemplate);
  });

  test('updateStepTemplate updates template', async () => {
    vi.spyOn(repo, 'findCampaignStepById').mockResolvedValueOnce({ template: baseTemplate } as any);
    const upd = vi.spyOn(prisma.stepTemplate, 'update').mockResolvedValueOnce({ ...baseTemplate, subject: 'New' });
  const t = await repo.updateStepTemplate('camp1','step1',['biz1'], { subject: 'New' } as any);
  expect(t!.subject).toBe('New'); expect(upd).toHaveBeenCalled();
  });
});
