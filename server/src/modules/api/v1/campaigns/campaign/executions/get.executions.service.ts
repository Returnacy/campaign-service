import type { FastifyRequest } from 'fastify';
import type { Query } from '@campaign-service/types';

export async function getCampaignExecutionsService(request: FastifyRequest<{ Params: { campaignId: string }; Querystring: Query }>, businessIds: string[]) {
  const { repository } = request.server;
  const { campaignId } = request.params;
  const { page = '1', pageSize = '20' } = (request.query || {}) as Query;

  let pageNum = parseInt(page, 10);
  let sizeNum = parseInt(pageSize, 10);
  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
  if (isNaN(sizeNum) || sizeNum < 1 || sizeNum > 100) sizeNum = 20;

  return repository.findCampaignExecutions(campaignId, businessIds, pageNum, sizeNum);
}
