export type Config = {
  isTest: boolean;
  businessServiceUrl?: string;
  userServiceUrl?: string;
  messagingServiceUrl?: string;
  keycloak: { tokenUrl: string; clientId: string; clientSecret: string };
  timeouts: { businessClient: number; userClient: number };
  maxRetries: { businessClient: number; userClient: number };
  pageSize: number;
  concurrency: number;
  // schedule retry config for messaging attempts inside job handler (optional)
  scheduleRetries?: number;
  scheduleRetryDelayMs?: number;
};