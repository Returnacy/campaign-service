import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../../../../../../../utils/authGuards.js';
import { getStepExecutionsHandler } from './get.executions.controller.js';
import { executionRoutes } from './execution/execution.route.js';

export async function stepExecutionsRoutes(server: FastifyInstance) {
  server.get('/executions', {
    preHandler: requireRole('read', 'campaign-service'),
    handler: getStepExecutionsHandler
  });

  server.register(executionRoutes, { prefix: '/executions' });
}
