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
  const dailyAt = process.env.SCHEDULER_DAILY_AT; // optional 'HH:MM' 24h format
  const oneShot = process.env.SCHEDULER_ONE_SHOT === 'true';
  const businessIds = parseBusinessIds();

  logger.info({ redisUrl, intervalMs, dailyAt, oneShot, businessIdsCount: businessIds.length }, 'Scheduler service starting');

  const redis = new Redis(redisUrl, { maxRetriesPerRequest: null as any });

  // Start worker to process enqueued campaign executions
  const repo = new RepositoryPrisma();
  const processor = new Processor(repo);
  const worker = createWorker('campaign.executions', processor, logger, redis, Number(process.env.DISPATCHER_CONCURRENCY || 5));

  const shutdown = async () => {
    logger.info('Shutting down scheduler');
    try { if (handle) clearInterval(handle as unknown as number); } catch {}
    try { await worker.close(); } catch {}
    try { await redis.quit(); } catch {}
    process.exit(0);
  };

  const tick = async () => {
    try {
      await runScheduler({ redisConnection: redis, logger, businessIds });
      logger.debug('Scheduler tick completed');
    } catch (err: any) {
      logger.error({ err: err?.message || err }, 'Scheduler tick failed');
    }
  };

  const dayMs = 24 * 60 * 60 * 1000;

  let handle: any;

  const scheduleDailyAt = (hhmm: string) => {
    const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
    if (!m) {
      logger.warn({ dailyAt: hhmm }, 'Invalid SCHEDULER_DAILY_AT format; expected HH:MM. Falling back to interval.');
      return false;
    }
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour > 23 || minute > 59) {
      logger.warn({ dailyAt: hhmm }, 'Invalid SCHEDULER_DAILY_AT time; falling back to interval.');
      return false;
    }
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const initialDelay = next.getTime() - now.getTime();
    logger.info({ runAt: next.toISOString(), initialDelayMs: initialDelay }, 'First daily scheduler tick planned');

    setTimeout(async () => {
      await tick();
      if (oneShot) {
        await shutdown();
        return;
      }
      handle = setInterval(tick, dayMs);
      handle?.unref?.();
    }, initialDelay).unref?.();
    return true;
  };

  // Modes precedence: dailyAt > oneShot > fixed interval
  if (dailyAt && scheduleDailyAt(dailyAt)) {
    // scheduled via dailyAt, nothing else to do here
  } else if (oneShot) {
    await tick();
    await shutdown();
    return; // ensure no further setup
  } else {
    // fire immediately, then on provided interval
    await tick();
    handle = setInterval(tick, intervalMs);
    handle?.unref?.();
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start scheduler');
  process.exit(1);
});
