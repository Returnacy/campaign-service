import type { FastifyReply, FastifyRequest } from 'fastify';
import { getStepExecutionService } from './get.execution.service.js';

export async function getStepExecutionHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string, executionId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const result = await getStepExecutionService(request, businessIds);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
