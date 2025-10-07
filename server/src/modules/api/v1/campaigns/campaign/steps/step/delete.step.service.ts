import type { FastifyRequest } from 'fastify';
import type { MembershipScope } from '../../../../../../../types/membershipScope.js';

export async function deleteCampaignStepService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, scopes: MembershipScope[]) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  await repository.deleteCampaignStep(campaignId, stepId, scopeIds);
}
