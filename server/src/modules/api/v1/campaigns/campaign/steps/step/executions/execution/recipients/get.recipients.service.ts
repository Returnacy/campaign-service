import type { FastifyRequest } from 'fastify';
import type { Query } from '@campaign-service/types';

export async function getStepExecutionRecipientsService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string, executionId: string }, Querystring: Query }>, businessIds: string[]) {
  const { repository } = request.server;
  const { campaignId, stepId, executionId } = request.params;
  const { page = '1', pageSize = '20' } = (request.query || {}) as Query;

  let pageNum = parseInt(page || '1', 10);
  let sizeNum = parseInt(pageSize || '20', 10);
  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
  if (isNaN(sizeNum) || sizeNum < 1) sizeNum = 20;
  if (sizeNum > 100) sizeNum = 100;

  return repository.findStepExecutionRecipients(campaignId, stepId, executionId, businessIds, pageNum, sizeNum);
}
