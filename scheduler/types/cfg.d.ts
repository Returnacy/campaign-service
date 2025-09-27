export type Cfg = {
  baseUrl: string;
  token: { tokenUrl: string; clientId: string; clientSecret: string };
  timeoutMs?: number;
  maxRetries?: number;
};