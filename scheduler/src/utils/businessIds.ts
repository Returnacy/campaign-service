import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export type DomainMapping = Record<string, { brandId: string | null; businessId: string }>;

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
  // Fallback: comma-separated BUSINESS_IDS (legacy)
  const raw = process.env.BUSINESS_IDS;
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
