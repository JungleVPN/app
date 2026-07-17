import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAttribution } from '@workspace/database';
import { AttributionPayload, CreateUserResponseDto } from '@workspace/types';
import { google } from 'googleapis';
import { Repository } from 'typeorm';

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly sheets: ReturnType<typeof google.sheets>;

  constructor(
    @InjectRepository(UserAttribution)
    private readonly attributionRepo: Repository<UserAttribution>,
  ) {
    const auth = new google.auth.JWT({
      key: process.env.GOOGLE_API_KEY,
      email: process.env.GOOGLE_EMAIL,
      scopes: SHEETS_SCOPES,
    });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async trackUserCreated(
    user: CreateUserResponseDto,
    attribution: AttributionPayload,
  ): Promise<void> {
    await Promise.all([
      this.saveToDb(user.uuid, attribution),
      this.writeToSheets(user, attribution),
    ]);
  }

  private async saveToDb(userId: string, attribution: AttributionPayload): Promise<void> {
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
  }

  private async writeToSheets(
    user: CreateUserResponseDto,
    attribution: AttributionPayload,
  ): Promise<void> {
    const dateAndTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Columns: Channel | Ad Code | UserId | Email | Date and Time | Provider
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

    if (process.env.NODE_ENV === 'development') {
      this.logger.log('Appended data to GA');
    }
  }
}
