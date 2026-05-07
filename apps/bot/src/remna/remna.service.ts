import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { RemnaError } from '@remna/remna.error';
import { createBackendClient } from '@utils/http-client';
import {
  apiRoutes,
  CreateUserRequestDto,
  CreateUserResponseDto,
  GetUserByTelegramIdResponseDto,
  UpdateUserRequestDto,
  UserDto,
} from '@workspace/types';
import { AxiosInstance } from 'axios';

@Injectable()
export class RemnaService {
  private readonly logger = new Logger(RemnaService.name);

  private backend: AxiosInstance = createBackendClient(
    process.env.REMNAWAVE_URL || 'http://localhost:3002',
  );

  private async fetch<Data>({
    method = 'POST',
    url,
    body,
  }: {
    url: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
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

  async init(telegramId: number, language_code: string | undefined): Promise<UserDto> {
    const user = await this.getUserByTgId(telegramId);
    if (!user) {
      return await this.createUser({
        telegramId,
        description: language_code,
        username: telegramId.toString(),
      });
    } else {
      if (user[0].description !== language_code) {
        await this.updateUser({
          uuid: user[0].uuid,
          description: language_code,
        });
      }

      return user[0];
    }
  }

  async getAllUsers(): Promise<UserDto[]> {
    return this.fetch<UserDto[]>({
      url: apiRoutes.remnawave.users,
      method: 'GET',
    });
  }

  async createUser(payload: { username: string; telegramId: number; description?: string }) {
    return this.fetch<CreateUserResponseDto>({
      url: apiRoutes.remnawave.users,
      body: payload,
    });
  }

  async updateUser(body: UpdateUserRequestDto) {
    return this.fetch<UserDto>({
      method: 'PATCH',
      url: apiRoutes.remnawave.users,
      body,
    });
  }

  async getUserByTgId(
    telegramId: CreateUserRequestDto['telegramId'],
  ): Promise<GetUserByTelegramIdResponseDto | null> {
    if (!telegramId) return null;
    try {
      const users = await this.fetch<GetUserByTelegramIdResponseDto>({
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

  async deleteUser(uuid: string) {
    await this.fetch({ url: apiRoutes.remnawave.userByUuid(uuid), method: 'DELETE' });
  }

  async revokeSub(uuid: string) {
    return await this.fetch<string>({
      url: apiRoutes.remnawave.revokeUserSubscription(uuid),
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

    if (isInvalid && user.uuid) {
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
