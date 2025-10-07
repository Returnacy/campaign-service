import type { FastifyReply, FastifyRequest } from 'fastify';
import { getStepExecutionsService } from './get.executions.service.js';
import { listScopesByRoles } from '../../../../../../../../utils/userAuthGuard.js';
import type { Query } from '@campaign-service/types';

export async function getStepExecutionsHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string }, Querystring: Query }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const result = await getStepExecutionsService(request, scopes);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
