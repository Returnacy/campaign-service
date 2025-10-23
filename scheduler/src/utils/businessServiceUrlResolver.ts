// src/utils/businessServiceUrlResolver.ts
// Resolve the Business Service base URL for a given businessId by reading a JSON mapping.
// Supports two families of inputs:
// A) user-service style domain mapping (Record<hostname, { brandId: string|null, businessId: string }>)
// B) Direct mappings where the key is the URL and value is the businessId:
//    - Record<string, string> where key = url, value = businessId
//    - Array<[string, string]> as [url, businessId]
//    - Array<{ url: string; id: string }>
//    - Array<{ key: string; value: string }> where key = url, value = businessId

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let cachedMap: any | null = null;

function loadMap(): any | null {
  if (cachedMap) return cachedMap;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const candidates: string[] = [];
  // Allow both the original env var and the one used by user-service for symmetry
  if (process.env.BUSINESS_SERVICE_MAP_FILE) candidates.push(process.env.BUSINESS_SERVICE_MAP_FILE);
  if (process.env.DOMAIN_MAPPING_FILE) candidates.push(process.env.DOMAIN_MAPPING_FILE);
  // dist/src/utils -> dist/business-service-map.json or domain-mapping.json
  candidates.push(path.resolve(__dirname, '../business-service-map.json'));
  candidates.push(path.resolve(__dirname, '../domain-mapping.json'));
  // dist/src/utils -> project root copies
  candidates.push(path.resolve(__dirname, '../../business-service-map.json'));
  candidates.push(path.resolve(__dirname, '../../domain-mapping.json'));
  // common absolute paths inside container image
  candidates.push('/app/scheduler/business-service-map.json');
  candidates.push('/app/scheduler/domain-mapping.json');

  const filePath = candidates.find(p => {
    try { return fs.existsSync(p); } catch { return false; }
  });
  if (!filePath) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    cachedMap = JSON.parse(raw);
    return cachedMap;
  } catch {
    return null;
  }
}

function deriveUrlFromKey(key: string): string {
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const scheme = process.env.BUSINESS_SERVICE_URL_SCHEME || 'http';
  return `${scheme}://${key}`;
}

export function resolveBusinessBaseUrl(businessId: string): string | null {
  const map = loadMap();
  if (!map) return null;

  // Case A: user-service style mapping: Record<host, { brandId, businessId }>
  if (!Array.isArray(map) && typeof map === 'object') {
    // First try to detect the shape by checking if values are objects with businessId
    const values = Object.values(map);
    const isDomainMap = values.some(v => v && typeof v === 'object' && 'businessId' in (v as any));
    if (isDomainMap) {
      for (const [host, info] of Object.entries(map as Record<string, any>)) {
        if (info && typeof info === 'object' && info.businessId === businessId) {
          return deriveUrlFromKey(host);
        }
      }
      return null;
    }
    // Otherwise treat as Record<url, businessId>
    for (const [url, id] of Object.entries(map as Record<string, string>)) {
      if (id === businessId) return deriveUrlFromKey(url);
    }
    return null;
  }

  if (Array.isArray(map)) {
    for (const entry of map) {
      // Case 2: [url, id]
      if (Array.isArray(entry) && entry.length >= 2) {
        const [url, id] = entry;
        if (id === businessId) return deriveUrlFromKey(String(url));
      }
      // Case 3: { url, id }
      if (entry && typeof entry === 'object' && 'url' in entry && 'id' in entry) {
        const { url, id } = entry as { url: string; id: string };
        if (id === businessId) return deriveUrlFromKey(url);
      }
      // Case 4: { key, value }
      if (entry && typeof entry === 'object' && 'key' in entry && 'value' in entry) {
        const { key, value } = entry as { key: string; value: string };
        if (value === businessId) return deriveUrlFromKey(key);
      }
    }
  }
  return null;
}
