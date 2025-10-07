import type { FastifyInstance } from 'fastify';
import { requireMembershipRole } from '../../../../utils/userAuthGuard.js';
import { postCampaignsHandler } from './post.campaigns.controller.js';
import { getCampaignsHandler } from './get.campaigns.controller.js';
import { campaignRoutes } from './campaign/campaign.route.js';

export async function campaignsRoutes(server: FastifyInstance) {
  server.get('/campaigns', {
    preHandler: requireMembershipRole(['admin', 'brand_manager', 'manager']),
    handler: getCampaignsHandler
  });
  server.post('/campaigns', {
    preHandler: requireMembershipRole(['admin']),
    handler: postCampaignsHandler
  });

  server.register(campaignRoutes, { prefix: '/campaigns' });
}