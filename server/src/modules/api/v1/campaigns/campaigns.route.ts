import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../../../utils/authGuards.js';
import { postCampaignsHandler } from './post.campaigns.controller.js';
import { getCampaignsHandler } from './get.campaigns.controller.js';
import { campaignRoutes } from './campaign/campaign.route.js';

export async function campaignsRoutes(server: FastifyInstance) {
  server.get('/campaigns', {
    preHandler: requireRole('list', 'campaign-service'),
    handler: getCampaignsHandler
  });
  server.post('/campaigns', {
    preHandler: requireRole('create', 'campaign-service'),
    handler: postCampaignsHandler
  });

  server.register(campaignRoutes, { prefix: '/campaigns' });
}