import type { FastifyRequest } from 'fastify';
import type { ManageCampaignExecution } from '@campaign-service/types';
import type { MembershipScope } from '../../../../../../../types/membershipScope.js';

export async function postCampaignExecutionService(request: FastifyRequest<{ Params: { campaignId: string, executionId: string } }>, scopes: MembershipScope[], input: ManageCampaignExecution) {
  const { repository } = request.server;
  const { campaignId, executionId } = request.params;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  return repository.manageCampaignExecution(campaignId, executionId, scopeIds, input);
}
