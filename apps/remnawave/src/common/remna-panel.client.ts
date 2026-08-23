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
    allowEmptyResponse = false,
  }: {
    url: string;
    method: 'delete' | 'get' | 'post' | 'put' | 'patch';
    body?: unknown;
    /**
     * Whether a reply with no `{ response }` envelope is success.
     *
     * Panel v3 answers DELETE /users/:id with 204 No Content and background
     * operations with 202 Accepted, neither of which carries a payload. Only a
     * caller that expects nothing may opt in: `DeleteUserCommand` is the sole
     * endpoint this codebase calls that declares no ResponseSchema, so for
     * everyone else an absent body is a failure worth reporting.
     */
    allowEmptyResponse?: boolean;
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

      if (res.status >= 400) {
        this.logger.error(`Remna panel returned ${res.status} for ${url}`);
        throw new RemnaPanelError(res.statusText, res.status, { ...res.data, url });
      }

      // Unwrap before looking at the status: a 202 may still carry a payload,
      // and treating every 202 as empty would silently throw it away.
      const envelope = res.data as { response?: Data } | null | undefined;
      if (envelope && envelope.response !== undefined) {
        return envelope.response;
      }

      if (allowEmptyResponse) {
        return undefined as Data;
      }

      // Returning `undefined as Data` here would satisfy the compiler and then
      // fail as a TypeError several frames away, with nothing naming the call
      // that produced it.
      this.logger.error(`Remna panel returned no response body for ${url} (status ${res.status})`);
      throw new RemnaPanelError(
        `Remna panel returned no response body for ${url} (status ${res.status})`,
        res.status,
        { url, status: res.status },
      );
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
