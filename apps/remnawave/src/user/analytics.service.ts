import * as process from 'node:process';
import { Injectable } from '@nestjs/common';
import { AttributionPayload, CreateUserResponseDto } from '@workspace/types';
import { google } from 'googleapis';

const scopes = ['https://www.googleapis.com/auth/spreadsheets'];

export interface UserCreatedAnalyticsData {
  user: CreateUserResponseDto;
  attribution: AttributionPayload;
}

@Injectable()
export class AnalyticsService {
  async trackUserCreated(data: UserCreatedAnalyticsData): Promise<void> {
    const auth = new google.auth.JWT({
      key: process.env.GOOGLE_API_KEY,
      email: process.env.GOOGLE_EMAIL,
      scopes,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const dateAndTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const payload = {
      platform: data.attribution.platform,
      telegramId: data.user.telegramId ? Number(data.user.telegramId) : undefined,
      dateAndTime,
      email: data.attribution.adCode ? (data.user.email ?? undefined) : undefined,
      adCode: data.attribution.adCode,
    };

    // Columns: Channel | UserId | Date and Time | Email | Ad Code | Provider
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${process.env.GOOGLE_SHEET_TITLE}!A2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            payload.platform,
            payload.adCode ?? '',
            payload.telegramId,
            payload.email ?? '',
            payload.dateAndTime,
            '',
          ],
        ],
      },
    });
  }
}
