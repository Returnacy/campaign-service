import type { FastifyRequest } from "fastify";
import type { UpdateCampaign } from "@campaign-service/types";
import type { MembershipScope } from '../../../../../types/membershipScope.js';

export async function patchCampaignService(request: FastifyRequest<{ Params: { campaignId: string } }>, scopes: MembershipScope[], input: UpdateCampaign) {
  const { repository } = request.server;

  const campaignId = request.params.campaignId;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  const updatedCampaign = await repository.updateCampaign(campaignId, scopeIds, input);

  return updatedCampaign;
}