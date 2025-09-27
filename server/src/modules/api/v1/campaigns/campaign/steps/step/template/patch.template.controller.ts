import type { FastifyReply, FastifyRequest } from 'fastify';
import { patchStepTemplateService } from './patch.template.service.js';
import { updateStepTemplateSchema } from '@campaign-service/types'

export async function patchStepTemplateHandler(request: FastifyRequest<{ Params: { campaignId: string, stepId: string } }>, reply: FastifyReply) {
  try {
    const auth = request.auth;
    if (!auth)
      throw new Error('No auth information found in request');

    const businessIds = auth.businessIds as string[];
    if (!businessIds)
      throw new Error('No businessIds found in auth information');

    const templates = updateStepTemplateSchema.parse(request.body);

    const updated = await patchStepTemplateService(request, businessIds, templates);
    return reply.send(updated);
  } catch (error) {
    return reply.status(400).send(error);
  }
}
