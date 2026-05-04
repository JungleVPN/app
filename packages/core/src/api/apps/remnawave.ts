import {
  apiRoutes,
  CreateUserRequestDto,
  CreateUserResponseDto,
  GetSubpageConfigByShortUuidCommand,
  GetSubscriptionInfoByShortUuidCommand,
  GetSubscriptionPageConfigCommand,
  GetUserByEmailCommand,
  GetUserByTelegramIdCommand,
  UpdateUserCommand,
  UpdateUserResponseDto,
} from '@workspace/types';
import type { ApiClient } from '../client';

export function createRemnawaveApi(client: ApiClient) {
  return {
    async getUserByEmail(
      body: GetUserByEmailCommand.Request,
    ): Promise<GetUserByEmailCommand.Response['response'] | null> {
      try {
        return await client.get<GetUserByEmailCommand.Response['response']>(
          apiRoutes.remnawave.userByEmail(body.email),
        );
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
          return null;
        }
        throw err;
      }
    },

    async getUserByTelegramId(
      telegramId: string,
    ): Promise<GetUserByTelegramIdCommand.Response['response'] | null> {
      try {
        const data = await client.get<GetUserByTelegramIdCommand.Response['response']>(
          apiRoutes.remnawave.userByTelegramId(telegramId),
        );
        if (data?.length === 0) return null;
        return data;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
          return null;
        }
        throw err;
      }
    },

    async createUser(
      params: Pick<CreateUserRequestDto, 'email' | 'telegramId'>,
    ): Promise<CreateUserResponseDto | null> {
      return client.post<CreateUserResponseDto>(apiRoutes.remnawave.users, {
        ...params,
        username: crypto.randomUUID().slice(0, 8),
      });
    },

    async getSubpageConfigByShortUuid(
      shortUuid: string,
    ): Promise<GetSubpageConfigByShortUuidCommand.Response['response'] | null> {
      return await client.get<GetSubpageConfigByShortUuidCommand.Response['response']>(
        apiRoutes.remnawave.subscriptionSubpageConfig(shortUuid),
      );
    },

    async getSubscriptionInfoByShortUuid(
      shortUuid: string,
    ): Promise<GetSubscriptionInfoByShortUuidCommand.Response['response'] | null> {
      return await client.get<GetSubscriptionInfoByShortUuidCommand.Response['response']>(
        apiRoutes.remnawave.subscriptionInfoByShortUuid(shortUuid),
      );
    },

    async getSubscriptionPageConfig(
      uuid: string,
    ): Promise<GetSubscriptionPageConfigCommand.Response['response'] | null> {
      return await client.get<GetSubscriptionPageConfigCommand.Response['response']>(
        apiRoutes.remnawave.subscriptionPageConfig(uuid),
      );
    },

    async updateUser(body: UpdateUserCommand.Request): Promise<UpdateUserResponseDto | null> {
      return client.patch<UpdateUserResponseDto>(apiRoutes.remnawave.users, body);
    },
  };
}
