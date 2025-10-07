import type { FastifyReply, FastifyRequest } from 'fastify';
import { patchCampaignStepService } from './patch.step.service.js';
import { updateCampaignStepSchema } from '@campaign-service/types';
import { listScopesByRoles } from '../../../../../../../utils/userAuthGuard.js';

export async function patchCampaignStepHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');
    

    const input = updateCampaignStepSchema.parse(request.body);

    const step = await patchCampaignStepService(request, scopes, input);
    return reply.send(step);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
