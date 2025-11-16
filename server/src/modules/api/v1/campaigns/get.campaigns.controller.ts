import type { FastifyReply, FastifyRequest } from 'fastify';

import { getCampaignsService } from './get.campaigns.service.js';
import { listScopesByRoles, hasRoleForBrand } from '../../../../utils/userAuthGuard.js';
import { getBrandIdForBusiness } from '../../../../utils/businessBrandResolver.js';

export async function getCampaignsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const scopes = listScopesByRoles(request, ['admin', 'brand_manager', 'manager']);
    if (!scopes)
      throw new Error('No scopes found in auth information');

    // Extract optional tenant context from query parameters
    const query = request.query as any;
    const requestedBrandId = query?.brandId;
    const requestedBusinessId = query?.businessId;

    // Filter scopes based on requested tenant context
    let filteredScopes = scopes;
  const { debugMemberships } = await import('../../../../utils/userAuthGuard.js');
    if (requestedBusinessId) {
      // Filter to only the requested business (if user has direct business-level access)
      filteredScopes = scopes.filter(s => s.businessId === requestedBusinessId);

      if (filteredScopes.length === 0) {
        // User doesn't have direct business-level role membership
        // Check if they have brand-level access that should inherit to this business

        const brandId = await getBrandIdForBusiness(requestedBusinessId, request);

        if (!brandId) {
          // Business not found or has no campaigns
          request.server.log.warn({
            path: request.url,
            businessId: requestedBusinessId
          }, 'Business not found or has no campaigns - cannot determine brand');

          // Check if user has ANY membership for this business (fallback)
          const memberships = (request as any).userMemberships ?? [];
          const hasMembership = memberships.some((m: any) => m.businessId === requestedBusinessId);

          if (hasMembership) {
            // User has some membership, grant access
            filteredScopes = [{
              brandId: memberships.find((m: any) => m.businessId === requestedBusinessId)?.brandId ?? null,
              businessId: requestedBusinessId
            }];
          } else {
            return reply.status(403).send({ error: 'Access denied to the requested business' });
          }
        } else {
          // We found the brandId for this business
          // Check if user has brand-level elevated roles
          if (hasRoleForBrand(request, brandId, ['admin', 'brand_manager', 'manager'])) {
            // Grant access via brand-level role inheritance
            filteredScopes = [{ brandId, businessId: requestedBusinessId }];
            request.server.log.info({
              path: request.url,
              brandId,
              businessId: requestedBusinessId,
              method: 'brand_inheritance'
            }, 'Access granted via brand-level role inheritance');
          } else {
            // User doesn't have brand-level access either
            // Final fallback: check for any membership
            const memberships = (request as any).userMemberships ?? [];
            const hasMembership = memberships.some((m: any) => m.businessId === requestedBusinessId);

            if (hasMembership) {
              filteredScopes = [{
                brandId: memberships.find((m: any) => m.businessId === requestedBusinessId)?.brandId ?? null,
                businessId: requestedBusinessId
              }];
            } else {
              request.server.log.info({
                path: request.url,
                memberships: debugMemberships(request).memberships,
                businessId: requestedBusinessId,
                brandId
              }, 'Access denied to requested business - no matching scopes or membership');
              return reply.status(403).send({ error: 'Access denied to the requested business' });
            }
          }
        }
      }
    } else if (requestedBrandId) {
      // Filter to only the requested brand (if user has access via roles)
      filteredScopes = scopes.filter(s => s.brandId === requestedBrandId);
      if (filteredScopes.length === 0) {
        // Fallback: allow if user has any membership for that brand (brand-level or business-level membership)
        const memberships = (request as any).userMemberships ?? [];
        const match = memberships.find((m: any) => m.brandId === requestedBrandId);
        if (match) {
          filteredScopes = [{ brandId: requestedBrandId, businessId: match.businessId ?? null }];
        } else {
          request.server.log.info({ path: request.url, memberships: debugMemberships(request).memberships }, 'Access denied to requested brand - no matching scopes or membership');
          return reply.status(403).send({ error: 'Access denied to the requested brand' });
        }
      }
    }

    const campaigns = await getCampaignsService(request, filteredScopes);

    return reply.send(campaigns);
  } catch (error) {
    return reply.status(400).send(error);
  }
}