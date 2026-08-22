import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { apiRoutes, type StreamedUserDto } from '@workspace/types';
import axios, { type AxiosInstance } from 'axios';

/**
 * Resolves a platform identity (Telegram user ID or email) to the internal
 * Remnawave user id by calling the remnawave service over the Docker-internal
 * network. Uses INTER_SERVICE_SECRET so the remnawave endpoint can be guarded.
 *
 * Panel v3 keys users by a numeric id; the remnawave service still exposes these
 * by-identity routes and backs them with `/api/users/stream` filters.
 */
@Injectable()
export class RemnaUserResolverService {
  private readonly logger = new Logger(RemnaUserResolverService.name);
  private readonly http: AxiosInstance;

  constructor(readonly config: ConfigService) {
    const baseURL = config.getOrThrow<string>('REMNAWAVE_URL');
    const secret = config.getOrThrow<string>('INTER_SERVICE_SECRET');

    this.http = axios.create({
      baseURL,
      headers: { 'x-service-secret': secret },
      timeout: 5_000,
    });
  }

  async resolveByTelegramId(telegramId: number): Promise<number> {
    try {
      const { data } = await this.http.get<StreamedUserDto[]>(
        apiRoutes.remnawave.userByTelegramId(telegramId),
      );

      const userId = data?.[0]?.id;
      if (userId == null) throw new Error('empty user id');
      return userId;
    } catch (err) {
      this.logger.warn(`Failed to resolve user for telegramId=${telegramId}: ${String(err)}`);
      throw new UnauthorizedException('User not found');
    }
  }

  async resolveByEmail(email: string): Promise<number> {
    try {
      const { data } = await this.http.get<StreamedUserDto[]>(
        apiRoutes.remnawave.userByEmail(email),
      );

      const userId = data?.[0]?.id;
      if (userId == null) throw new Error('empty user id');
      return userId;
    } catch (err) {
      this.logger.warn(`Failed to resolve user for email=${email}: ${String(err)}`);
      throw new UnauthorizedException('User not found');
    }
  }
}
