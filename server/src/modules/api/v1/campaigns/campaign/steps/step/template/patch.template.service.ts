import type { FastifyRequest } from 'fastify';
import type { UpdateStepTemplate } from '@campaign-service/types';
import type { MembershipScope } from '../../../../../../../../types/membershipScope.js';

export async function patchStepTemplateService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, scopes: MembershipScope[], template: UpdateStepTemplate) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  const updated = await repository.updateStepTemplate(campaignId, stepId, scopes, template);
  return updated;
}
