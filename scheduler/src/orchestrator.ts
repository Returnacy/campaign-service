import type { Queue } from 'bullmq';
import type { RepositoryPrisma } from '@campaign-service/db';

interface OrchestratorOptions {
  maxAttempts?: number;
  logger?: { info?: (...a: any[]) => void; warn?: (...a: any[]) => void; error?: (...a: any[]) => void };
}

export class CampaignOrchestrator {
  private repo: RepositoryPrisma;
  private queue: Queue;
  private logger?: OrchestratorOptions['logger'];
  private maxAttempts: number;

  constructor(repo: RepositoryPrisma, queue: Queue, opts?: OrchestratorOptions) {
    this.repo = repo;
    this.queue = queue;
    this.logger = opts?.logger;
    this.maxAttempts = opts?.maxAttempts ?? 2;
  }

  /**
   * Decides if a campaign is due and, if so, creates a new execution row and enqueues a processing job.
   */
  async enqueueIfDue(campaign: any) {
    if (!campaign) return { skipped: true, reason: 'campaign-null' };
    if (campaign.status !== 'ACTIVE') return { skipped: true, reason: 'status-not-active' };

    try {
      const allowOneTimeRerun = process.env.SCHEDULER_ALLOW_ONE_TIME_RERUN === 'true';
      const oneTimeRerunIntervalMs = Number(process.env.SCHEDULER_ONE_TIME_RERUN_INTERVAL_MS ?? '300000'); // default 5min
      if (campaign.scheduleType === 'ONE_TIME') {
        const latest = await (this.repo as any).findLatestCampaignExecution?.(campaign.id, ['COMPLETED', 'RUNNING']);
        if (latest) {
          if (allowOneTimeRerun) {
            const now = Date.now();
            const last = new Date(latest.runAt).getTime();
            if (isFinite(oneTimeRerunIntervalMs) && oneTimeRerunIntervalMs > 0) {
              const due = now - last >= oneTimeRerunIntervalMs;
              if (!due) {
                this.logger?.info?.({ campaignId: campaign.id, latestRunAt: latest.runAt, minIntervalMs: oneTimeRerunIntervalMs }, 'orchestrator: one-time rerun allowed but not yet due');
                return { skipped: true, reason: 'one-time-rerun-not-due' };
              }
            }
            this.logger?.info?.({ campaignId: campaign.id, latestRunAt: latest.runAt }, 'orchestrator: one-time rerun allowed by env');
          } else {
            this.logger?.info?.({ campaignId: campaign.id, latestRunAt: latest.runAt }, 'orchestrator: one-time already executed');
            return { skipped: true, reason: 'one-time-already-executed' };
          }
        }
      } else if (campaign.scheduleType === 'RECURRING' && campaign.recurrenceRule) {
        const latest = await (this.repo as any).findLatestCampaignExecution?.(campaign.id, ['COMPLETED']);
        if (latest) {
          const now = new Date();
            const last = new Date(latest.runAt);
            let due = false;
            switch (campaign.recurrenceRule) {
              case 'DAILY': due = (now.getTime() - last.getTime()) >= 24*60*60*1000; break;
              case 'WEEKLY': due = (now.getTime() - last.getTime()) >= 7*24*60*60*1000; break;
              case 'MONTHLY': { const next = new Date(last); next.setMonth(next.getMonth()+1); due = now >= next; break; }
              default: due = true;
            }
            if (!due) {
              this.logger?.info?.({ campaignId: campaign.id, lastRunAt: latest.runAt, rule: campaign.recurrenceRule }, 'orchestrator: recurrence not due');
              return { skipped: true, reason: 'recurrence-not-due', lastRunAt: latest.runAt };
            }
        }
      }
    } catch (err) {
      this.logger?.warn?.('Orchestrator gating error, proceeding', (err as Error).message);
    }

    // Create execution
    const execution = await (this.repo as any).createCampaignExecution(campaign.id);

    const jobPayload = {
      campaignId: campaign.id,
      campaignExecutionId: execution.id,
      businessId: campaign.businessId,
      attempt: 0,
      maxAttempts: this.maxAttempts,
    };

    await this.queue.add('process-campaign-execution', jobPayload, { removeOnComplete: 500, removeOnFail: 1000 });
    this.logger?.info?.({ campaignId: campaign.id, executionId: execution.id }, 'orchestrator: enqueued campaign execution');
    return { enqueued: true, executionId: execution.id };
  }
}
