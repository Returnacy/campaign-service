import type { FastifyInstance } from 'fastify';
import { requireMembershipRole } from '../../../../../../../../utils/userAuthGuard.js';
import { getStepExecutionsHandler } from './get.executions.controller.js';
import { executionRoutes } from './execution/execution.route.js';

export async function stepExecutionsRoutes(server: FastifyInstance) {
  server.get('/executions', {
    preHandler: requireMembershipRole(['admin']),
    handler: getStepExecutionsHandler
  });

  server.register(executionRoutes, { prefix: '/executions' });
}
