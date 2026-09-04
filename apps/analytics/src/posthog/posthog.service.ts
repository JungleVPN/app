import * as process from 'node:process';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PostHog } from 'posthog-node';

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private readonly logger = new Logger(PostHogService.name);
  private readonly client: PostHog | null;

  constructor() {
    const apiKey = process.env.POSTHOG_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.error(
          'POSTHOG_API_KEY variable required by PostHog is missing or un-configured, ' +
            'this causes events to be silently missed. ' +
            'This error stops appearing once POSTHOG_API_KEY is configured',
        );
      }
      this.client = null;
      return;
    }
    this.client = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10_000,
      enableExceptionAutocapture: true,
    });
  }

  capture(distinctId: string, event: string, properties: Record<string, unknown>): void {
    if (!this.client) return;
    try {
      this.client.capture({ distinctId, event, properties });
    } catch (err: unknown) {
      this.logger.warn(
        `PostHog capture failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  identify(distinctId: string, properties: Record<string, unknown>): void {
    if (!this.client) return;
    try {
      this.client.identify({ distinctId, properties });
    } catch (err: unknown) {
      this.logger.warn(
        `PostHog identify failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Merges a pre-signup distinct id (e.g. `tg:{telegramId}`) into the canonical one. */
  alias(distinctId: string, alias: string): void {
    if (!this.client) return;
    try {
      this.client.alias({ distinctId, alias });
    } catch (err: unknown) {
      this.logger.warn(`PostHog alias failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Forces buffered events out immediately, bypassing flushAt/flushInterval batching. */
  async flush(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.flush();
    } catch (err: unknown) {
      this.logger.warn(`PostHog flush failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  captureException(error: unknown, distinctId?: string): void {
    if (!this.client) return;
    try {
      this.client.captureException(error, distinctId);
    } catch (err: unknown) {
      this.logger.warn(
        `PostHog captureException failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  onModuleDestroy(): void {
    void this.client?.shutdown();
  }
}
