import { RepositoryPrisma } from "@campaign-service/db";
import { createEvent, EventTypes } from '@returnacy/event-contracts';
import { createClients } from "./clients/index.js";
import { loadConfig } from "./config/env.js";
import { computeUserCap } from "./utils/capacity.js";
import { renderTemplate } from './utils/templateRenderer.js';
import { buildScheduleInput } from './utils/buildScheduleInput.js';
import type { TargetingRule } from "@campaign-service/types";
import type { Config } from '../types/config.js';
import type { AvailableMessagesResponse } from "../types/availableMessagesResponse.js";

// Normalizes various available-messages API shapes into a flat, uppercase channel map
// Supported shapes:
//  1. { email: 10, sms: 5, ... }
//  2. { EMAIL: 10, SMS: 5, ... }
//  3. { daily: { EMAIL: 10, SMS: 5 } }
//  4. Mixed casing; all coerced to uppercase keys expected by step.channel values
function normalizeAvailableMessages(raw: any): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  if (raw.daily && typeof raw.daily === 'object') {
    return Object.fromEntries(
      Object.entries(raw.daily).map(([k, v]) => [k.toUpperCase(), typeof v === 'number' ? v : 0])
    );
  }
  const channels = ['email', 'sms', 'push', 'whatsapp', 'viber', 'voice'];
  const out: Record<string, number> = {};
  for (const c of channels) {
    const upper = c.toUpperCase();
    // prefer explicit uppercase, then lowercase, else 0
    out[upper] = typeof raw[upper] === 'number' ? raw[upper] : (typeof raw[c] === 'number' ? raw[c] : 0);
  }
  // If raw already had some uppercase keys not listed, keep them (defensive)
  for (const [k, v] of Object.entries(raw)) {
    if (/[A-Z]/.test(k) && typeof v === 'number' && !(k in out)) out[k] = v;
  }
  return out;
}

export class Processor {
  repo: RepositoryPrisma;
  config: Config;
  clients: any;

  constructor(repo: RepositoryPrisma) {
    this.config = loadConfig();
    this.repo = repo;
    this.clients = createClients(this.config);
  }

