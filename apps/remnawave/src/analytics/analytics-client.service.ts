import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import type { AnalyticsEvent } from '@workspace/types';
import axios, { type AxiosInstance } from 'axios';

@Injectable()
export class AnalyticsClientService {
  private readonly logger = new Logger(AnalyticsClientService.name);
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.PUBLIC_ANALYTICS_URL ?? 'http://localhost:3007/analytics',
      timeout: 5_000,
      headers: {
        'Content-Type': 'application/json',
        'x-service-secret': process.env.INTER_SERVICE_SECRET,
      },
    });
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
