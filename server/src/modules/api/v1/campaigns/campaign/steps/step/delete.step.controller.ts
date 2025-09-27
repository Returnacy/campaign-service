import type { FastifyReply, FastifyRequest } from 'fastify';
import { deleteCampaignStepService } from './delete.step.service.js';

export async function deleteCampaignStepHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    await deleteCampaignStepService(request, businessIds);
    return reply.status(204).send();
  } catch (error) {
    return reply.status(400).send(error);
  }
}
