import type { FastifyRequest } from "fastify";
import type { ManageCampaign } from "@campaign-service/types";
import type { MembershipScope } from '../../../../../types/membershipScope.js';

export async function postCampaignService(request: FastifyRequest<{ Params: { campaignId: string } }>, scopes: MembershipScope[], input: ManageCampaign) {
  const { repository } = request.server;

  const campaignId = request.params.campaignId;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  const updatedCampaign = await repository.manageCampaign(campaignId, scopeIds, input);

  return updatedCampaign;
}