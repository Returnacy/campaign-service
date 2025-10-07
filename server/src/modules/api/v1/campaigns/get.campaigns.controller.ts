import type { FastifyReply, FastifyRequest } from 'fastify';

import { getCampaignsService } from './get.campaigns.service.js';
import { listScopesByRoles } from '../../../../utils/userAuthGuard.js';

export async function getCampaignsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = listScopesByRoles(request, ['admin', 'brand_manager', 'manager']);
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const campaigns = await getCampaignsService(request, businessIds);
    
    return reply.send(campaigns);
  } catch (error) {
    return reply.status(400).send(error);
  }
}