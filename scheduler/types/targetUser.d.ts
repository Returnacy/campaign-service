export type TargetUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  attributes?: Record<string, any> | null;
};