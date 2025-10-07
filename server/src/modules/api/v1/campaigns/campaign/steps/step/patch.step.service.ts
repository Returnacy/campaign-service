import type { FastifyRequest } from 'fastify';
import type { UpdateCampaignStep } from '@campaign-service/types';
import type { MembershipScope } from '../../../../../../../types/membershipScope.js';

export async function patchCampaignStepService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, scopes: MembershipScope[], input: UpdateCampaignStep) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  const step = await repository.updateCampaignStep(campaignId, stepId, scopeIds, input);
  return step;
}
