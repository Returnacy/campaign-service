import type { FastifyRequest } from 'fastify';

export async function getStepExecutionService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string, executionId: string } }>, businessIds: string[]) {
  const { repository } = request.server;
  const { campaignId, stepId, executionId } = request.params;
  return repository.findStepExecutionById(campaignId, stepId, executionId, businessIds);
}
