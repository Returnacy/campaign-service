import type { FastifyReply, FastifyRequest } from 'fastify';

import { postCampaignsService } from './post.campaigns.service.js';
import { createCampaignSchema } from '@campaign-service/types';

export async function postCampaignsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const input = createCampaignSchema.parse(request.body);

    const campaign = await postCampaignsService(request, input);
    return reply.send(campaign);
  } catch (error) {
    return reply.status(400).send(error);
  }
}