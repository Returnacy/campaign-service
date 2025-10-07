import type { FastifyRequest } from "fastify";
import type { MembershipScope } from '../../../../types/membershipScope.js';

export async function getCampaignsService(request: FastifyRequest, scopes: MembershipScope[]) {
  const { repository } = request.server;
  const campaigns = [] as any[];

  for (const scope of scopes) {
    // If a scope has a businessId, use ONLY business lookup and discard the brandId for that scope.
    if (scope.businessId) {
      const byBiz = await repository.findCampaignsByBusinessId(scope.businessId);
      campaigns.push(...byBiz);
    }
    // Otherwise, if it has only brandId, use brand lookup.
    else if (scope.brandId) {
      const byBrand = await repository.findCampaignsByBrandId(scope.brandId);
      campaigns.push(...byBrand);
    }
  }

  return campaigns;
}