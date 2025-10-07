import type { FastifyInstance } from 'fastify';
import { debugMemberships } from '../../utils/userAuthGuard.js';

export async function authDebugRoute(server: FastifyInstance) {
  // Any authenticated user can access this debug info
  server.get('/auth/debug', {
    handler: async (request) => {
      const auth = (request as any).auth ?? {};
      const { count, memberships } = debugMemberships(request);
      return {
        iss: (auth as any).iss,
        sub: (auth as any).sub,
        aud: (auth as any).aud,
        azp: (auth as any).azp,
        membershipCount: count,
        memberships,
      };
    }
  });
}
