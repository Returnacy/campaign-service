export type RequireMembershipOpts = {
  /** If provided, require the role for this brand-level membership (businessId === null) */
  brandId?: string;
  /** If provided, require the role for this business-level membership (matches businessId) */
  businessId?: string;
  /** If true and brandId/businessId are omitted, accept the role on any membership */
  allowAnyMembership?: boolean;
};