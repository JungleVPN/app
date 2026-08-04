import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  apiRoutes,
  GetUserByEmailCommandDto,
  GetUserByTelegramIdResponseDto,
} from '@workspace/types';
import axios, { type AxiosInstance } from 'axios';

/**
 * Resolves a platform identity (Telegram user ID or email) to the internal
 * Remnawave user UUID by calling the remnawave service over the Docker-internal
 * network. Uses INTER_SERVICE_SECRET so the remnawave endpoint can be guarded.
 */
@Injectable()
export class RemnaUserResolverService {
  private readonly logger = new Logger(RemnaUserResolverService.name);
  private readonly http: AxiosInstance;

  constructor(readonly config: ConfigService) {
    const baseURL = config.get<string>('REMNAWAVE_INTERNAL_URL') ?? config.getOrThrow<string>('PUBLIC_REMNAWAVE_URL');
    const secret = config.getOrThrow<string>('INTER_SERVICE_SECRET');

    this.http = axios.create({
      baseURL,
      headers: { 'x-service-secret': secret },
      timeout: 5_000,
    });
  }

  async resolveByTelegramId(telegramId: number): Promise<string> {
    try {
      const { data } = await this.http.get<GetUserByTelegramIdResponseDto>(
        apiRoutes.remnawave.userByTelegramId(telegramId),
      );

      if (!data?.[0].uuid) throw new Error('empty uuid');
      return data[0].uuid;
    } catch (err) {
      this.logger.warn(`Failed to resolve user for telegramId=${telegramId}: ${String(err)}`);
      throw new UnauthorizedException('User not found');
    }
  }

  async resolveByEmail(email: string): Promise<string> {
    try {
      const { data } = await this.http.get<GetUserByEmailCommandDto>(
        apiRoutes.remnawave.userByEmail(email),
      );

      if (!data?.[0].uuid) throw new Error('empty uuid');
      return data[0].uuid;
    } catch (err) {
      this.logger.warn(`Failed to resolve user for email=${email}: ${String(err)}`);
      throw new UnauthorizedException('User not found');
    }
  }
}
