import type { FastifyReply, FastifyRequest } from 'fastify';
import { getCampaignStepService } from './get.step.service.js';
import { listScopesByRoles } from '../../../../../../../utils/userAuthGuard.js';

export async function getCampaignStepHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const step = await getCampaignStepService(request, scopes);
    if (!step)
      return reply.status(404).send(new Error('Campaign step not found'));

    return reply.send(step);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
