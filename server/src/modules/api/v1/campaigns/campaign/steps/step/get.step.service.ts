import type { FastifyRequest } from 'fastify';

export async function getCampaignStepService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, businessIds: string[]) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  const step = await repository.findCampaignStepById(campaignId, stepId, businessIds);
  return step;
}
