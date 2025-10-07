import type { FastifyRequest } from 'fastify';
import type { MembershipScope } from '../../../../../../../types/membershipScope.js';

export async function getCampaignStepService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, scopes: MembershipScope[]) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    // remove duplicates
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  const step = await repository.findCampaignStepById(campaignId, stepId, scopeIds);
  return step;
}
