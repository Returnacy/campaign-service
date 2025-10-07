import type { FastifyReply, FastifyRequest } from 'fastify';
import { getStepExecutionService } from './get.execution.service.js';
import { listScopesByRoles } from '../../../../../../../../../utils/userAuthGuard.js';

export async function getStepExecutionHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string, executionId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin']);
    if (!scopes || scopes.length === 0)
      throw new Error('No membership scopes found in auth information');

    const result = await getStepExecutionService(request, scopes);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
