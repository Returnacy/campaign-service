import type { FastifyRequest } from 'fastify';
import type { MembershipScope } from '../../../../../../../types/membershipScope.js';

export async function getCampaignExecutionService(request: FastifyRequest<{ Params: { campaignId: string, executionId: string } }>, scopes: MembershipScope[]) {
  const { repository } = request.server;
  const { campaignId, executionId } = request.params;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  return repository.findCampaignExecutionById(campaignId, executionId, scopeIds);
}
