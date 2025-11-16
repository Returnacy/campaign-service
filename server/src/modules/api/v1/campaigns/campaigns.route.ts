import type { FastifyInstance } from 'fastify';
import { requireMembershipRole } from '../../../../utils/userAuthGuard.js';
import { postCampaignsHandler } from './post.campaigns.controller.js';
import { getCampaignsHandler } from './get.campaigns.controller.js';
import { getActiveCampaignStatsHandler } from './get.activeCampaignStats.controller.js';
import { postQuickCreateHandler } from './post.quickCreate.controller.js';
import { campaignRoutes } from './campaign/campaign.route.js';

export async function campaignsRoutes(server: FastifyInstance) {
  server.get('/campaigns', {
    preHandler: requireMembershipRole(['admin', 'brand_manager', 'manager']),
    handler: getCampaignsHandler
  });
  server.get('/campaigns/stats/active', {
    preHandler: requireMembershipRole(['admin', 'brand_manager', 'manager']),
    handler: getActiveCampaignStatsHandler
  });
  server.post('/campaigns', {
    preHandler: requireMembershipRole(['admin']),
    handler: postCampaignsHandler
  });
  server.post('/campaigns/quick-create', {
    preHandler: requireMembershipRole(['admin', 'brand_manager', 'manager', 'staff'], { allowAnyMembership: true }),
    handler: postQuickCreateHandler
  });

  server.register(campaignRoutes, { prefix: '/campaigns' });
}