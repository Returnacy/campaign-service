import type { FastifyReply, FastifyRequest } from 'fastify';
import { postQuickCreateService } from './post.quickCreate.service.js';
import { listScopesByRoles } from '../../../../utils/userAuthGuard.js';

export async function postQuickCreateHandler(request: FastifyRequest, reply: FastifyReply) {
  // Get scopes where user has the required roles
  const scopes = listScopesByRoles(request, ['admin', 'brand_manager', 'manager', 'staff']);
  const result = await postQuickCreateService(request, scopes);
  return reply.status(result.statusCode).send(result.body);
}
