import type { FastifyReply, FastifyRequest } from 'fastify';
import { deleteCampaignService } from './delete.campaign.service.js';

export async function deleteCampaignHandler(request: FastifyRequest<{ Params: { campaignId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    await deleteCampaignService(request, businessIds);
    return reply.status(204).send();
  } catch (error) {
    return reply.status(400).send(error);
  }
}
