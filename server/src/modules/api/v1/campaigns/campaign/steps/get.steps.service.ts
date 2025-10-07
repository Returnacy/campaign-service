import type { FastifyRequest } from 'fastify';
import type { MembershipScope } from '../../../../../../types/membershipScope.js';

export async function getCampaignStepsService(request: FastifyRequest<{ Params: { campaignId: string } }>, scopes: MembershipScope[]) {
  const { repository } = request.server;
  const campaignId = request.params.campaignId;

  // Prefer businessId when available, otherwise fall back to brandId; dedupe the resulting scopes list.
  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    // remove duplicates
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  const steps = await repository.findCampaignSteps(campaignId, scopeIds);
  return steps;
}
