import type { FastifyReply, FastifyRequest } from 'fastify';
import { postCampaignExecutionService } from './post.execution.service.js';
import { manageCampaignExecutionSchema } from '@campaign-service/types';
import { listScopesByRoles } from '../../../../../../../utils/userAuthGuard.js';

export async function postCampaignExecutionHandler(request: FastifyRequest<{ Params: { campaignId: string, executionId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const input = manageCampaignExecutionSchema.parse(request.body);

    const execution = await postCampaignExecutionService(request, scopes, input);
    return reply.send(execution);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
