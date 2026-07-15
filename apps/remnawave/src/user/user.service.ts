import * as process from 'node:process';
import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAttribution } from '@workspace/database';
import {
  AttributionPayload,
  apiRoutes,
  CreateUserCommand,
  CreateUserRequestDto,
  CreateUserResponseDto,
  DeleteUserCommand,
  DeleteUserResponseDto,
  GetAllUsersCommand,
  GetUserByEmailCommand,
  GetUserByTelegramIdCommand,
  GetUserByTelegramIdResponseDto,
  GetUserByUuidCommand,
  GetUserByUuidResponseDto,
  RevokeUserSubscriptionCommand,
  UpdateUserCommand,
  UpdateUserRequestDto,
  UpdateUserResponseDto,
  UserDto,
} from '@workspace/types';
import axios from 'axios';
import { addDays, addMonths } from 'date-fns';
import { Bot } from 'grammy';
import { Repository } from 'typeorm';
import { RemnaPanelClient } from '../common/remna-panel.client';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class UserService implements OnModuleInit {
  readonly logger = new Logger(UserService.name);
  private bot: Bot;

  constructor(
    private readonly panelClient: RemnaPanelClient,
    private readonly configService: ConfigService,
    private readonly analyticsService: AnalyticsService,
    @InjectRepository(UserAttribution)
    private readonly attributionRepo: Repository<UserAttribution>,
  ) {}

  onModuleInit() {
    const token = this.configService.get<string>('PUBLIC_TELEGRAM_BOT_TOKEN');
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required for UserService');
    // Instantiate without starting — only bot.api.* is used
    this.bot = new Bot(token);
  }

  async getAllUsers(): Promise<UserDto[]> {
    const size = 1000;
    const allUsers: UserDto[] = [];
    let start = 0;

    for (;;) {
      const { total, users } = await this.panelClient.request<{
        total: number;
        users: UserDto[];
      }>({
        url: `${GetAllUsersCommand.url}?start=${start}&size=${size}`,
        method: GetAllUsersCommand.endpointDetails.REQUEST_METHOD,
      });

      if (users.length === 0) break;

      allUsers.push(...users);
      if (allUsers.length >= total) break;
      if (users.length < size) break;

      start += size;
    }
    return allUsers;
  }

  async getUserByTgId(
    telegramId: CreateUserRequestDto['telegramId'],
  ): Promise<GetUserByTelegramIdResponseDto | null> {
    if (!telegramId) return null;
    try {
      const users = await this.panelClient.request<GetUserByTelegramIdResponseDto>({
        method: GetUserByTelegramIdCommand.endpointDetails.REQUEST_METHOD,
        url: GetUserByTelegramIdCommand.url(telegramId.toString()),
      });

      if (!users || users.length === 0) return null;
      return users;
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  private get referralsBaseUrl(): string {
    return process.env.PUBLIC_REFERRALS_URL || 'http://localhost:3004/referrals';
  }

  async createUser(
    payload: Pick<CreateUserRequestDto, 'telegramId' | 'email' | 'description'> & {
      attribution?: AttributionPayload;
      /** Remnawave userId (uuid) of the inviter, decoded from a /start ref_xxx code. */
      inviterId?: string;
    },
  ): Promise<CreateUserResponseDto> {
    const trialDays = Number(this.configService.get('TRIAL_PERIOD_IN_DAYS', '3'));
    const activeInternalSquads = JSON.parse(
      this.configService.get('REMNAWAVE_INTERNAL_SQUADS', '[]'),
    );
    const expireAt = addDays(new Date(), trialDays);

    const { attribution, inviterId, ...rest } = payload;

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

    if (attribution) {
      await this.analyticsService
        .trackUserCreated({
          user,
          attribution,
        })
        .catch((err) => this.logger.warn(`Analytics tracking failed: ${err.message}`));

      await this.attributionRepo.save({
        userId: user.uuid,
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

    if (inviterId) {
      await this.notifyReferral(inviterId, user.uuid);
    }

    return user;
  }

  /**
   * Records the referral once the invited user's account actually exists.
   * Best-effort: a referrals-service outage must not fail account creation.
   */
  private async notifyReferral(inviterId: string, invitedId: string): Promise<void> {
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

  async deleteUser(uuid: string): Promise<DeleteUserResponseDto> {
    return this.panelClient.request<DeleteUserResponseDto>({
      url: DeleteUserCommand.url(uuid),
      method: DeleteUserCommand.endpointDetails.REQUEST_METHOD,
    });
  }

  async getUserByUuid(uuid: string): Promise<GetUserByUuidResponseDto | null> {
    if (!uuid) return null;
    try {
      return await this.panelClient.request<GetUserByUuidResponseDto>({
        method: GetUserByUuidCommand.endpointDetails.REQUEST_METHOD,
        url: GetUserByUuidCommand.url(uuid),
      });
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getUserByEmail(email: string): Promise<GetUserByEmailCommand.Response['response'] | null> {
    if (!email) return null;
    try {
      return await this.panelClient.request<GetUserByEmailCommand.Response['response']>({
        method: GetUserByEmailCommand.endpointDetails.REQUEST_METHOD,
        url: GetUserByEmailCommand.url(email),
      });
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async addExtraDevice(uuid: string): Promise<UpdateUserResponseDto> {
    const user = await this.getUserByUuid(uuid);
    if (!user) throw new NotFoundException(`User ${uuid} not found`);

    const current = user.hwidDeviceLimit ?? Number(process.env.HWID_LIMIT) ?? 5;
    await this.updateUser({ uuid, hwidDeviceLimit: current + 1 });

    return user;
  }

  async updateExpiry(uuid: string, months: number): Promise<UpdateUserResponseDto> {
    const user = await this.getUserByUuid(uuid);
    if (!user) throw new NotFoundException(`User ${uuid} not found`);

    const base =
      user.expireAt && new Date(user.expireAt) > new Date() ? new Date(user.expireAt) : new Date();
    const expireAt = addMonths(base, months);

    await this.updateUser({ uuid, expireAt });

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

      const token = this.configService.get<string>('PUBLIC_TELEGRAM_BOT_TOKEN');
      return { photoUrl: `https://api.telegram.org/file/bot${token}/${file.file_path}` };
    } catch {
      return { photoUrl: null };
    }
  }

  async revokeSubscription(uuid: string): Promise<string> {
    const data = await this.panelClient.request<UserDto>({
      url: RevokeUserSubscriptionCommand.url(uuid),
      method: RevokeUserSubscriptionCommand.endpointDetails.REQUEST_METHOD,
    });

    return data.subscriptionUrl;
  }
}
