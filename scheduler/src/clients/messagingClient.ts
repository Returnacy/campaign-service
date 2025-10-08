import axios, { AxiosError } from 'axios';
import { TokenService } from '../utils/tokenService.js';
import type { ScheduleInput } from '../../types/scheduleInput.js';
import type { Cfg } from '../../types/cfg.js';

export class MessagingClient {
  private baseUrl: string;
  private tokenService: TokenService;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(cfg: Cfg) {
    this.baseUrl = cfg.baseUrl;
    this.tokenService = new TokenService(cfg.token);
    this.timeoutMs = cfg.timeoutMs ?? 15000;
    this.maxRetries = cfg.maxRetries ?? 3;
  }

  async schedule(input: ScheduleInput) {
    const token = await this.tokenService.getAccessToken();
    // Idempotency per-minute: dedupe within the same minute; allow a new send each new minute.
    // Use UTC minute bucket to avoid timezone surprises (e.g., 2025-10-08T15:22)
    const minuteBucket = new Date().toISOString().slice(0, 16);
    const idempotencyKey = `${input.campaignId ?? 'no-campaign'}:${input.recipientId}:${input.channel}:${minuteBucket}`;
    const body: any = { ...input, idempotencyKey };

    // Normalize for messaging-service schema
    const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
    body.campaignId = isUuid(body.campaignId) ? body.campaignId : null; // schema: z.uuid().nullable()
    body.scheduledAt = null; // schema: z.date().nullable(); JSON date strings would fail, so send null
    const currentName = body?.payload?.to?.name;
    if (!currentName) {
      body.payload = body.payload || {};
      body.payload.to = body.payload.to || {};
      body.payload.to.name = 'Customer';
    }
    await this.requestWithRetry(() => axios.post(`${this.baseUrl}/api/v1/messages`, body, {
      timeout: this.timeoutMs,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    }));
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
        console.error('[messagingClient] request failed', { attempt, status, retriable, message: err.message });
        if (!retriable || attempt > this.maxRetries) throw e;
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, 5000);
      }
    }
  }
}
