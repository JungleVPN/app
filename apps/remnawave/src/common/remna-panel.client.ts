import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class RemnaPanelClient implements OnModuleInit {
  private readonly logger = new Logger(RemnaPanelClient.name);
  private client: AxiosInstance;
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const baseURL = this.configService.get<string>('REMNAWAVE_PANEL_URL');
    const token = this.configService.get<string>('REMNAWAVE_API_TOKEN');

    if (!baseURL) {
      this.logger.error('REMNAWAVE_PANEL_URL is not defined in environment variables');
    }

    this.client = axios.create({
      baseURL,
      withCredentials: true,
      validateStatus: () => true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 10_000,
    });

    this.logger.log(`Remna panel client initialized: ${baseURL}`);
  }

  /**
   * Sends a request to the Remnawave panel and unwraps the `{ response: Data }` envelope.
   * The generic `Data` should match whatever is inside `response` for the given endpoint.
   */
  async request<Data>({
    method = 'post',
    url,
    body,
  }: {
    url: string;
    method: 'delete' | 'get' | 'post' | 'put' | 'patch';
    body?: unknown;
  }): Promise<Data> {
    try {
      const res = await this.client.request({
        method,
        url,
        data: body,
      });
      if (res.status === 404) {
        throw new RemnaPanelError(`Remna panel endpoint not found: ${url}`, 404, res.data);
      }

      // Panel v3 returns 204 No Content for DELETE and 202 Accepted for
      // background operations — both have an empty body and no `{ response }`
      // envelope, so an absent payload is success rather than a malformed reply.
      if (res.status === 204 || res.status === 202) {
        return undefined as Data;
      }

      if (res.status >= 400) {
        this.logger.error(`Remna panel returned ${res.status} for ${url}`);
        throw new RemnaPanelError(res.statusText, res.status, { ...res.data, url });
      }

      const data: { response: Data } = res.data;
      if (!data || data.response === undefined) {
        this.logger.error(`Invalid response from Remna panel`);
        throw new RemnaPanelError(res.statusText, res.status, { ...res.data, url });
      }

      return data.response;
    } catch (e: any) {
      if (e instanceof RemnaPanelError) throw e;

      const status = e.response?.status;
      const payload = e.response?.data;

      this.logger.error('Remna panel request error', {
        url,
        method,
        status,
        payload,
        message: e.message,
      });

      throw new RemnaPanelError(`Remna panel request failed: ${url}`, status || 500, payload);
    }
  }
}

export class RemnaPanelError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly context?: any,
  ) {
    super(message);
    this.name = 'RemnaPanelError';
  }
}
