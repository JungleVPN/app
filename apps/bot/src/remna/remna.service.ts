import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { RemnaError } from '@remna/remna.error';
import { createBackendClient } from '@utils/http-client';
import {
  apiRoutes,
  CreateUserRequestDto,
  GetUserMetadataResponseDto,
  type StreamedUserDto,
  UserDto,
} from '@workspace/types';
import { AxiosInstance } from 'axios';

@Injectable()
export class RemnaService {
  private readonly logger = new Logger(RemnaService.name);

  private backend: AxiosInstance = createBackendClient(
    process.env.REMNAWAVE_URL || 'http://localhost:3002/remnawave',
  );

  private async fetch<Data>({
    method = 'POST',
    url,
    body,
  }: {
    url: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
    body?: unknown;
  }): Promise<Data> {
    try {
      const res = await this.backend.request({
        method,
        url,
        data: body,
      });

      if (res.status === 404) {
        return null as Data;
      }

      if (res.status >= 400) {
        throw new RemnaError(`Remnawave service error: ${method} ${url}`, res.status, res.data);
      }

      return res.data;
    } catch (e: any) {
      if (e instanceof RemnaError) throw e;

      const status = e.response?.status;
      const payload = e.response?.data;

      console.error('REMNAWAVE REQUEST ERROR', {
        url,
        method,
        status,
        payload,
        message: e.message,
      });

      throw new RemnaError(`Remnawave request failed: ${url}`, status, payload);
    }
  }

  async getAllUsers(): Promise<UserDto[]> {
    return this.fetch<UserDto[]>({
      url: apiRoutes.remnawave.users,
      method: 'GET',
    });
  }

  async getUserByTgId(
    telegramId: CreateUserRequestDto['telegramId'],
  ): Promise<StreamedUserDto[] | null> {
    if (!telegramId) return null;
    try {
      const users = await this.fetch<StreamedUserDto[]>({
        method: 'GET',
        url: apiRoutes.remnawave.userByTelegramId(telegramId),
      });

      if (!users || users.length === 0) return null;
      return users;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getUserLang(userId: number): Promise<string | null> {
    try {
      const { metadata } = await this.fetch<GetUserMetadataResponseDto>({
        method: 'GET',
        url: apiRoutes.remnawave.userMetadata(userId),
      });
      const lang = metadata?.lang;
      return typeof lang === 'string' ? lang : null;
    } catch {
      return null;
    }
  }

  async upsertUserLang(userId: number, lang: string): Promise<void> {
    try {
      await this.fetch<unknown>({
        method: 'PUT',
        url: apiRoutes.remnawave.userMetadata(userId),
        body: { metadata: { lang } },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to upsert lang metadata for ${userId}: ${e?.message}`);
    }
  }

  async revokeSub(userId: number) {
    return await this.fetch<string>({
      url: apiRoutes.remnawave.revokeUserSubscription(userId),
    });
  }

  /**
   * Checks if a user should be removed due to being blocked/invalid.
   * Used during broadcast/poll distribution to clean up dead users.
   */
  async handleInvalidUserRemoval(user: UserDto, errorMessage: string): Promise<boolean> {
    const blockedPatterns = [
      'bot was blocked by the user',
      'user is deactivated',
      'chat not found',
    ];

    if (user.email) return false;

    const isInvalid = blockedPatterns.some((pattern) =>
      errorMessage.toLowerCase().includes(pattern),
    );

    if (isInvalid && user.id != null) {
      try {
        this.logger.log(`Removed invalid user ${user.telegramId} (${errorMessage})`);
        return true;
      } catch (e) {
        this.logger.error(`Failed to remove invalid user ${user.telegramId}: ${e}`);
      }
    }

    return false;
  }
}
