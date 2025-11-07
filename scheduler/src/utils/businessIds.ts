import axios from 'axios';
import { TokenService } from './tokenService.js';
const CACHE_MS = Number(process.env.DOMAIN_MAPPER_CACHE_MS || 60_000);

let cachedIds: { expiresAt: number; value: string[] } | null = null;

function ensureMapperUrl(): string {
  const url = process.env.DOMAIN_MAPPER_URL;
  if (!url) throw new Error('DOMAIN_MAPPER_URL is not configured');
  return url.replace(/\/+$/, '');
}

async function getServiceHeaders(): Promise<Record<string, string>> {
  const tokenService = new TokenService({
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? '',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
    tokenUrl: process.env.KEYCLOAK_TOKEN_URL ?? '',
  });
  try {
    const token = await tokenService.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function fetchBusinessIds(forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  if (!forceRefresh && cachedIds && cachedIds.expiresAt > now) {
    return cachedIds.value;
  }

  const mapper = ensureMapperUrl();
  const headers = await getServiceHeaders();
  const res = await axios.get(`${mapper}/api/v1/businesses`, { headers });
  const list: Array<{ businessId?: string | null }> = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
  const ids = Array.from(new Set(list
    .map((item) => (typeof item?.businessId === 'string' ? item.businessId : null))
    .filter((id): id is string => !!id)));

  cachedIds = { expiresAt: now + CACHE_MS, value: ids };
  return ids;
}
