import type { FastifyRequest } from 'fastify';

export async function getCampaignExecutionService(request: FastifyRequest<{ Params: { campaignId: string, executionId: string } }>, businessIds: string[]) {
  const { repository } = request.server;
  const { campaignId, executionId } = request.params;

  return repository.findCampaignExecutionById(campaignId, executionId, businessIds);
}
