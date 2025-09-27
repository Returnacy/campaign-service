import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Query } from '@campaign-service/types';
import { getStepExecutionHandler } from './get.execution.controller.js';
import { getStepExecutionRecipientsHandler } from './recipients/get.recipients.controller.js';
import { requireRole } from '@/utils/authGuards.js';

export async function executionRoutes(server: FastifyInstance) {
  server.get<{ Params: { campaignId: string; stepId: string; executionId: string } }>(
    '/:executionId',
    { preHandler: requireRole('read', 'campaign-service') },
    (request: FastifyRequest<{ Params: { campaignId: string; stepId: string; executionId: string } }>, reply: FastifyReply) => getStepExecutionHandler(request, reply)
  );

  server.get<{ Params: { campaignId: string; stepId: string; executionId: string }; Querystring: Query }>(
    '/:executionId/recipients',
    { preHandler: requireRole('read', 'campaign-service') },
    (request: FastifyRequest<{ Params: { campaignId: string; stepId: string; executionId: string }; Querystring: Query }>, reply: FastifyReply) => getStepExecutionRecipientsHandler(request, reply)
  );
}
