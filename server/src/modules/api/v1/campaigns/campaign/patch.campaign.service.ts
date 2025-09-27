import type { FastifyRequest } from "fastify";
import { UpdateCampaign } from "@campaign-service/types";

export async function patchCampaignService(request: FastifyRequest<{ Params: { campaignId: string } }>, businessIds: string[], input: UpdateCampaign) {
  const { repository } = request.server;

  const campaignId = request.params.campaignId;

  const updatedCampaign = await repository.updateCampaign(campaignId, businessIds, input);

  return updatedCampaign;
}