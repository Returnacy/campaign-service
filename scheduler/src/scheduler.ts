import { CampaignOrchestrator } from './orchestrator.js';
import { createQueue } from './queue.js';
import { RepositoryPrisma } from '@campaign-service/db';

export async function scheduler(opts: { redisConnection: any; logger?: any; businessIds: string[] }) {
  const repo = new RepositoryPrisma();
  const queue = createQueue('campaign.executions', opts.redisConnection);
  const orchestrator = new CampaignOrchestrator(repo, queue, { logger: opts.logger });

  const now = new Date();
  // Find campaigns that are broadly active (time window) and then let orchestrator gate by recurrence
  const candidates = await repo.findDueActiveCampaigns(now);
  opts.logger?.info?.({ count: candidates.length, at: now.toISOString() }, 'scheduler: due active campaigns');

  for (const c of candidates) {
    // fetch full campaign with steps if needed for gating (we reuse repo method)
    const campaign = await (repo as any).findCampaignById(c.id, opts.businessIds);
    if (!campaign) continue;
    opts.logger?.info?.({ campaignId: c.id, status: (campaign as any)?.status, scheduleType: (campaign as any)?.scheduleType }, 'scheduler: evaluating campaign');
    await orchestrator.enqueueIfDue(campaign);
  }
}
