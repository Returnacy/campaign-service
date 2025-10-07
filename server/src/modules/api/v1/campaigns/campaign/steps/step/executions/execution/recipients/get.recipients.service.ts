import type { FastifyRequest } from 'fastify';
import type { Query } from '@campaign-service/types';
import type { MembershipScope } from '../../../../../../../../../../types/membershipScope.js';

export async function getStepExecutionRecipientsService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string, executionId: string }, Querystring: Query }>, scopes: MembershipScope[]) {
  const { repository } = request.server;
  const { campaignId, stepId, executionId } = request.params;
  const { page = '1', pageSize = '20' } = (request.query || {}) as Query;

  let pageNum = parseInt(page || '1', 10);
  let sizeNum = parseInt(pageSize || '20', 10);
  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
  if (isNaN(sizeNum) || sizeNum < 1) sizeNum = 20;
  if (sizeNum > 100) sizeNum = 100;

  const scopeIds = scopes
    .map(s => s.businessId ?? s.brandId)
    .filter((id): id is string => !!id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  return repository.findStepExecutionRecipients(campaignId, stepId, executionId, scopeIds, pageNum, sizeNum);
}
