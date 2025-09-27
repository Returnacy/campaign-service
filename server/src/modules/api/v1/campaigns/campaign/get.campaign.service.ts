import type { FastifyRequest } from 'fastify';

export async function getCampaignService(request: FastifyRequest<{ Params: { campaignId: string } }>, businessIds: string[]) {
  const { repository } = request.server;

  const campaignId = request.params.campaignId;

  const campaign = await repository.findCampaignById(campaignId, businessIds);
  if (!campaign) throw new Error('Campaign not found');
  return campaign;
}