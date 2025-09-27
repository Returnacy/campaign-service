import type { FastifyRequest } from 'fastify';
import type { UpdateCampaignStep } from '@campaign-service/types';

export async function patchCampaignStepService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, businessIds: string[], input: UpdateCampaignStep) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  const step = await repository.updateCampaignStep(campaignId, stepId, businessIds, input);
  return step;
}
