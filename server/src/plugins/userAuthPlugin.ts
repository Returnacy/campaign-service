import fp from 'fastify-plugin';

type Membership = {
  brandId: string | null;
  businessId: string | null;
  roles: string[];
};

declare module 'fastify' {
  interface FastifyRequest {
    userMemberships?: Membership[];
  }
}

export default fp(async (fastify) => {
  fastify.decorateRequest('userMemberships', undefined);

  fastify.addHook('preHandler', async (request) => {
    if (!request.auth) return; // requires keycloakAuthPlugin to run first

    // Keycloak mapper in this repo emits claim name "memberships" (plural).
    // Support both to be defensive during transition.
    const raw = (request.auth as any)?.memberships ?? (request.auth as any)?.membership;
    let memberships: Membership[] = [];

    function coerceToMembershipArray(input: unknown): Membership[] {
      const out: Membership[] = [];
      if (!input) return out;
      const pushIfValid = (m: any) => {
        if (
          m &&
          (typeof m.brandId === 'string' || m.brandId === null || typeof m.brandId === 'undefined') &&
          (typeof m.businessId === 'string' || m.businessId === null || typeof m.businessId === 'undefined')
        ) {
          out.push({
            brandId: m.brandId ?? null,
            businessId: m.businessId ?? null,
            roles: Array.isArray(m.roles) ? m.roles : [],
          });
        }
      };

      const tryParse = (s: string) => {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) parsed.forEach(pushIfValid);
          else pushIfValid(parsed);
        } catch {
          // ignore
        }
      };

      if (Array.isArray(input)) {
        for (const el of input) {
          if (typeof el === 'string') tryParse(el);
          else if (Array.isArray(el)) el.forEach(pushIfValid);
          else if (typeof el === 'object' && el !== null) pushIfValid(el);
        }
      } else if (typeof input === 'string') {
        tryParse(input);
      } else if (typeof input === 'object') {
        pushIfValid(input);
      }

      return out;
    }

    memberships = coerceToMembershipArray(raw);

    // Fallback: if memberships claim is missing or empty, try to fetch from user-service /api/v1/me
    // This covers cases where the Keycloak protocol mapper isn't yet emitting memberships
    // or the token hasn't been refreshed since membership was updated.
  if ((!memberships || memberships.length === 0) && process.env.USER_SERVICE_URL) {
      try {
        const authHeader = request.headers['authorization'];
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
          const base = String(process.env.USER_SERVICE_URL).replace(/\/$/, '');
          const res = await fetch(`${base}/api/v1/me`, { headers: { Authorization: authHeader, Accept: 'application/json' } });
          if (res.ok) {
            const data: any = await res.json();
            const ms = Array.isArray(data?.memberships) ? data.memberships : [];
            // Derive global roles from token to optionally elevate per-membership permissions (dev convenience)
            const realmRoles: string[] = Array.isArray((request.auth as any)?.realm_access?.roles)
              ? ((request.auth as any).realm_access.roles as string[]).map(r => String(r).toLowerCase())
              : [];
            const clientRoles: string[] = Array.isArray((request.auth as any)?.resource_access?.['campaign-service']?.roles)
              ? ((request.auth as any).resource_access['campaign-service'].roles as string[]).map(r => String(r).toLowerCase())
              : [];
            const derived = new Set<string>();
            for (const r of realmRoles) {
              if (['admin','manager','brand_manager','staff'].includes(r)) derived.add(r);
            }
            // Map common client role names to membership roles
            for (const r of clientRoles) {
              if (r === 'manage') derived.add('manager');
              if (r === 'admin') derived.add('admin');
            }

            const mapped = ms.map((m: any) => {
              const role = typeof m?.role === 'string' ? m.role.toLowerCase() : 'user';
              const roles = Array.from(new Set<string>([role, ...derived]));
              return {
                brandId: (m?.brandId ?? null) as string | null,
                businessId: (m?.businessId ?? null) as string | null,
                roles,
              } as Membership;
            });
            if (mapped.length > 0) memberships = mapped;
          }
        }
      } catch (e) {
        // Non-fatal: continue without memberships; downstream may 403 if required
        if (fastify.log && typeof fastify.log.debug === 'function') {
          fastify.log.debug({ err: e }, 'Failed to backfill memberships from user-service');
        }
      }
    }

    request.userMemberships = memberships;
    // Helpful during dev to confirm memberships were parsed
    if (fastify.log && typeof fastify.log.debug === 'function') {
      fastify.log.debug({ count: memberships.length, memberships }, 'Parsed user memberships from token');
    }
  });
});
