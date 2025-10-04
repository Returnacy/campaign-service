import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../../../../../utils/authGuards.js';
import { getCampaignExecutionsHandler } from './get.executions.controller.js';
import { executionRoutes } from './execution/execution.route.js';

export async function executionsRoutes(server: FastifyInstance) {
  server.get('/executions', {
    preHandler: requireRole('read', 'campaign-service'),
    handler: getCampaignExecutionsHandler
  });

  server.register(executionRoutes, { prefix: '/executions' });
}
