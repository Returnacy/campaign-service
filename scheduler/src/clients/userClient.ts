import axios, { AxiosError } from 'axios';
import { TokenService } from '../utils/tokenService.js';
import type { TargetingUserResponse } from '../../types/targetingUserResponse.js';
import type { Cfg } from '../../types/cfg.js';

export class UserClient {
  private baseUrl: string; // fallback base URL
  private tokenService: TokenService;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(cfg: Cfg) {
    this.baseUrl = cfg.baseUrl;
    this.tokenService = new TokenService(cfg.token);
    this.timeoutMs = cfg.timeoutMs ?? 15000;
    this.maxRetries = cfg.maxRetries ?? 3;
  }

  // Backward compatible signature: either (rules, limit) or a single object { rules, limit, prize }
  async getTargetingUsers(rulesOrObj: any[] | { rules: any[]; limit: number; prize?: { id: string }, businessId?: string, brandId?: string }, limitMaybe?: number): Promise<TargetingUserResponse> {
    const token = await this.tokenService.getAccessToken();
    const { rules, limit, prize, businessId, brandId } = Array.isArray(rulesOrObj)
      ? { rules: rulesOrObj, limit: limitMaybe as number, prize: undefined, businessId: undefined, brandId: undefined }
      : { rules: rulesOrObj.rules, limit: rulesOrObj.limit, prize: (rulesOrObj as any).prize, businessId: (rulesOrObj as any).businessId, brandId: (rulesOrObj as any).brandId };
    const req: any = {
      targetingRules: rules,
      limit
    };
    if (prize && prize.id) req.prize = { id: prize.id };
    if (businessId) req.businessId = businessId;
    if (brandId) req.brandId = brandId;
    const resolvedBase = this.baseUrl;
    return await this.requestWithRetry<TargetingUserResponse>(() => axios.post(
      `${resolvedBase}/internal/v1/users/query`,
      req,
      {
        timeout: this.timeoutMs,
        headers: { Authorization: `Bearer ${token}` },
      }
    ));
  }

  private async requestWithRetry<T>(fn: () => Promise<{ data: T }>): Promise<T> {
    let attempt = 0;
    let delay = 500; // ms
    while (true) {
      try {
        const res = await fn();
        return res.data;
      } catch (e) {
        attempt++;
        const err = e as AxiosError;
        const status = err.response?.status ?? 0;
        const retriable = status >= 500 || status === 429 || !status;
        if (!retriable || attempt > this.maxRetries) throw e;
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, 5000);
      }
    }
  }
}
