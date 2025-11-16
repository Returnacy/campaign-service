import type { FastifyRequest } from "fastify";

export async function getActiveCampaignStatsService(request: FastifyRequest) {
  const { repository } = request.server;
  const query = request.query as any;

  // Expect businessIds as a comma-separated list
  const businessIdsParam = query.businessIds || "";
  const businessIds = businessIdsParam
    .split(',')
    .map((id: string) => id.trim())
    .filter((id: string) => id.length > 0);

  if (businessIds.length === 0) {
    return {};
  }

  const counts = await repository.countActiveCampaignsByBusinessIds(businessIds);
  return counts;
}
