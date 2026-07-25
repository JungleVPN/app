import * as process from 'node:process';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { AnalyticsEvent } from '@workspace/types';
import type { AxiosInstance } from 'axios';
import { createBackendClient } from '../utils/http-client';

export const ANALYTICS_HTTP_CLIENT = 'ANALYTICS_HTTP_CLIENT';

@Injectable()
export class AnalyticsClientService {
  private readonly logger = new Logger(AnalyticsClientService.name);
  private readonly client: AxiosInstance;

  constructor(
    @Optional() @Inject(ANALYTICS_HTTP_CLIENT) client?: AxiosInstance,
  ) {
    this.client =
      client ??
      createBackendClient(
        process.env.PUBLIC_ANALYTICS_URL ?? 'http://localhost:3007/analytics',
      );
  }

  async track(event: AnalyticsEvent): Promise<void> {
    try {
      await this.client.post('/events', event);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to track analytics event "${event.event}": ${message}`);
    }
  }
}
