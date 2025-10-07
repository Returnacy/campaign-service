import type { FastifyInstance } from 'fastify';
import { requireMembershipRole } from '../../../../../../../utils/userAuthGuard.js';
import { getCampaignExecutionHandler } from './get.execution.controller.js';
import { postCampaignExecutionHandler } from './post.execution.controller.js';

export async function executionRoutes(server: FastifyInstance) {
  server.get('/:executionId', {
    preHandler: requireMembershipRole(['admin']),
    handler: getCampaignExecutionHandler
  });
  server.post('/:executionId', {
    preHandler: requireMembershipRole(['admin']),
    handler: postCampaignExecutionHandler
  });
}
