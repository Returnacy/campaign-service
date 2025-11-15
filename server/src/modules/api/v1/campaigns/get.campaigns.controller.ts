import type { FastifyReply, FastifyRequest } from 'fastify';

import { getCampaignsService } from './get.campaigns.service.js';
import { listScopesByRoles } from '../../../../utils/userAuthGuard.js';

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
    if (requestedBusinessId) {
      // Filter to only the requested business (if user has access)
      filteredScopes = scopes.filter(s => s.businessId === requestedBusinessId);
      if (filteredScopes.length === 0) {
        return reply.status(403).send({ error: 'Access denied to the requested business' });
      }
    } else if (requestedBrandId) {
      // Filter to only the requested brand (if user has access)
      filteredScopes = scopes.filter(s => s.brandId === requestedBrandId);
      if (filteredScopes.length === 0) {
        return reply.status(403).send({ error: 'Access denied to the requested brand' });
      }
    }

    const campaigns = await getCampaignsService(request, filteredScopes);

    return reply.send(campaigns);
  } catch (error) {
    return reply.status(400).send(error);
  }
}