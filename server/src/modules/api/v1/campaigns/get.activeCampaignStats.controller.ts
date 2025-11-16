import type { FastifyReply, FastifyRequest } from 'fastify';
import { getActiveCampaignStatsService } from './get.activeCampaignStats.service.js';

export async function getActiveCampaignStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  const stats = await getActiveCampaignStatsService(request);
  return reply.status(200).send(stats);
}
