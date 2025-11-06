import type { FastifyReply, FastifyRequest } from 'fastify';

import { postCampaignService } from './post.campaign.service.js';
import { listScopesByRoles } from '../../../../../utils/userAuthGuard.js';
import { manageCampaignSchema } from '@campaign-service/types';

export async function postCampaignHandler(request: FastifyRequest<{ Params: { campaignId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

  // Allow admins, brand managers, and managers to manage campaign lifecycle
  const scopes = listScopesByRoles(request, ['admin', 'brand_manager', 'manager']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const input = manageCampaignSchema.parse(request.body);

    const campaign = await postCampaignService(request, scopes, input);
    return reply.send(campaign);
  } catch (error) {
    return reply.status(400).send(error);
  }
}