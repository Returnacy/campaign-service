import type { FastifyRequest } from 'fastify';

export async function getStepTemplateService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, businessIds: string[]) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  const template = await repository.findStepTemplate(campaignId, stepId, businessIds);
  return template;
}
