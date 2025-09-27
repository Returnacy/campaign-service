import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../../../../../../utils/authGuards.js';
import { getCampaignStepHandler } from './get.step.controller.js';
import { patchCampaignStepHandler } from './patch.step.controller.js';
import { deleteCampaignStepHandler } from './delete.step.controller.js';
import { templateRoutes } from './template/template.route.js';
import { stepExecutionsRoutes } from './executions/executions.route.js';

export async function stepRoutes(server: FastifyInstance) {
  server.get('/:stepId', {
    preHandler: requireRole('read', 'campaign-service'),
    handler: getCampaignStepHandler
  });
  server.patch('/:stepId', {
    preHandler: requireRole('update', 'campaign-service'),
    handler: patchCampaignStepHandler
  });
  server.delete('/:stepId', {
    preHandler: requireRole('update', 'campaign-service'),
    handler: deleteCampaignStepHandler
  });

  server.register(templateRoutes, { prefix: '/:stepId' });
  server.register(stepExecutionsRoutes, { prefix: '/:stepId' });
}