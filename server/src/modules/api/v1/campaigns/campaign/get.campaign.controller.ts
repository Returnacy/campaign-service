import type { FastifyReply, FastifyRequest } from 'fastify';

import { getCampaignService } from './get.campaign.service.js';

export async function getCampaignHandler(request: FastifyRequest<{ Params: { campaignId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const campaign = await getCampaignService(request, businessIds);
    return reply.send(campaign);
  } catch (error) {
    return reply.status(400).send(error);
  }
}