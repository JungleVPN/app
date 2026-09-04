import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsEvent as AnalyticsEventEntity, UserAttribution } from '@workspace/database';
import { AnalyticsEvent, AttributionPayload, CreateUserResponseDto } from '@workspace/types';
import { google } from 'googleapis';
import { Repository } from 'typeorm';
import { PostHogService } from '../posthog/posthog.service';

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly sheets: ReturnType<typeof google.sheets>;

  constructor(
    @InjectRepository(UserAttribution)
    private readonly attributionRepo: Repository<UserAttribution>,
    @InjectRepository(AnalyticsEventEntity)
    private readonly analyticsEventRepo: Repository<AnalyticsEventEntity>,
    private readonly postHog: PostHogService,
  ) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('You must provide a GOOGLE_API_KEY');
    }

    const auth = new google.auth.JWT({
      key: process.env.GOOGLE_API_KEY,
      email: process.env.GOOGLE_EMAIL,
      scopes: SHEETS_SCOPES,
    });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  private static readonly REVENUE_CRITICAL_EVENTS: ReadonlySet<AnalyticsEvent['event']> = new Set([
    'payment_succeeded',
    'payment_refunded',
  ]);

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    this.logger.log(`event=${event.event} ${JSON.stringify(event)}`);
    await this.persist(event);
    this.captureToPostHog(event);

    // Buffered capture can be lost if the process exits before the next flush
    // tick (flushInterval: 10s) — force it out now for events where that loss
    // is unacceptable, rather than relying solely on graceful shutdown.
    if (EventsService.REVENUE_CRITICAL_EVENTS.has(event.event)) {
      await this.postHog.flush();
    }
  }

  async trackUserCreated(
    user: CreateUserResponseDto,
    attribution: AttributionPayload,
  ): Promise<void> {
    this.logger.log(`trackUserCreated called for user ${user.id}, adCode=${attribution.adCode}`);
    this.identifyAttribution(user.id, attribution);
    await Promise.all([this.saveToDb(user.id, attribution), this.writeToSheets(user, attribution)]);
  }

  private identifyAttribution(userId: number, attribution: AttributionPayload): void {
    try {
      const properties: Record<string, string> = {
        attribution_platform: attribution.platform,
      };
      if (attribution.source != null) properties.attribution_source = attribution.source;
      if (attribution.medium != null) properties.attribution_medium = attribution.medium;
      if (attribution.campaign != null) properties.attribution_campaign = attribution.campaign;
      if (attribution.adset != null) properties.attribution_adset = attribution.adset;
      if (attribution.ad != null) properties.attribution_ad = attribution.ad;
      if (attribution.clickId != null) properties.attribution_click_id = attribution.clickId;
      if (attribution.adCode != null) properties.attribution_ad_code = attribution.adCode;

      this.postHog.identify(String(userId), { $set_once: properties });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to identify attribution for user ${userId}: ${message}`);
    }
  }

  private async persist(event: AnalyticsEvent): Promise<void> {
    const userId = 'userId' in event ? event.userId : null;
    const telegramId = 'telegramId' in event ? event.telegramId : null;
    const email = 'email' in event ? event.email : null;
    const adCode = 'adCode' in event ? event.adCode : null;

    try {
      await this.analyticsEventRepo.save({
        event: event.event,
        userId,
        telegramId,
        email,
        adCode,
        properties: event as object,
        occurredAt: new Date(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to persist analytics event "${event.event}": ${message}`);
    }
  }

  private captureToPostHog(event: AnalyticsEvent): void {
    try {
      const userId = 'userId' in event ? event.userId : null;
      const telegramId = 'telegramId' in event ? event.telegramId : null;
      const distinctId =
        userId != null ? String(userId) : telegramId != null ? `tg:${telegramId}` : null;

      if (!distinctId) {
        this.logger.warn(`No identity for PostHog capture: event=${event.event}`);
        return;
      }

      if (event.event === 'user_created') {
        this.postHog.identify(distinctId, {
          $set: {
            telegram_id: event.telegramId,
            ...(event.email != null && { email: event.email }),
          },
          $set_once: {
            first_seen: new Date().toISOString(),
          },
        });

        // Merges pre-signup events (bot_started, tma_opened — captured under
        // `tg:{telegramId}` before an account exists) onto this same PostHog
        // person, so the acquisition → payment funnel spans one identity.
        if (event.telegramId != null) {
          this.postHog.alias(`tg:${event.telegramId}`, distinctId);
        }
      }

      this.postHog.capture(distinctId, event.event, event as unknown as Record<string, unknown>);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to capture to PostHog "${event.event}": ${message}`);
    }
  }

  private async saveToDb(userId: number, attribution: AttributionPayload): Promise<void> {
    try {
      await this.attributionRepo.save({
        userId,
        platform: attribution.platform,
        source: attribution.source ?? null,
        medium: attribution.medium ?? null,
        campaign: attribution.campaign ?? null,
        adset: attribution.adset ?? null,
        ad: attribution.ad ?? null,
        clickId: attribution.clickId ?? null,
        adCode: attribution.adCode ?? null,
        raw: attribution,
      });
    } catch (err: any) {
      this.logger.error(`Failed to save data to attributionRepo ${err.message}`);
      throw err;
    }
  }

  private async writeToSheets(
    user: CreateUserResponseDto,
    attribution: AttributionPayload,
  ): Promise<void> {
    this.logger.log(
      `writeToSheets: sheet=${process.env.GOOGLE_SHEET_ID}, title=${process.env.GOOGLE_SHEET_TITLE}`,
    );
    const dateAndTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${process.env.GOOGLE_SHEET_TITLE}!A2`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              attribution.platform,
              attribution.adCode ?? '',
              user.telegramId ? Number(user.telegramId) : '',
              attribution.adCode ? (user.email ?? '') : '',
              dateAndTime,
              '',
            ],
          ],
        },
      });

      this.logger.log('Appended data to GA');
    } catch (error: any) {
      this.logger.error(`Failed to save data to GA: ${error.message}`);
    }
  }
}
