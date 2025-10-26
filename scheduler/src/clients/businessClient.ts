import axios, { AxiosError } from 'axios';
import { TokenService } from '../utils/tokenService.js';
import { resolveBusinessBaseUrl } from '../utils/businessServiceUrlResolver.js';
import type { AvailableMessagesResponse } from '../../types/availableMessagesResponse.js';
import type { Cfg } from '../../types/cfg.js';

export class BusinessClient {
  private baseUrl: string; // default/fallback base URL
  private tokenService: TokenService;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(cfg: Cfg) {
    this.baseUrl = cfg.baseUrl;
    this.tokenService = new TokenService(cfg.token);
    this.timeoutMs = cfg.timeoutMs ?? 15000;
    this.maxRetries = cfg.maxRetries ?? 3;
  }

  async getAvailableMessages(businessId: string): Promise<AvailableMessagesResponse> {
    const token = await this.tokenService.getAccessToken();
    const resolvedBase = resolveBusinessBaseUrl(businessId) || this.baseUrl;
    return this.requestWithRetry<AvailableMessagesResponse>(() =>
      axios.post(
        `${resolvedBase}/internal/v1/business/${businessId}/available-messages`,
        {},
        {
          timeout: this.timeoutMs,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        }
      )
    );
  }

  // Idempotent coupon creation using a deterministic code derived from (userId, prizeId)
  async ensureCoupon(userId: string, businessId: string, prizeId: string): Promise<{ created: boolean }>{
    const token = await this.tokenService.getAccessToken();
    const resolvedBase = resolveBusinessBaseUrl(businessId) || this.baseUrl;
    const short = (s: string) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const code = `CP-${short(prizeId)}-${short(userId)}-${short(Date.now().toString())}`;
    try {
      await this.requestWithRetry(() =>
        axios.post(
          `${resolvedBase}/api/v1/coupons`,
          { userId, businessId, prizeId, code },
          { timeout: this.timeoutMs, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        )
      );
      return { created: true };
    } catch (e: any) {
      const status = e?.response?.status ?? 0;
      const msg = String(e?.message || '').toLowerCase();
      const body = e?.response?.data;
      // Treat unique constraint or conflict as already-created = OK
      if (status === 409 || (typeof body === 'string' && /unique|duplicate|exists/.test(body.toLowerCase())) || /unique|duplicate/.test(msg)) {
        return { created: false };
      }
      // Non-retriable validation errors should bubble up as non-fatal to caller
      throw e;
    }
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