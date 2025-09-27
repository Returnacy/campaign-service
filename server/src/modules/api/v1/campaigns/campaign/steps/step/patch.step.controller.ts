import type { FastifyReply, FastifyRequest } from 'fastify';
import { patchCampaignStepService } from './patch.step.service.js';
import { updateCampaignStepSchema } from '@campaign-service/types';

export async function patchCampaignStepHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const input = updateCampaignStepSchema.parse(request.body);

    const step = await patchCampaignStepService(request, businessIds, input);
    return reply.send(step);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
