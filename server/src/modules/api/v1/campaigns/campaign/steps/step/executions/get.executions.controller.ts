import type { FastifyReply, FastifyRequest } from 'fastify';
import { getStepExecutionsService } from './get.executions.service.js';
import type { Query } from '@campaign-service/types';

export async function getStepExecutionsHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string }, Querystring: Query }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const result = await getStepExecutionsService(request, businessIds);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
