import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { TokenService } from './tokenService.js';

export type DomainMapping = Record<string, { brandId: string | null; businessId: string | null }>;

function loadDomainMapping(): DomainMapping | null {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const candidates: string[] = [];
    if (process.env.DOMAIN_MAPPING_FILE) candidates.push(process.env.DOMAIN_MAPPING_FILE);
    // dist/src/utils -> dist/domain-mapping.json
    candidates.push(path.resolve(__dirname, '../domain-mapping.json'));
    // dist/src/utils -> project root copies
    candidates.push(path.resolve(__dirname, '../../domain-mapping.json'));
    // common absolute path inside container image
    candidates.push('/app/scheduler/domain-mapping.json');

    const filePath = candidates.find(p => {
      try { return !!p && fs.existsSync(p); } catch { return false; }
    });
    if (!filePath) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as DomainMapping;
  } catch {
    return null;
  }
}

export function parseBusinessIds(): string[] {
  const map = loadDomainMapping();
  if (map && typeof map === 'object') {
    const ids = new Set<string>();
    for (const v of Object.values(map)) {
      const id = (v as any)?.businessId;
      if (id && typeof id === 'string') ids.add(id);
    }
    return Array.from(ids);
  }
  return [];
}

export async function fetchBusinessIds(): Promise<string[]> {
  const mapper = process.env.DOMAIN_MAPPER_URL;
  if (!mapper) return parseBusinessIds();
  try {
    const tokenService = new TokenService({
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? '',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
      tokenUrl: process.env.KEYCLOAK_TOKEN_URL ?? '',
    });
    const token = await tokenService.getAccessToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios.get(`${mapper.replace(/\/$/, '')}/api/v1/businesses`, { headers });
    const list: Array<{ businessId?: string }> = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    const ids = new Set<string>();
    for (const item of list) {
      const id = item?.businessId;
      if (typeof id === 'string' && id) ids.add(id);
    }
    return Array.from(ids);
  } catch {
    return parseBusinessIds();
  }
}
