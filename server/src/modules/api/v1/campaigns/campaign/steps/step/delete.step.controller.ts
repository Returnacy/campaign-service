import type { FastifyReply, FastifyRequest } from 'fastify';
import { deleteCampaignStepService } from './delete.step.service.js';
import { listScopesByRoles } from '../../../../../../../utils/userAuthGuard.js';

export async function deleteCampaignStepHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');


    await deleteCampaignStepService(request, scopes);
    return reply.status(204).send();
  } catch (error) {
    return reply.status(400).send(error);
  }
}
