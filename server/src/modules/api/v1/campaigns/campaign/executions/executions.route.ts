import type { FastifyInstance } from 'fastify';
import { requireMembershipRole } from '../../../../../../utils/userAuthGuard.js';
import { getCampaignExecutionsHandler } from './get.executions.controller.js';
import { executionRoutes } from './execution/execution.route.js';

export async function executionsRoutes(server: FastifyInstance) {
  server.get('/executions', {
    preHandler: requireMembershipRole(['admin']),
    handler: getCampaignExecutionsHandler
  });

  server.register(executionRoutes, { prefix: '/executions' });
}
