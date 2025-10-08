import { Redis } from 'ioredis';
import pino from 'pino';
import { scheduler as runScheduler } from './scheduler.js';
import { createWorker } from './worker.js';
import { Processor } from './processor.js';
import { RepositoryPrisma } from '@campaign-service/db';

const logger = pino({ level: process.env.LOG_LEVEL || 'info', name: 'campaign-service.scheduler' });

function parseBusinessIds(): string[] {
  const raw = process.env.BUSINESS_IDS;
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

async function main() {
  const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
  const intervalMs = Number(process.env.SCHEDULE_INTERVAL_MS || 30000);
  const businessIds = parseBusinessIds();

  logger.info({ redisUrl, intervalMs, businessIdsCount: businessIds.length }, 'Scheduler service starting');

  const redis = new Redis(redisUrl);

  // Start worker to process enqueued campaign executions
  const repo = new RepositoryPrisma();
  const processor = new Processor(repo);
  const worker = createWorker('campaign.executions', processor, logger, redis, Number(process.env.DISPATCHER_CONCURRENCY || 5));

  const tick = async () => {
    try {
      await runScheduler({ redisConnection: redis, logger, businessIds });
      logger.debug('Scheduler tick completed');
    } catch (err: any) {
      logger.error({ err: err?.message || err }, 'Scheduler tick failed');
    }
  };

  // fire immediately, then on interval
  await tick();
  const handle = setInterval(tick, intervalMs);
  (handle as any).unref?.();

  const shutdown = async () => {
    logger.info('Shutting down scheduler');
    clearInterval(handle as unknown as number);
    try { await worker.close(); } catch {}
    try { await redis.quit(); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start scheduler');
  process.exit(1);
});
