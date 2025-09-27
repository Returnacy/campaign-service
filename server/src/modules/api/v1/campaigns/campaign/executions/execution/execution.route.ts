import type { FastifyInstance } from 'fastify';
import { requireRole } from '@/utils/authGuards.js';
import { getCampaignExecutionHandler } from './get.execution.controller.js';
import { postCampaignExecutionHandler } from './post.execution.controller.js';

export async function executionRoutes(server: FastifyInstance) {
  server.get('/:executionId', {
    preHandler: requireRole('read', 'campaign-service'),
    handler: getCampaignExecutionHandler
  });
  server.post('/:executionId', {
    preHandler: requireRole('manage', 'campaign-service'),
    handler: postCampaignExecutionHandler
  });
}
