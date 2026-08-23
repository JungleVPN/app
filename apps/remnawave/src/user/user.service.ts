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

/** `/api/users/stream?size=` is capped at 1000 by the contract. */
const STREAM_PAGE_SIZE = 1000;

/**
 * Rows to pull for a single-identity lookup. Two, not one: the panel enforces
 * no uniqueness on email or telegramId, and the second row is what tells us an
 * identity is ambiguous before a caller authenticates the first one.
 */
const IDENTITY_PAGE_SIZE = 2;

/** Ceiling on the full-stream walk: 1M users, far past any real deployment. */
const MAX_STREAM_PAGES = 1000;

/** Mirrors the panel's own `z.email()` closely enough to avoid a guaranteed 400. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
   * Fetches one page of `/api/users/stream`, the cursor-paginated endpoint that
   * replaced the removed list and by-{telegram-id,email,tag} lookups in v3.
   *
   * Every filter is applied server-side on exact equality — the panel runs
   * `users.telegram_id = $1` / `users.email = $1` — so a match here is the same
   * user the removed by-identity endpoints would have returned. The admin
   * table's `GET /api/users` is deliberately not used for this: its telegramId
   * filter is `CAST(telegram_id AS TEXT) LIKE '%value%'` whatever filter mode is
   * requested, which would resolve 12345 to the account 123456.
   *
   * Missing fields are normalised away rather than trusted, because a malformed
   * page must end the walk instead of throwing halfway through it.
   */
  private async fetchUserPage(
    filters: Omit<GetUsersStreamQuery, 'cursor' | 'size'>,
    { size, cursor }: { size: number; cursor?: string | null },
  ): Promise<{ users: StreamedUserDto[]; nextCursor: string | null; hasMore: boolean }> {
    const query = new URLSearchParams({ size: String(size) });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) query.set(key, String(value));
    }
    if (cursor) query.set('cursor', cursor);

    const page = await this.panelClient.request<{
      users?: StreamedUserDto[];
      nextCursor?: string | null;
      hasMore?: boolean;
    } | null>({
      url: `${GetUsersStreamCommand.url}?${query.toString()}`,
      method: GetUsersStreamCommand.endpointDetails.REQUEST_METHOD,
    });

    return {
      users: page?.users ?? [],
      nextCursor: page?.nextCursor ?? null,
      hasMore: page?.hasMore ?? false,
    };
  }

  /**
   * Runs a single-identity lookup and unwraps it to the caller's array-or-null.
   *
   * The panel matches at most a handful of rows for an identity, so this asks
   * for IDENTITY_PAGE_SIZE rather than a full page: these run on every login.
   * Asking for two rather than one is what makes an ambiguous identity visible
   * — callers take `[0]` to decide who is authenticated, so a shared address
   * must not pass silently.
   */
  private async lookupByIdentity(
    filters: Omit<GetUsersStreamQuery, 'cursor' | 'size'>,
    describe: () => string,
  ): Promise<StreamedUserDto[] | null> {
    try {
      const { users } = await this.fetchUserPage(filters, { size: IDENTITY_PAGE_SIZE });

      if (users.length === 0) return null;
      if (users.length > 1) {
        // "at least": we only ever fetch IDENTITY_PAGE_SIZE rows, so this
        // detects duplication without measuring it. Three duplicates look the
        // same as two from here.
        this.logger.warn(
          `Ambiguous user lookup for ${describe()}: at least ${users.length} accounts share this ` +
            `identity; callers will act on the lowest id=${users[0]?.id}`,
        );
      }

      return users;
    } catch (e: unknown) {
      // The panel client funnels every failure through RemnaPanelError, so this
      // narrows without an `any` cast.
      if (e instanceof RemnaPanelError && e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Every user in the panel, walked page by page.
   *
   * The panel's keyset cursor is the last row's id over an ascending id sort, so
   * it advances strictly and the walk terminates on its own. The guards below
   * exist so that a panel that misreports `hasMore`, repeats a cursor, or
   * returns a short body cannot spin this loop forever — it feeds broadcasts,
   * where a hang would take the bot down with it.
   */
  async getAllUsers(): Promise<UserDto[]> {
    const collected: StreamedUserDto[] = [];
    let cursor: string | null = null;

    for (let requested = 0; requested < MAX_STREAM_PAGES; requested++) {
      const page = await this.fetchUserPage({}, { size: STREAM_PAGE_SIZE, cursor });
      collected.push(...page.users);

      const exhausted = page.users.length === 0 || !page.hasMore || !page.nextCursor;
      if (exhausted || page.nextCursor === cursor) return collected;

      cursor = page.nextCursor;
    }

    this.logger.error(
      `Stopped walking /users/stream after ${MAX_STREAM_PAGES} pages (${collected.length} users) — ` +
        `the panel never reported the end of the stream`,
    );
    return collected;
  }

  async getUserByTgId(
    telegramId: CreateUserRequestDto['telegramId'],
  ): Promise<StreamedUserDto[] | null> {
    if (!telegramId) return null;

    // The by-telegram-id route takes an unvalidated path segment, and the panel
    // rejects a non-numeric filter with a 400. Answer "no such user" instead.
    const numericTelegramId = Number(telegramId);
    if (!Number.isFinite(numericTelegramId) || numericTelegramId < 0) {
      this.logger.warn(`Ignoring user lookup for non-numeric telegramId: ${telegramId}`);
      return null;
    }

    return this.lookupByIdentity(
      { telegramId: numericTelegramId },
      () => `telegramId=${numericTelegramId}`,
    );
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

    // The panel validates this filter as an email and 400s on anything else,
    // and the by-email route takes an unvalidated path segment.
    if (!EMAIL_PATTERN.test(email)) {
      this.logger.warn(`Ignoring user lookup for malformed email: ${email}`);
      return null;
    }

    return this.lookupByIdentity({ email }, () => email);
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
