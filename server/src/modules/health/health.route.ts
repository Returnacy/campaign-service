import type { FastifyInstance } from 'fastify';
import { getHealthHandler } from './health.controller.js';

export async function healthRoute(server: FastifyInstance) {
  server.get('/health', {
    logLevel: 'warn',
    handler: getHealthHandler
  });
}
