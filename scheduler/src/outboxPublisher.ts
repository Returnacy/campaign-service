import { RepositoryPrisma } from '@campaign-service/db';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - rely on runtime resolution after db package build
import { prisma } from '@campaign-service/db/src/prismaClient.ts';
import { validateEvent } from '@returnacy/event-contracts';
// Try importing metrics increment function if server side loaded; optional to avoid tight coupling.
let incrementMetric: ((name: 'eventsPublished' | 'eventsFailed') => void) | undefined;
try {
  // dynamic import using relative path from built code is brittle; skipped for now.
  // placeholder: could later export a shared metrics module.
} catch {}
import pino from 'pino';

/**
 * Simple polling publisher for OutboxEvent rows.
 * Responsibilities:
 *  - Fetch unpublished events in FIFO order.
 *  - Validate envelope.
 *  - "Publish" (placeholder: console.log) – swap with real broker later.
 *  - Mark published or record error + increment attempt.
 *  - Basic retry with exponential backoff (in-memory) per loop.
 */
const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 2000);
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 50);
const MAX_ATTEMPTS = Number(process.env.OUTBOX_MAX_ATTEMPTS || 10);

const logger = pino({ level: process.env.LOG_LEVEL || 'info', name: 'campaign-service.outbox' });

const repo = new RepositoryPrisma();

let running = false;
let stopping = false;
let intervalHandle: NodeJS.Timer | null = null;

function computeBackoffSeconds(nextAttemptNumber: number) {
  // attempt numbers are 1-based after increment
  const exp = Math.min(Math.pow(2, nextAttemptNumber - 1), 60); // cap at 60s
  return exp;
}

async function publishBatch() {
  if (running) return; // prevent overlapping loop if previous not finished
  running = true;
  try {
  if (stopping) return;
  const events = await repo.fetchUnpublishedOutboxEvents(BATCH_SIZE, new Date());
  if (!events.length) return;

    for (const evt of events) {
      try {
        const validation = validateEvent(evt.payload);
        if (!validation.ok) {
          // Validation failures are terminal – give up immediately.
          await repo.markOutboxEventGiveUp(evt.id, 'validation_failed:' + validation.error);
          logger.error({ eventId: evt.id, type: evt.type, error: validation.error }, 'outbox validation failed – giving up');
          continue;
        }

        // Placeholder publish – replace with broker publish call.
        logger.info({ eventId: evt.id, type: evt.type, version: evt.version, aggregateId: evt.aggregateId, attempt: evt.attempt }, 'publishing event');
        // simulate success – if broker publish added, wrap here
        await repo.markOutboxEventPublished(evt.id);
        incrementMetric?.('eventsPublished');
        logger.debug({ eventId: evt.id }, 'event marked published');
      } catch (err: any) {
        const nextAttemptNumber = evt.attempt + 1;
        const final = nextAttemptNumber >= (evt.maxAttempts ?? MAX_ATTEMPTS);
        if (final) {
          await repo.markOutboxEventGiveUp(evt.id, (err?.message || 'publish_error').slice(0, 500));
          logger.error({ eventId: evt.id, attempt: nextAttemptNumber, error: err?.message }, 'permanent outbox publish failure – giving up');
          incrementMetric?.('eventsFailed');
        } else {
          const backoff = computeBackoffSeconds(nextAttemptNumber);
            await repo.markOutboxEventFailed(evt.id, (err?.message || 'publish_error').slice(0, 500), backoff);
            logger.warn({ eventId: evt.id, attempt: nextAttemptNumber, backoffSeconds: backoff, error: err?.message }, 'outbox publish failed – scheduled retry');
            incrementMetric?.('eventsFailed');
        }
      }
    }
  } finally {
    running = false;
  }
}

function scheduleLoop() {
  intervalHandle = setInterval(publishBatch, POLL_INTERVAL_MS);
  (intervalHandle as any).unref?.();
}

async function start() {
  // light connectivity check
  await prisma.$queryRaw`SELECT 1`;
  logger.info({ pollMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE }, 'outbox publisher started');
  scheduleLoop();
}

start().catch(err => {
  logger.fatal({ err }, 'outbox publisher failed to start');
  process.exit(1);
});

async function shutdown() {
  if (stopping) return;
  stopping = true;
  logger.info('shutting down outbox publisher');
  if (intervalHandle) clearInterval(intervalHandle as unknown as number);
  // wait for in-flight batch
  const check = () => running ? setTimeout(check, 100) : finish();
  const finish = () => {
    logger.info('outbox publisher stopped');
    process.exit(0);
  };
  check();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
