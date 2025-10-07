import type { FastifyReply, FastifyRequest } from 'fastify';
import { getCampaignExecutionService } from './get.execution.service.js';
import { listScopesByRoles } from '../../../../../../../utils/userAuthGuard.js';

export async function getCampaignExecutionHandler(request: FastifyRequest<{ Params: { campaignId: string, executionId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const execution = await getCampaignExecutionService(request, scopes);
    if (!execution)
      return reply.status(404).send(new Error('Campaign execution not found'));

    return reply.send(execution);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
