import type { FastifyRequest } from "fastify";

export async function getCampaignsService(request: FastifyRequest, businessIds: string[]) {
  const { repository } = request.server;

  const campaigns = await repository.findCampaignsByBusinessOrBrandId(businessIds);

  return campaigns;
}