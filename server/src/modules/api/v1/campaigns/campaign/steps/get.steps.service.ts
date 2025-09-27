import type { FastifyRequest } from 'fastify';

export async function getCampaignStepsService(request: FastifyRequest<{ Params: { campaignId: string } }>, businessIds: string[]) {
  const { repository } = request.server;
  const campaignId = request.params.campaignId;

  const steps = await repository.findCampaignSteps(campaignId, businessIds);
  return steps;
}
