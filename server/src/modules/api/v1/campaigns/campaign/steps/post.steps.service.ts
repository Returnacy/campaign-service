import type { FastifyRequest } from 'fastify';
import type { CreateCampaignStep } from '@campaign-service/types';
import type { MembershipScope } from '../../../../../../types/membershipScope.js';

export async function postCampaignStepService(request: FastifyRequest<{ Params: { campaignId: string } }>, scopes: MembershipScope[], input: CreateCampaignStep) {
  const { repository } = request.server;
  const campaignId = request.params.campaignId;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    // remove duplicates
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  const step = await repository.createCampaignStep(campaignId, scopeIds, input);
  return step;
}
