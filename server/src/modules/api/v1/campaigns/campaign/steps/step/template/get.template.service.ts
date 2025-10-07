import type { FastifyRequest } from 'fastify';
import type { MembershipScope } from '../../../../../../../../types/membershipScope.js';

export async function getStepTemplateService(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, scopes: MembershipScope[]) {
  const { repository } = request.server;
  const { campaignId, stepId } = request.params;

  const template = await repository.findStepTemplate(campaignId, stepId, scopes);
  return template;
}
