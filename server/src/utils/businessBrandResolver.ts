import type { FastifyRequest } from 'fastify';

/**
 * Resolves the brandId for a given businessId by querying the campaigns table.
 *
 * This is a temporary solution - in the future, this should be replaced with
 * a proper tenant-resolver service that maintains business-brand mappings.
 *
 * Limitation: Only works for businesses that have at least one campaign.
 * If a business has no campaigns, this will return null.
 *
 * @param businessId The business ID to resolve
 * @param request Fastify request object (provides access to repository)
 * @returns The brandId if found, null otherwise
 */
export async function getBrandIdForBusiness(
  businessId: string,
  request: FastifyRequest
): Promise<string | null> {
  const repository = (request.server as any).repository;

  // Use raw query through repository to find any campaign for this business
  const campaigns = await repository.findCampaignsByBusinessId(businessId);

  if (campaigns && campaigns.length > 0) {
    return campaigns[0].brandId || null;
  }

  return null;
}
