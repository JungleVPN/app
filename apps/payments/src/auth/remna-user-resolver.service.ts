import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { apiRoutes, type CreateUserResponseDto, type StreamedUserDto } from '@workspace/types';
import axios, { type AxiosInstance } from 'axios';

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

  /**
   * Find-or-create the remnawave user for an email, for callers that have no
   * authenticated identity (the public checkout page). Reuses the same
   * inter-service routes the TMA/web connect flow goes through.
   *
   * A failed lookup falls through to create rather than aborting: the panel
   * being briefly unreachable should not drop a sale, and creating a duplicate
   * is recoverable where a lost checkout is not.
   */
  async resolveOrCreateByEmail(
    email: string,
    options: { inviterId?: number; origin?: string | null } = {},
  ): Promise<number> {
    const existing = await this.findByEmail(email);
    if (existing != null) return existing;

    const { data } = await this.http.post<CreateUserResponseDto>(
      apiRoutes.remnawave.users,
      { email, inviterId: options.inviterId },
      { headers: options.origin ? { origin: options.origin } : {} },
    );

    if (data?.id == null) {
      this.logger.error(`Create returned no user id for email=${email}`);
      throw new Error(`Failed to create user for ${email}`);
    }

    return data.id;
  }

  async findByEmail(email: string): Promise<number | null> {
    try {
      const { data } = await this.http.get<StreamedUserDto[]>(
        apiRoutes.remnawave.userByEmail(email),
      );
      return data?.[0]?.id ?? null;
    } catch (err) {
      this.logger.warn(`Lookup failed for email=${email}, creating instead: ${String(err)}`);
      return null;
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
