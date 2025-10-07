import type { FastifyReply, FastifyRequest } from 'fastify';

import { getCampaignService } from './get.campaign.service.js';
import { listScopesByRoles } from '../../../../../utils/userAuthGuard.js';

export async function getCampaignHandler(request: FastifyRequest<{ Params: { campaignId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin', 'brand_manager', 'manager']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

  const campaign = await getCampaignService(request, scopes);
    return reply.send(campaign);
  } catch (error) {
    return reply.status(400).send(error);
  }
}