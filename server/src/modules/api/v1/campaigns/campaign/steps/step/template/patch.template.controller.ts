import type { FastifyReply, FastifyRequest } from 'fastify';
import { patchStepTemplateService } from './patch.template.service.js';
import { updateStepTemplateSchema } from '@campaign-service/types'
import { listScopesByRoles } from '../../../../../../../../utils/userAuthGuard.js';

export async function patchStepTemplateHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const templates = updateStepTemplateSchema.parse(request.body);

    const updated = await patchStepTemplateService(request, scopes, templates);
    return reply.send(updated);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
