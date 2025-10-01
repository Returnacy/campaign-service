import type { FastifyReply, FastifyRequest } from 'fastify';

// Simple ephemeral counters (restart resets). Swap out later for Prometheus / OTEL.
const metrics = {
  startTime: Date.now(),
  eventsPublished: 0,
  eventsFailed: 0,
};

export function incrementMetric(name: keyof typeof metrics) {
  if (name in metrics) {
    // @ts-ignore
    metrics[name]++;
  }
}

export async function getHealthHandler(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ status: 'ok', uptimeSeconds: process.uptime(), timestamp: new Date().toISOString() });
}

export async function getReadinessHandler(request: FastifyRequest, reply: FastifyReply) {
  const start = Date.now();
  let dbHealthy = false;
  try {
    // @ts-ignore
    await request.server.repository?.healthCheck?.();
    dbHealthy = true;
  } catch {}
  const latencyMs = Date.now() - start;
  const httpStatus = dbHealthy ? 200 : 503;
  return reply.status(httpStatus).send({
    status: dbHealthy ? 'ready' : 'degraded',
    latencyMs,
    checks: { database: dbHealthy ? 'up' : 'down' }
  });
}

export async function getMetricsHandler(_request: FastifyRequest, reply: FastifyReply) {
  const uptimeSeconds = (Date.now() - metrics.startTime) / 1000;
  return reply.send({
    uptimeSeconds,
    eventsPublished: metrics.eventsPublished,
    eventsFailed: metrics.eventsFailed
  });
}