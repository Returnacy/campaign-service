import type { FastifyInstance } from 'fastify';
import { requireMembershipRole } from '../../../../../../utils/userAuthGuard.js';
import { getCampaignStepsHandler } from './get.steps.controller.js';
import { postCampaignStepHandler } from './post.steps.controller.js';
import { stepRoutes } from './step/step.route.js';

export async function stepsRoutes(server: FastifyInstance) {
  server.get('/steps', {
    preHandler: requireMembershipRole(['admin']),
    handler: getCampaignStepsHandler
  });
  server.post('/steps', {
    preHandler: requireMembershipRole(['admin']),
    handler: postCampaignStepHandler
  });

  server.register(stepRoutes, { prefix: '/steps' });
}