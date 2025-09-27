import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../../../../utils/authGuards.js';
import { getCampaignHandler } from './get.campaign.controller.js';
import { patchCampaignHandler } from './patch.campaign.controller.js';
import { postCampaignsHandler } from '../post.campaigns.controller.js';
import { stepsRoutes } from './steps/steps.route.js';
import { executionsRoutes } from './executions/executions.route.js';

export async function campaignRoutes(server: FastifyInstance) {
  server.get('/:campaignId', {
    preHandler: requireRole('read', 'campaign-service'),
    handler: getCampaignHandler
  });
  server.patch('/:campaignId', {
    preHandler: requireRole('update', 'campaign-service'),
    handler: patchCampaignHandler
  });
  server.post('/:campaignId', {
    preHandler: requireRole('manage', 'campaign-service'),
    handler: postCampaignsHandler
  })

  server.register(stepsRoutes, { prefix: '/:campaignId' });
  server.register(executionsRoutes, { prefix: '/:campaignId' });
}