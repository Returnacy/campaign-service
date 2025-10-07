import type { FastifyInstance } from 'fastify';
import { requireMembershipRole } from '../../../../../../../utils/userAuthGuard.js';
import { getCampaignStepHandler } from './get.step.controller.js';
import { patchCampaignStepHandler } from './patch.step.controller.js';
import { deleteCampaignStepHandler } from './delete.step.controller.js';
import { templateRoutes } from './template/template.route.js';
import { stepExecutionsRoutes } from './executions/executions.route.js';

export async function stepRoutes(server: FastifyInstance) {
  server.get('/:stepId', {
    preHandler: requireMembershipRole(['admin']),
    handler: getCampaignStepHandler
  });
  server.patch('/:stepId', {
    preHandler: requireMembershipRole(['admin']),
    handler: patchCampaignStepHandler
  });
  server.delete('/:stepId', {
    preHandler: requireMembershipRole(['admin']),
    handler: deleteCampaignStepHandler
  });

  server.register(templateRoutes, { prefix: '/:stepId' });
  server.register(stepExecutionsRoutes, { prefix: '/:stepId' });
}