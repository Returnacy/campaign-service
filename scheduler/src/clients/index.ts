// src/clients/index.ts
import { BusinessClient } from './businessClient.js';
import { UserClient } from './userClient.js';
import { MessagingClient } from './messagingClient.js';
import type { Config } from '../../types/config.js';

export function createClients(config: Config) {
  const token = {
    tokenUrl: config.keycloak.tokenUrl,
    clientId: config.keycloak.clientId,
    clientSecret: config.keycloak.clientSecret,
  };

  const businessClient = new BusinessClient({
    baseUrl: config.businessServiceUrl ?? '',
    token,
    timeoutMs: config.timeouts.businessClient,
    maxRetries: config.maxRetries.businessClient,
  });

  const userClient = new UserClient({
    baseUrl: config.userServiceUrl ?? '',
    token,
    timeoutMs: config.timeouts.userClient,
    maxRetries: config.maxRetries.userClient,
  });

  const messagingClient = new MessagingClient({
    baseUrl: config.messagingServiceUrl ?? '',
    token,
  });

  return { businessClient, userClient, messagingClient };
}
