import type { FastifyInstance } from 'fastify';
import { requireMembershipRole } from '../../../../../utils/userAuthGuard.js';
import { getCampaignHandler } from './get.campaign.controller.js';
import { patchCampaignHandler } from './patch.campaign.controller.js';
import { postCampaignHandler } from './post.campaign.controller.js';
import { deleteCampaignHandler } from './delete.campaign.controller.js';
import { stepsRoutes } from './steps/steps.route.js';
import { executionsRoutes } from './executions/executions.route.js';

export async function campaignRoutes(server: FastifyInstance) {
  server.get('/:campaignId', {
    preHandler: requireMembershipRole(['admin', 'brand_manager', 'manager']),
    handler: getCampaignHandler
  });
  server.patch('/:campaignId', {
    preHandler: requireMembershipRole(['admin']),
    handler: patchCampaignHandler
  });
  server.post('/:campaignId', {
    preHandler: requireMembershipRole(['admin', 'brand_manager', 'manager']),
    handler: postCampaignHandler
  })
  server.delete('/:campaignId', {
    preHandler: requireMembershipRole(['admin']),
    handler: deleteCampaignHandler
  });

  server.register(stepsRoutes, { prefix: '/:campaignId' });
  server.register(executionsRoutes, { prefix: '/:campaignId' });
}