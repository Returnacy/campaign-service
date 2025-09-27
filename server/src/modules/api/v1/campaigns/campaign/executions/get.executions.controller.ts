import { getCampaignExecutionsService } from './get.executions.service.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Query } from '@campaign-service/types';

export async function getCampaignExecutionsHandler(request: FastifyRequest<{ Params: { campaignId: string }, Querystring: Query }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

  const result = await getCampaignExecutionsService(request, businessIds);
  return reply.send(result);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
