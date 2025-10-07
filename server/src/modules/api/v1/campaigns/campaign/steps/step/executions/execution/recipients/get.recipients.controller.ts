import type { FastifyReply, FastifyRequest } from 'fastify';
import { getStepExecutionRecipientsService } from './get.recipients.service.js';
import { listScopesByRoles } from '../../../../../../../../../../utils/userAuthGuard.js';
import type { Query } from '@campaign-service/types';

export async function getStepExecutionRecipientsHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string, executionId: string }, Querystring: Query }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const result = await getStepExecutionRecipientsService(request, scopes);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
