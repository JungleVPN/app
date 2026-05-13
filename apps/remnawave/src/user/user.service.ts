import * as process from 'node:process';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
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
import { addDays, addMonths } from 'date-fns';
import { RemnaPanelClient } from '../common/remna-panel.client';

@Injectable()
export class UserService {
  readonly logger = new Logger(UserService.name);
  constructor(
    private readonly panelClient: RemnaPanelClient,
    private readonly configService: ConfigService,
  ) {}

  async getAllUsers(): Promise<UserDto[]> {
    const size = 1000;
    const allUsers: UserDto[] = [];
    let start = 0;

    for (;;) {
      const { total, users } = await this.panelClient.request<{
        total: number;
        users: UserDto[];
      }>({
        url: `${GetAllUsersCommand.url}?page=${start}&size=${size}`,
        method: GetAllUsersCommand.endpointDetails.REQUEST_METHOD,
      });

      allUsers.push(...users);

      if (users.length === 0) break;
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

  async createUser(
    payload: Pick<CreateUserRequestDto, 'telegramId' | 'email' | 'description'>,
  ): Promise<CreateUserResponseDto> {
    const trialDays = Number(this.configService.get('TRIAL_PERIOD_IN_DAYS', '3'));
    const activeInternalSquads = JSON.parse(
      this.configService.get('REMNAWAVE_INTERNAL_SQUADS', '[]'),
    );
    const expireAt = addDays(new Date(), trialDays);

    const body: CreateUserRequestDto = {
      ...payload,
      username: crypto.randomUUID().slice(0, 10),
      expireAt,
      activeInternalSquads,
      trafficLimitStrategy: 'MONTH',
      status: 'ACTIVE',
      hwidDeviceLimit: Number(process.env.HWID_LIMIT) || 5,
    };

    return this.panelClient.request<CreateUserResponseDto>({
      url: CreateUserCommand.url,
      method: CreateUserCommand.endpointDetails.REQUEST_METHOD,
      body,
    });
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

  async updateExpiry(uuid: string, months: number): Promise<UpdateUserResponseDto> {
    const user = await this.getUserByUuid(uuid);
    if (!user) throw new NotFoundException(`User ${uuid} not found`);

    const base =
      user.expireAt && new Date(user.expireAt) > new Date() ? new Date(user.expireAt) : new Date();
    const expireAt = addMonths(base, months);

    await this.updateUser({ uuid, expireAt });

    return user;
  }

  async revokeSubscription(uuid: string): Promise<string> {
    const data = await this.panelClient.request<UserDto>({
      url: RevokeUserSubscriptionCommand.url(uuid),
      method: RevokeUserSubscriptionCommand.endpointDetails.REQUEST_METHOD,
    });

    return data.subscriptionUrl;
  }
}
