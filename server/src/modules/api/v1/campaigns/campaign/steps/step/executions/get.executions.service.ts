import type { FastifyRequest } from 'fastify';
import type { Query } from '@campaign-service/types';

export async function getStepExecutionsService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string }, Querystring: Query }>, businessIds: string[]) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;
  const q = (request.query || {}) as Partial<Record<'page' | 'pageSize', number | string>>;
  const rawPage = q.page ?? 1;
  const rawPageSize = q.pageSize ?? 20;
  let pageNum = typeof rawPage === 'string' ? parseInt(rawPage, 10) : rawPage;
  let sizeNum = typeof rawPageSize === 'string' ? parseInt(rawPageSize, 10) : rawPageSize;
  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
  if (isNaN(sizeNum) || sizeNum < 1) sizeNum = 20;
  if (sizeNum > 100) sizeNum = 100;
  return repository.findStepExecutions(campaignId, stepId, businessIds, pageNum, sizeNum);
}
