import type { FastifyReply, FastifyRequest } from 'fastify';

import { postCampaignService } from './post.campaign.service.js';
import { manageCampaignSchema } from '@campaign-service/types';

export async function patchCampaignHandler(request: FastifyRequest<{ Params: { campaignId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const input = manageCampaignSchema.parse(request.body);

    const campaign = await postCampaignService(request, businessIds, input);
    return reply.send(campaign);
  } catch (error) {
    return reply.status(400).send(error);
  }
}