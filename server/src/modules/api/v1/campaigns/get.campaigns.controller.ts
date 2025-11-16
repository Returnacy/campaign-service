import type { FastifyReply, FastifyRequest } from 'fastify';

import { getCampaignsService } from './get.campaigns.service.js';
import { listScopesByRoles, hasRoleForBrand } from '../../../../utils/userAuthGuard.js';

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
      // Filter to only the requested business (if user has access via roles)
      filteredScopes = scopes.filter(s => s.businessId === requestedBusinessId);
      if (filteredScopes.length === 0) {
        // Check if user has brand-level elevated role that should grant access to this business
        const memberships = (request as any).userMemberships ?? [];
        const businessMembership = memberships.find((m: any) => m.businessId === requestedBusinessId);
        const brandId = businessMembership?.brandId;

        if (brandId && hasRoleForBrand(request, brandId, ['admin', 'brand_manager', 'manager'])) {
          // User has elevated role at brand level - grant access to this business
          filteredScopes = [{ brandId, businessId: requestedBusinessId }];
          request.server.log.info({
            path: request.url,
            brandId,
            businessId: requestedBusinessId
          }, 'Access granted via brand-level role inheritance');
        } else {
          // Fallback: allow if user has any membership for that business (even without elevated roles)
          const hasMembership = memberships.some((m: any) => m.businessId === requestedBusinessId);
          if (hasMembership) {
            // Create a single scope representing the business membership so service can resolve campaigns
            filteredScopes = [{ brandId: memberships.find((m: any) => m.businessId === requestedBusinessId)?.brandId ?? null, businessId: requestedBusinessId }];
          } else {
            request.server.log.info({ path: request.url, memberships: debugMemberships(request).memberships }, 'Access denied to requested business - no matching scopes or membership');
            return reply.status(403).send({ error: 'Access denied to the requested business' });
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