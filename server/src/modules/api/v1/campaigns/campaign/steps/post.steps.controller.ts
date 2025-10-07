import type { FastifyReply, FastifyRequest } from 'fastify';
import { postCampaignStepService } from './post.steps.service.js';
import { createCampaignStepSchema } from '@campaign-service/types';
import { listScopesByRoles } from '../../../../../../utils/userAuthGuard.js';

export async function postCampaignStepHandler(request: FastifyRequest<{ Params: { campaignId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const input = createCampaignStepSchema.parse(request.body);

  const step = await postCampaignStepService(request, scopes, input);
    return reply.send(step);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
