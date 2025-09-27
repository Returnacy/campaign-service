import type { FastifyRequest } from 'fastify';

export async function deleteCampaignService(request: FastifyRequest<{ Params: { campaignId: string } }>, businessIds: string[]) {
  const { repository } = request.server;
  const { campaignId } = request.params;

  await repository.deleteCampaign(campaignId, businessIds);
}