  async processJob(payload: { campaignId: string; campaignExecutionId: string; businessId: string; attempt?: number; maxAttempts?: number }) {
    if (!payload || !payload.campaignId || !payload.campaignExecutionId || !payload.businessId) {
      throw new Error('Invalid processor payload: campaignId, campaignExecutionId, businessId required');
    }

    const attempt = Number(payload.attempt || 0);
    const maxAttempts = Number(payload.maxAttempts || 2);

    // Fetch fresh campaign with steps for this execution
    const campaign = await (this.repo as any).findCampaignById?.(payload.campaignId, [payload.businessId]);
    if (!campaign) {
      return { failed: true, finalFailure: true, reason: 'campaign-not-found', steps: [], attempt: attempt + 1, maxAttempts };
    }
    if (campaign.status !== 'ACTIVE') {
      return { skipped: true, reason: 'status-not-active', steps: [], attempt: attempt + 1, maxAttempts };
    }

    const campaignExecutionId = payload.campaignExecutionId;

    let anyStepFailed = false;
  const stepSummaries: Array<{ stepId: string; scheduled: number; failed: number; skipped: boolean; reason?: string }> = [];

    for (const step of (campaign.steps || [])) {
  const stepExecution = await (this.repo as any).createStepExecution(campaignExecutionId, step.id);

  const summary: { stepId: string; scheduled: number; failed: number; skipped: boolean; reason?: string } = { stepId: step.id, scheduled: 0, failed: 0, skipped: false };

      try {
        // Mark step execution as PROCESSING (best effort, ignore if status not supported)
  // Map in-progress status to RUNNING (ExecutionStatus enum) for compatibility
  await this.repo.updateStepExecution(stepExecution.id, { status: 'RUNNING' as any }).catch(() => {});

        // 1. Determine capacity per channel
        const businessId = (campaign as any).businessId;
        const availableMessages: AvailableMessagesResponse = await this.clients.businessClient.getAvailableMessages(businessId);
        const availableByChannel = normalizeAvailableMessages(availableMessages);
        let remainingCapacity = computeUserCap([step.channel], availableByChannel as any, {}) || 0;
        if (remainingCapacity <= 0) {
          summary.skipped = true;
          summary.reason = 'no-capacity';
          await this.repo.updateStepExecution(stepExecution.id, { status: 'SKIPPED' });
          stepSummaries.push(summary);
          continue;
        }

        // 2. Filter targeting rules for user-service
        const userServiceTargetingRules = (step.targetingRules || []).filter((rule: TargetingRule) => rule.database === 'USER');
        if (userServiceTargetingRules.length === 0) {
          summary.skipped = true;
          summary.reason = 'no-user-targeting-rules';
          await this.repo.updateStepExecution(stepExecution.id, { status: 'SKIPPED' });
          stepSummaries.push(summary);
          continue;
        }

        const targetingUsers = await this.clients.userClient.getTargetingUsers(userServiceTargetingRules, remainingCapacity);

        // 3. Guard template existence
        const template = step.template; // singular relation per schema
        if (!template) {
          summary.skipped = true;
          summary.reason = 'missing-template';
          await this.repo.updateStepExecution(stepExecution.id, { status: 'SKIPPED' });
          stepSummaries.push(summary);
          continue;
        }

        if (!targetingUsers || !Array.isArray(targetingUsers.users) || targetingUsers.users.length === 0) {
          summary.skipped = true;
          summary.reason = 'no-users';
          await this.repo.updateStepExecution(stepExecution.id, { status: 'SKIPPED' });
          stepSummaries.push(summary);
          continue;
        }

        for (const user of targetingUsers.users) {
          if (remainingCapacity <= 0) break; // enforce capacity strictly
          try {
            const rendered = renderTemplate({
              subject: template.subject,
              bodyText: template.bodyText,
              bodyHtml: template.bodyHtml,
              context: { user }
            });

            const scheduleInput = buildScheduleInput({
              campaignId: stepExecution.id, // using stepExecution id as grouping identifier
              recipient: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.name
              },
              channel: step.channel,
              rendered,
              template,
              scheduledAt: new Date(),
              from: 'noreply@returnacy.app'
            });

            await this.clients.messagingClient.schedule(scheduleInput);

            await (this.repo as any).createStepExecutionRecipient(campaign.id, step.id, stepExecution.id, {
              userId: user.id,
              status: 'PENDING',
              enqueuedAt: scheduleInput.scheduledAt,
              attempts: 0,
            });

            summary.scheduled += 1;
            remainingCapacity -= 1;
          } catch (userErr) {
            summary.failed += 1;
            try {
              if (await (this.repo as any).findStepExecutionRecipient(stepExecution.id, user.id)) {
                await this.repo.updateStepExecutionRecipient(stepExecution.id, user.id, { status: 'FAILED' });
              } else {
                await (this.repo as any).createStepExecutionRecipient(campaign.id, step.id, stepExecution.id, {
                  userId: user.id,
                  status: 'FAILED',
                  enqueuedAt: new Date(),
                  attempts: 0,
                });
              }
            } catch (_) {
              // Swallow repo failure for individual recipient; already counted as failed
            }
            // eslint-disable-next-line no-console
            console.error('User scheduling failed', { userId: user.id, error: (userErr as Error).message });
          }
        }

        // Finalize step status
        if (summary.scheduled === 0 && summary.failed === 0) {
          summary.skipped = true;
          summary.reason = summary.reason || 'nothing-to-do';
          await this.repo.updateStepExecution(stepExecution.id, { status: 'SKIPPED' });
        } else if (summary.failed > 0 && summary.scheduled === 0) {
          anyStepFailed = true;
          await this.repo.updateStepExecution(stepExecution.id, { status: 'FAILED' });
        } else if (summary.failed > 0) {
          // Partial success. Mark maybe COMPLETED_WITH_ERRORS if supported; else COMPLETED.
          anyStepFailed = true;
          // Partial completion: mark as COMPLETED (no distinct enum yet) while recording failures in summary
          await this.repo.updateStepExecution(stepExecution.id, { status: 'COMPLETED' as any });
        } else {
          await this.repo.updateStepExecution(stepExecution.id, { status: 'COMPLETED' });
        }

        // Produce event (outbox) only if we actually scheduled recipients (scheduled > 0)
        if (summary.scheduled > 0) {
          try {
            const evt = createEvent({
              type: EventTypes.CAMPAIGN_STEP_READY,
              version: 1,
              producer: 'campaign-service.scheduler',
              payload: {
                stepExecutionId: stepExecution.id,
                campaignId: campaign.id,
                businessId: (campaign as any).businessId,
                channel: step.channel,
                batchSize: summary.scheduled,
              },
              traceId: (globalThis as any).process?.env?.TRACE_ID || undefined
            });
            await (this.repo as any).createOutboxEvent({
              aggregateType: 'StepExecution',
              aggregateId: stepExecution.id,
              type: evt.type,
              version: evt.version,
              payload: evt,
              traceId: evt.traceId
            });
          } catch (evtErr) {
            // eslint-disable-next-line no-console
            console.error('Failed to enqueue campaign.step.ready event', { stepExecutionId: stepExecution.id, error: (evtErr as Error).message });
          }
        }

        stepSummaries.push(summary);
      } catch (stepErr) {
        anyStepFailed = true;
        await this.repo.updateStepExecution(stepExecution.id, { status: 'FAILED' }).catch(() => {});
        // eslint-disable-next-line no-console
        console.error('Step execution failed', { stepId: step.id, error: (stepErr as Error).message });
        summary.skipped = false;
        summary.reason = (stepErr as Error).message;
        stepSummaries.push(summary);
      }
    }

    const finalFailure = anyStepFailed && (attempt + 1 >= maxAttempts);

    // Update execution status (only execution-level responsibility retained here)
    try {
      if (anyStepFailed) {
        await (this.repo as any).updateCampaignExecution(campaignExecutionId, { status: finalFailure ? 'FAILED' : 'RETRYING' });
      } else {
        await (this.repo as any).updateCampaignExecution(campaignExecutionId, { status: 'COMPLETED' });
      }
    } catch (_) { /* ignore */ }

    return {
      campaignExecutionId,
      steps: stepSummaries,
      failed: anyStepFailed,
      finalFailure,
      attempt: attempt + 1,
      maxAttempts,
    };
  }
}