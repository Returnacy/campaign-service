import type { Config } from '../../types/config.js';

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

export function loadConfig(): Config {
  const isTest = process.env.NODE_ENV === 'test';

  if (!isTest) {
    ['USER_SERVICE_URL', 'MESSAGING_SERVICE_URL', 'KEYCLOAK_TOKEN_URL', 'KEYCLOAK_CLIENT_ID', 'KEYCLOAK_CLIENT_SECRET'].forEach(requiredEnv);
  }

  return {
    isTest,
    businessServiceUrl: process.env.BUSINESS_SERVICE_URL || '',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3000',
    messagingServiceUrl: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3000',
    keycloak: {
      tokenUrl: process.env.KEYCLOAK_TOKEN_URL ?? '',
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? '',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
    },
    timeouts: {
      businessClient: Number(process.env.BUSINESS_CLIENT_TIMEOUT_MS ?? 15000),
      userClient: Number(process.env.USER_CLIENT_TIMEOUT_MS ?? 15000),
    },
    maxRetries: {
      businessClient: Number(process.env.BUSINESS_CLIENT_MAX_RETRIES ?? 3),
      userClient: Number(process.env.USER_CLIENT_MAX_RETRIES ?? 3),
    },
    pageSize: Number(process.env.USER_QUERY_PAGE_SIZE ?? 1000),
    concurrency: Math.min(Number(process.env.DISPATCHER_CONCURRENCY ?? 10), 50),
    // optional runtime retry parameters (defaults)
    scheduleRetries: Number(process.env.SCHEDULE_RETRIES ?? 0),
    scheduleRetryDelayMs: Number(process.env.SCHEDULE_RETRY_DELAY_MS ?? 500),
  };
}
