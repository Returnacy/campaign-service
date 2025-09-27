import type { FastifyReply, FastifyRequest } from 'fastify';
import { postCampaignExecutionService } from './post.execution.service.js';
import { manageCampaignExecutionSchema } from '@campaign-service/types';

export async function postCampaignExecutionHandler(request: FastifyRequest<{ Params: { campaignId: string, executionId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const input = manageCampaignExecutionSchema.parse(request.body);

    const execution = await postCampaignExecutionService(request, businessIds, input);
    return reply.send(execution);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
