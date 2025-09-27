import axios from 'axios';

export type TokenServiceConfig = {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
};

export class TokenService {
  private clientId: string;
  private clientSecret: string;
  private tokenUrl: string;
  private accessToken: string | null = null;
  private expiry = 0;

  constructor(config: TokenServiceConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tokenUrl = config.tokenUrl;
  }

  async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const buffer = 10;
    if (this.accessToken && now < this.expiry) return this.accessToken;

    const response = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, expires_in } = response.data;
    this.accessToken = access_token;
    this.expiry = now + expires_in - buffer;
    return this.accessToken!;
  }
}
