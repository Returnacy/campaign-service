import { Queue, Worker } from "bullmq";
import type { JobsOptions } from 'bullmq';
import type { Processor } from './processor.js';

const WORKER_MAX_ATTEMPTS = 2;
const WORKER_BACKOFF_DELAY_MS = 2000;

export function createWorker(
  queueName: string,
  processor: Processor,
  logger: any,
  connection: any,
  concurrency: number = 5,
  retriesQueue?: Queue
) {
  return new Worker(
    queueName,
    async (job: any) => {
      const payload = job.data || {};
      // propagate attempt meta
  payload.__attempt = (payload.__attempt || 0);
  payload.__maxAttempts = Number(process.env.CAMPAIGN_MAX_ATTEMPTS || WORKER_MAX_ATTEMPTS);

      const result = await processor.processJob(payload);

      logger.info({ jobId: job.id, queue: queueName, attempt: result.attempt, maxAttempts: result.maxAttempts }, 'processed campaign job');

      if (result.failed) {
        if (!result.finalFailure) {
          // requeue with incremented attempt metadata
            const nextPayload = { ...payload, __attempt: result.attempt, __campaignExecutionId: result.campaignExecutionId };
            if (retriesQueue) {
              const opts: JobsOptions = {
                attempts: 1,
                backoff: { type: 'exponential', delay: Number(process.env.WORKER_BACKOFF_DELAY_MS || WORKER_BACKOFF_DELAY_MS) },
                removeOnComplete: 500,
                removeOnFail: 2000,
              };
              await retriesQueue.add('retry', nextPayload, opts);
              logger.warn(`Campaign job ${job.id} failed (attempt ${result.attempt}) moved to retries queue`);
              return { retried: true, attempt: result.attempt };
            } else {
              // Throw so BullMQ built-in retry (if configured) handles it
              logger.warn(`Campaign job ${job.id} failed (attempt ${result.attempt}) rethrowing for same-queue retry`);
              throw new Error('Retrying campaign job');
            }
        } else {
          logger.error(`Campaign job ${job.id} reached final failure after ${result.attempt} attempts`);
        }
      }

      return result;
    },
    {
      connection,
      concurrency: Number(process.env.WORKER_CONCURRENCY || concurrency),
      limiter: {
        max: Number(process.env.WORKER_MAX_ATTEMPTS || WORKER_MAX_ATTEMPTS),
        duration: Number(process.env.WORKER_BACKOFF_DELAY_MS || WORKER_BACKOFF_DELAY_MS)
      }
    }
  );
}