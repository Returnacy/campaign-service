import type { FastifyReply, FastifyRequest } from 'fastify';
import { deleteCampaignService } from './delete.campaign.service.js';
import { listScopesByRoles } from '../../../../../utils/userAuthGuard.js';

export async function deleteCampaignHandler(request: FastifyRequest<{ Params: { campaignId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth) 
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const campaign = await deleteCampaignService(request, scopes);
    return reply.status(204).send();
  } catch (error) {
    return reply.status(400).send(error);
  }
}
