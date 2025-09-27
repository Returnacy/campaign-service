import type { FastifyReply, FastifyRequest } from 'fastify';
import { getStepTemplateService } from './get.template.service.js';

export async function getStepTemplateHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const template = await getStepTemplateService(request, businessIds);
    return reply.send(template);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
