import axios from 'axios';
import { TokenService } from './tokenService.js';

const CACHE_MS = Number(process.env.DOMAIN_MAPPER_CACHE_MS || 60_000);

type CacheEntry = { expiresAt: number; value: string | null };

const urlCache = new Map<string, CacheEntry>();

function ensureMapperUrl(): string {
  const url = process.env.DOMAIN_MAPPER_URL;
  if (!url) throw new Error('DOMAIN_MAPPER_URL is not configured');
  return url.replace(/\/+$/, '');
}

function normalizeScheme(scheme?: string | null): string {
  const fallback = process.env.BUSINESS_SERVICE_URL_SCHEME || 'https';
  if (!scheme) return fallback;
  const trimmed = scheme.trim().toLowerCase();
  if (!trimmed) return fallback;
  const isValid = /^[a-z][a-z0-9+.-]*$/.test(trimmed);
  return isValid ? trimmed : fallback;
}

function deriveUrl(hostOrUrl: string, scheme?: string | null): string {
  const trimmed = hostOrUrl.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/u, '');
  const normalizedScheme = normalizeScheme(scheme);
  const sanitized = trimmed.replace(/^\/+/, '').replace(/\/+$/u, '');
  return `${normalizedScheme}://${sanitized}`;
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

export async function resolveBusinessBaseUrl(businessId: string, scheme?: string | null): Promise<string | null> {
  if (!businessId) return null;
  const cached = urlCache.get(businessId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const mapper = ensureMapperUrl();
    const headers = await getServiceHeaders();
    const res = await axios.get(`${mapper}/api/v1/business/${encodeURIComponent(businessId)}`, { headers });
    const raw = typeof res.data?.url === 'string' && res.data.url
      ? res.data.url
      : (typeof res.data?.host === 'string' ? res.data.host : null);
    const resolved = raw ? deriveUrl(raw, scheme) : null;
    urlCache.set(businessId, { expiresAt: Date.now() + CACHE_MS, value: resolved });
    return resolved;
  } catch {
    urlCache.set(businessId, { expiresAt: Date.now() + CACHE_MS, value: null });
    return null;
  }
}

export async function fetchBusinessBaseUrl(businessId: string, scheme?: string | null): Promise<string | null> {
  return resolveBusinessBaseUrl(businessId, scheme);
}
