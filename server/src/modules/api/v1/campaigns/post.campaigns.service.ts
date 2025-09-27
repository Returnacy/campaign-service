import type { FastifyRequest } from "fastify";
import type { CreateCampaign } from "@campaign-service/types";

export async function postCampaignsService(request: FastifyRequest, input: CreateCampaign) {
  const { repository } = request.server;

  const newCampaign = await repository.createCampaign(input);
  
  return newCampaign;
}