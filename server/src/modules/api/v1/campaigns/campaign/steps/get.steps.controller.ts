import type { FastifyReply, FastifyRequest } from 'fastify';
import { getCampaignStepsService } from './get.steps.service.js';

export async function getCampaignStepsHandler(request: FastifyRequest<{ Params: { campaignId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const steps = await getCampaignStepsService(request, businessIds);
    return reply.send(steps);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
