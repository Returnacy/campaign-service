import type { FastifyRequest } from 'fastify';
import type { UpdateStepTemplate } from '@campaign-service/types';

export async function patchStepTemplateService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, businessIds: string[], template: UpdateStepTemplate) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  const updated = await repository.updateStepTemplate(campaignId, stepId, businessIds, template);
  return updated;
}
