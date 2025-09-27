import Fastify from 'fastify';

import fastifyCors from '@fastify/cors';

import keycloakAuthPlugin from './plugins/keycloakAuthPlugin.js';
import keycloakTokenPlugin from './plugins/keycloakTokenPlugin.js';
import prismaRepositoryPlugin from './plugins/prismaRepositoryPlugin.js';
import redisConnectionPlugin from './plugins/redisConnectionPlugin.js';

// Placeholder: campaign routes will be defined here
import { campaignsRoutes } from './modules/api/v1/campaigns/campaigns.route.js';
import { healthRoute } from './modules/health/health.route.js';

import { CorsError } from './errors/index.error.js';
import legacyAuthPlugin from './plugins/legacyAuthPlugin.js';

// Enable logger to surface internal errors in production (Railway logs HTTP but not internal stack traces unless logger enabled)
const server = Fastify({ logger: true });

async function main() {
  server.register(fastifyCors, {
    origin: (origin, cb) => {
      const allowedOrigins = [
        process.env.USER_SERVICE_URL,
        process.env.CAMPAIGN_SERVICE_URL,
      ];

      if (process.env.WEBHOOK_URLS) {
        for (const o of process.env.WEBHOOK_URLS.split(',')) {
          allowedOrigins.push(o);
        }
      }

      if (!origin)
        cb(null, true);
      else
        cb(new CorsError('Not allowed by CORS'), true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
  });

  if (process.env.USE_LEGACY_AUTH === 'true') {
    server.register(legacyAuthPlugin);
  } else {
    server.register(keycloakAuthPlugin);
    server.register(keycloakTokenPlugin);
  }
  server.register(prismaRepositoryPlugin);
  server.register(redisConnectionPlugin);

  server.register(campaignsRoutes, { prefix: '/api/v1' });
  server.register(healthRoute);


  server.addHook('onError', async (request, reply, error) => {
    server.log.error({ err: error, path: request.url, requestId: request.id }, 'Request error');
  });

  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    server.log.info('Server listening on http://0.0.0.0:3000');
  } catch (e) {
    server.log.error(e);
    process.exit(1);
  }
}

main();