import type { FastifyRequest } from 'fastify';
import type { MembershipScope } from '../../../../../types/membershipScope.js';

export async function getCampaignService(request: FastifyRequest<{ Params: { campaignId: string } }>, scopes: MembershipScope[]) {
  const { repository } = request.server;

  const campaignId = request.params.campaignId;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    // remove duplicates
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  const campaign = await repository.findCampaignById(campaignId, scopeIds);
  if (!campaign) throw new Error('Campaign not found');
  return campaign;
}