import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Membership } from '../types/membership.js';
import type { RequireMembershipOpts } from '../types/requireMembershipOpts.js';
import type { MembershipScope } from '../types/membershipScope.js';

/**
 * Read normalized memberships from request (populated by userAuthPlugin).
 * Returns a Membership[] or an empty array if not present.
 */
export function getMemberships(request: FastifyRequest): Membership[] {
  const memberships = (request as any).userMemberships;
  return Array.isArray(memberships) ? memberships as Membership[] : [];
}

/**
 * Utility: do two arrays intersect (case-sensitive)
 */
export function rolesIntersect(userRoles: string[], requiredRoles: string[] | string): boolean {
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  if (!Array.isArray(userRoles) || userRoles.length === 0 || required.length === 0) return false;
  for (const r of required) {
    if (userRoles.includes(r)) return true;
  }
  return false;
}

/**
 * Membership predicates
 */
export function isCorporateMembership(m: Membership): boolean {
  // businessId === null => working at the brand (corporate)
  return m.businessId === null && m.brandId !== null;
}
export function isSingleBusinessMembership(m: Membership): boolean {
  // brandId === null => single business user
  return m.brandId === null && m.businessId !== null;
}

/**
 * Check if any membership (optionally filtered) contains at least one of the provided roles
 */
export function hasRoleInMemberships(
  memberships: Membership[],
  roles: string[] | string,
  filter?: (m: Membership) => boolean,
): boolean {
  const filtered = typeof filter === 'function' ? memberships.filter(filter) : memberships;
  for (const m of filtered) {
    if (rolesIntersect(m.roles, roles)) return true;
  }
  return false;
}

/**
 * Convenience checks for brand- or business-scoped role checks
 */
export function hasRoleForBrand(request: FastifyRequest, brandId: string, roles: string[] | string): boolean {
  const memberships = getMemberships(request);
  return hasRoleInMemberships(memberships, roles, (m) => m.brandId === brandId && m.businessId === null);
}

export function hasRoleForBusiness(request: FastifyRequest, businessId: string, roles: string[] | string): boolean {
  const memberships = getMemberships(request);
  return hasRoleInMemberships(memberships, roles, (m) => m.businessId === businessId);
}

export function hasAnyRole(request: FastifyRequest, roles: string[] | string): boolean {
  const memberships = getMemberships(request);
  return hasRoleInMemberships(memberships, roles);
}

/**
 * Return all brand/business scopes where the user has at least one of the provided roles.
 * Each entry includes brandId and businessId (either can be null).
 * Duplicates are removed by the pair (brandId,businessId).
 */
export function listScopesByRoles(request: FastifyRequest, roles: string[] | string): MembershipScope[] {
  const memberships = getMemberships(request);
  const required = Array.isArray(roles) ? roles : [roles];
  if (required.length === 0) return [];

  const seen = new Set<string>();
  const out: MembershipScope[] = [];

  for (const m of memberships) {
    if (!Array.isArray(m.roles) || m.roles.length === 0) continue;
    if (!rolesIntersect(m.roles, required)) continue;

    const brandId = m.brandId ?? null;
    const businessId = m.businessId ?? null;
    const key = `${brandId ?? ''}::${businessId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ brandId, businessId });
  }

  return out;
}

/**
 * Middleware factory: require at least one of `roles` to be present in a membership matching options
 * - If brandId provided, will check brand-level membership (businessId === null) for that brand
 * - If businessId provided, will check membership for that businessId
 * - If neither provided and allowAnyMembership is true, will accept role on any membership
 */
export function requireMembershipRole(roles: string[] | string, opts?: RequireMembershipOpts) {
  const { brandId, businessId, allowAnyMembership = false } = opts ?? {};

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const memberships = getMemberships(request);

    let ok = false;

    if (brandId) {
      ok = hasRoleInMemberships(memberships, roles, (m) => m.brandId === brandId && m.businessId === null);
    } else if (businessId) {
      ok = hasRoleInMemberships(memberships, roles, (m) => m.businessId === businessId);
    } else if (allowAnyMembership) {
      ok = hasRoleInMemberships(memberships, roles);
    } else {
      // Default: require the role on any membership
      ok = hasRoleInMemberships(memberships, roles);
    }

    if (!ok) {
      // Log helpful info for troubleshooting (info level so it shows up by default)
      const debug = debugMemberships(request);
      (request.server.log || console).info({
        path: request.url,
        requiredRoles: roles,
        brandId,
        businessId,
        memberships: debug.memberships,
      }, 'Access denied by requireMembershipRole');
      return reply.status(403).send({ error: 'Forbidden' });
    }
  };
}

/**
 * Small helper that returns a developer-friendly debug object (useful in logs)
 */
export function debugMemberships(request: FastifyRequest) {
  const memberships = getMemberships(request);
  return { count: memberships.length, memberships };
}
