import type { FastifyRequest } from 'fastify';

export async function deleteCampaignStepService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, businessIds: string[]) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  await repository.deleteCampaignStep(campaignId, stepId, businessIds);
}
