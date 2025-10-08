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
    const idempotencyKey = `${input.campaignId ?? 'no-campaign'}:${input.recipientId}:${input.channel}:${input.scheduledAt.toISOString()}`;
    const body: any = { ...input, idempotencyKey };
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
        if (!retriable || attempt > this.maxRetries) throw e;
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, 5000);
      }
    }
  }
}
