import fp from "fastify-plugin";

import { RepositoryPrisma } from "@campaign-service/db";

export default fp(async (fastify) => {
  const repository = new RepositoryPrisma();
  fastify.decorate("repository", repository);
});