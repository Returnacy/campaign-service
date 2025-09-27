import type { FastifyRequest } from "fastify";
import { ManageCampaign } from "@campaign-service/types";

export async function postCampaignService(request: FastifyRequest<{ Params: { campaignId: string } }>, businessIds: string[], input: ManageCampaign) {
  const { repository } = request.server;

  const campaignId = request.params.campaignId;

  const updatedCampaign = await repository.manageCampaign(campaignId, businessIds, input);

  return updatedCampaign;
}