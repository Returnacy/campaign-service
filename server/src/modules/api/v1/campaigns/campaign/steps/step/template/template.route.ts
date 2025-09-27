import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../../../../../../../utils/authGuards.js';
import { getStepTemplateHandler } from './get.template.controller.js';
import { patchStepTemplateHandler } from './patch.template.controller.js';

export async function templateRoutes(server: FastifyInstance) {
  server.get('/template', {
    preHandler: requireRole('read', 'campaign-service'),
    handler: getStepTemplateHandler
  });
  server.patch('/template', {
    preHandler: requireRole('update', 'campaign-service'),
    handler: patchStepTemplateHandler
  });
}