import type { FastifyReply, FastifyRequest } from 'fastify';
import { postQuickCreateService } from './post.quickCreate.service.js';

export async function postQuickCreateHandler(request: FastifyRequest, reply: FastifyReply) {
  const scopes = (request as any).membershipScopes || [];
  const result = await postQuickCreateService(request, scopes);
  return reply.status(result.statusCode).send(result.body);
}
