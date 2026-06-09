import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/** Minimal user shape returned by the remnawave service. */
export interface RemnaUser {
  uuid: string;
  telegramId: number | null;
  expireAt: string;
  subscriptionUrl: string;
  description: string | null;
  [key: string]: unknown;
}

/**
 * HTTP client for the remnawave service.
 * Mirrors the webhook → payments communication pattern.
 */
@Injectable()
export class RemnaClient {
  private readonly logger = new Logger(RemnaClient.name);

  private get baseUrl(): string {
    return process.env.PUBLIC_REMNAWAVE_URL || 'http://localhost:3002';
  }

  async getUserByTgId(telegramId: number): Promise<RemnaUser | null> {
    try {
      const { data } = await axios.get<RemnaUser[]>(
        `${this.baseUrl}/users/by-telegram-id/${telegramId}`,
        {
          headers: {
            'x-service-secret': process.env.INTER_SERVICE_SECRET,
          },
        },
      );

      const user = Array.isArray(data) ? data[0] : data;
      return user ?? null;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      this.logger.error(`Failed to get user ${telegramId}: ${err.message}`);
      throw err;
    }
  }

  async updateUser(payload: {
    uuid: string;
    expireAt?: Date | string;
    [key: string]: unknown;
  }): Promise<RemnaUser> {
    const { data } = await axios.patch<RemnaUser>(`${this.baseUrl}/users`, payload, {
      headers: {
        'x-service-secret': process.env.INTER_SERVICE_SECRET,
      },
    });
    return data;
  }
}
