import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../../../../../utils/authGuards.js';
import { getCampaignStepsHandler } from './get.steps.controller.js';
import { postCampaignStepHandler } from './post.steps.controller.js';
import { stepRoutes } from './step/step.route.js';

export async function stepsRoutes(server: FastifyInstance) {
  server.get('/steps', {
    preHandler: requireRole('read', 'campaign-service'),
    handler: getCampaignStepsHandler
  });
  server.post('/steps', {
    preHandler: requireRole('update', 'campaign-service'),
    handler: postCampaignStepHandler
  });

  server.register(stepRoutes, { prefix: '/steps' });
}