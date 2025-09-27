import type { FastifyRequest } from 'fastify';
import type { CreateCampaignStep } from '@campaign-service/types';

export async function postCampaignStepService(request: FastifyRequest<{ Params: { campaignId: string } }>, businessIds: string[], input: CreateCampaignStep) {
  const { repository } = request.server;
  const campaignId = request.params.campaignId;

  const step = await repository.createCampaignStep(campaignId, businessIds, input);
  return step;
}
