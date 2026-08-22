import * as process from 'node:process';
import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  apiRoutes,
  CreateUserCommand,
  CreateUserRequestDto,
  CreateUserResponseDto,
  DeleteUserCommand,
  GetUserByIdCommand,
  GetUserByIdResponseDto,
  GetUserMetadataCommand,
  GetUserMetadataResponseDto,
  GetUsersStreamCommand,
  type GetUsersStreamQuery,
  RevokeUserSubscriptionCommand,
  type StreamedUserDto,
  UpdateUserCommand,
  UpdateUserRequestDto,
  UpdateUserResponseDto,
  UpsertUserMetadataCommand,
  UserDto,
} from '@workspace/types';
import axios from 'axios';
import { addDays, addMonths } from 'date-fns';
import { Bot } from 'grammy';
import { AnalyticsClientService } from '../analytics/analytics-client.service';
import { RemnaPanelClient, RemnaPanelError } from '../common/remna-panel.client';

// Used when REMNAWAVE_INTERNAL_SQUADS is unset/empty so new users still land in a squad.
const DEFAULT_INTERNAL_SQUAD = '6f40164a-51d0-432a-8fa3-3e1311e13757';

@Injectable()
export class UserService implements OnModuleInit {
  readonly logger = new Logger(UserService.name);
  private bot: Bot;

  constructor(
    private readonly panelClient: RemnaPanelClient,
    private readonly configService: ConfigService,
    private readonly analyticsClient: AnalyticsClientService,
  ) {}

  onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required for UserService');
    // Instantiate without starting — only bot.api.* is used
    this.bot = new Bot(token);
  }

  /**
   * Pages through `/api/users/stream`, the cursor-paginated endpoint that replaced
   * the removed list and by-{telegram-id,email,tag} lookups in panel v3.
   *
   * `stopAfterFirstPage` short-circuits identity lookups, which only ever need the
   * first match and would otherwise walk the whole user base.
   */
  private async streamUsers(
    filters: Omit<GetUsersStreamQuery, 'cursor' | 'size'> = {},
    { stopAfterFirstPage = false }: { stopAfterFirstPage?: boolean } = {},
  ): Promise<StreamedUserDto[]> {
    const size = 1000;
    const collected: StreamedUserDto[] = [];
    let cursor: string | null = null;

    for (;;) {
      const query = new URLSearchParams({ size: String(size) });
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) query.set(key, String(value));
      }
      if (cursor) query.set('cursor', cursor);

      const page = await this.panelClient.request<{
        users: StreamedUserDto[];
        nextCursor: string | null;
        hasMore: boolean;
      }>({
        url: `${GetUsersStreamCommand.url}?${query.toString()}`,
        method: GetUsersStreamCommand.endpointDetails.REQUEST_METHOD,
      });

      collected.push(...page.users);

      if (stopAfterFirstPage) break;
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }

    return collected;
  }

  async getAllUsers(): Promise<UserDto[]> {
    return this.streamUsers();
  }

  async getUserByTgId(
    telegramId: CreateUserRequestDto['telegramId'],
  ): Promise<StreamedUserDto[] | null> {
    if (!telegramId) return null;
    try {
      const users = await this.streamUsers(
        { telegramId: Number(telegramId) },
        { stopAfterFirstPage: true },
      );

      if (users.length === 0) return null;
      return users;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  private get referralsBaseUrl(): string {
    return process.env.REFERRALS_URL || 'http://localhost:3004/referrals';
  }

  async createUser(
    payload: Pick<CreateUserRequestDto, 'telegramId' | 'email' | 'description'> & {
      inviterId?: number;
    },
  ): Promise<CreateUserResponseDto> {
    const trialDays = Number(this.configService.get('TRIAL_PERIOD_IN_DAYS', '3'));
    const configuredInternalSquads = JSON.parse(
      this.configService.get('REMNAWAVE_INTERNAL_SQUADS', '[]'),
    );
    const activeInternalSquads =
      configuredInternalSquads.length > 0 ? configuredInternalSquads : [DEFAULT_INTERNAL_SQUAD];
    const expireAt = addDays(new Date(), trialDays);

    const { inviterId, ...rest } = payload;

    const body: CreateUserRequestDto = {
      ...rest,
      username: crypto.randomUUID().slice(0, 10),
      expireAt,
      activeInternalSquads,
      trafficLimitStrategy: 'MONTH',
      status: 'ACTIVE',
      hwidDeviceLimit: Number(process.env.HWID_LIMIT) || 5,
    };

    const user = await this.panelClient.request<CreateUserResponseDto>({
      url: CreateUserCommand.url,
      method: CreateUserCommand.endpointDetails.REQUEST_METHOD,
      body,
    });

    if (inviterId) {
      await this.notifyReferral(inviterId, user.id);
    }

    await this.analyticsClient.track({
      event: 'user_created',
      userId: user.id,
      telegramId: Number(user.telegramId),
      email: user.email ?? null,
    });

    return user;
  }

  /**
   * Records the referral once the invited user's account actually exists.
   * Best-effort: a referrals-service outage must not fail account creation.
   */
  private async notifyReferral(inviterId: number, invitedId: number): Promise<void> {
    try {
      await axios.post(
        `${this.referralsBaseUrl}${apiRoutes.referrals.collection}`,
        { inviterId, invitedId },
        { headers: { 'x-service-secret': process.env.INTER_SERVICE_SECRET } },
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to notify referrals service for invited=${invitedId}: ${err.message}`,
      );
    }
  }

  async updateUser(body: UpdateUserRequestDto): Promise<UpdateUserResponseDto> {
    return this.panelClient.request<UpdateUserResponseDto>({
      url: UpdateUserCommand.url,
      method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
      body,
    });
  }

  /** Panel v3 answers DELETE with 204 No Content — there is no body to return. */
  async deleteUser(userId: number): Promise<void> {
    await this.panelClient.request<void>({
      url: DeleteUserCommand.url(String(userId)),
      method: DeleteUserCommand.endpointDetails.REQUEST_METHOD,
    });
  }

  async getUserById(userId: number): Promise<GetUserByIdResponseDto | null> {
    if (userId == null) return null;
    try {
      return await this.panelClient.request<GetUserByIdResponseDto>({
        method: GetUserByIdCommand.endpointDetails.REQUEST_METHOD,
        url: GetUserByIdCommand.url(String(userId)),
      });
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getUserByEmail(email: string): Promise<StreamedUserDto[] | null> {
    if (!email) return null;
    try {
      const users = await this.streamUsers({ email }, { stopAfterFirstPage: true });

      if (users.length === 0) return null;
      return users;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async addExtraDevice(userId: number): Promise<UpdateUserResponseDto> {
    const user = await this.getUserById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const current = user.hwidDeviceLimit ?? Number(process.env.HWID_LIMIT) ?? 5;
    await this.updateUser({ id: userId, hwidDeviceLimit: current + 1 });

    return user;
  }

  async updateExpiry(userId: number, months: number): Promise<UpdateUserResponseDto> {
    const user = await this.getUserById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const base =
      user.expireAt && new Date(user.expireAt) > new Date() ? new Date(user.expireAt) : new Date();
    const expireAt = addMonths(base, months);

    await this.updateUser({ id: userId, expireAt });

    return user;
  }

  async getTelegramPhotoUrl(telegramId: string): Promise<{ photoUrl: string | null }> {
    try {
      const { total_count, photos } = await this.bot.api.getUserProfilePhotos(Number(telegramId), {
        limit: 1,
      });

      if (total_count === 0) return { photoUrl: null };

      const sizes = photos[0];
      const fileId = sizes[sizes.length - 1].file_id;

      const file = await this.bot.api.getFile(fileId);
      if (!file.file_path) return { photoUrl: null };

      const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
      return { photoUrl: `https://api.telegram.org/file/bot${token}/${file.file_path}` };
    } catch {
      return { photoUrl: null };
    }
  }

  async getUserMetadata(userId: number): Promise<GetUserMetadataResponseDto | null> {
    try {
      return await this.panelClient.request<GetUserMetadataResponseDto>({
        url: GetUserMetadataCommand.url(String(userId)),
        method: GetUserMetadataCommand.endpointDetails.REQUEST_METHOD,
      });
    } catch (e) {
      if (e instanceof RemnaPanelError && e.status === 404) return null;
      throw e;
    }
  }

  async upsertUserMetadata(userId: number, metadata: Record<string, unknown>): Promise<void> {
    await this.panelClient.request({
      url: UpsertUserMetadataCommand.url(String(userId)),
      method: UpsertUserMetadataCommand.endpointDetails.REQUEST_METHOD,
      body: { metadata },
    });
  }

  async revokeSubscription(userId: number): Promise<string> {
    const data = await this.panelClient.request<UserDto>({
      url: RevokeUserSubscriptionCommand.url(String(userId)),
      method: RevokeUserSubscriptionCommand.endpointDetails.REQUEST_METHOD,
    });

    return data.subscriptionUrl;
  }
}
