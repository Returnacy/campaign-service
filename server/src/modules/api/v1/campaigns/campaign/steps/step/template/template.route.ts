import type { FastifyInstance } from 'fastify';
import { requireMembershipRole } from '../../../../../../../../utils/userAuthGuard.js';
import { getStepTemplateHandler } from './get.template.controller.js';
import { patchStepTemplateHandler } from './patch.template.controller.js';

export async function templateRoutes(server: FastifyInstance) {
  server.get('/template', {
    preHandler: requireMembershipRole(['admin', 'brand_manager', 'manager']),
    handler: getStepTemplateHandler
  });
  server.patch('/template', {
    preHandler: requireMembershipRole(['admin']),
    handler: patchStepTemplateHandler
  });
}