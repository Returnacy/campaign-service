import type { FastifyReply, FastifyRequest } from 'fastify';

export async function getHealthHandler(request: FastifyRequest, reply: FastifyReply) {
  const start = Date.now();
  try {
    const { repository } = request.server;
    let dbHealthy = false;
    try {
      await repository.healthCheck();
      dbHealthy = true;
    } catch (e) {
      dbHealthy = false;
    }

    const latencyMs = Date.now() - start;

    const status = dbHealthy ? 'ok' : 'degraded';
    const httpStatus = dbHealthy ? 200 : 503;

    return reply.status(httpStatus).send({
      status,
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      latencyMs,
      checks: {
        database: dbHealthy ? 'up' : 'down'
      }
    });
  } catch (error) {
    return reply.status(500).send({ status: 'error', error: (error as Error).message });
  }
}