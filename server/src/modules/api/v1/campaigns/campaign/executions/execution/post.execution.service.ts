import type { FastifyRequest } from 'fastify';
import type { ManageCampaignExecution } from '@campaign-service/types';

export async function postCampaignExecutionService(request: FastifyRequest<{ Params: { campaignId: string, executionId: string } }>, businessIds: string[], input: ManageCampaignExecution) {
  const { repository } = request.server;
  const { campaignId, executionId } = request.params;

  return repository.manageCampaignExecution(campaignId, executionId, businessIds, input);
}
