import type { FastifyReply, FastifyRequest } from 'fastify';
import { getStepTemplateService } from './get.template.service.js';
import { listScopesByRoles } from '../../../../../../../../utils/userAuthGuard.js';

export async function getStepTemplateHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const template = await getStepTemplateService(request, scopes);
    return reply.send(template);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
