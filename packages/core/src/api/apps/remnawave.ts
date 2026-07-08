import type { AttributionPayload } from '@workspace/types';
import {
  apiRoutes,
  CreateUserRequestDto,
  CreateUserResponseDto,
  DeleteUserHwidDeviceCommand,
  GetSubpageConfigByShortUuidCommand,
  GetSubscriptionInfoByShortUuidCommand,
  GetSubscriptionPageConfigCommand,
  GetUserByEmailCommand,
  GetUserByTelegramIdCommand,
  GetUserHwidDevicesCommand,
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
        // Backend returns 200 with empty body when not found — treat as null.
        if (!data || data.length === 0) return null;
        return data;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
          return null;
        }
        throw err;
      }
    },

    async createUser(
      params: Pick<CreateUserRequestDto, 'email' | 'telegramId'> & {
        attribution?: AttributionPayload;
        /** Remnawave userId (uuid) of the inviter, read from the ?ref= URL param. */
        inviterId?: string;
      },
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

    async getUserDevices(
      userUuid: string,
    ): Promise<GetUserHwidDevicesCommand.Response['response'] | null> {
      try {
        return await client.get<GetUserHwidDevicesCommand.Response['response']>(
          apiRoutes.remnawave.userDevices(userUuid),
        );
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
          return null;
        }
        throw err;
      }
    },

    async getTelegramPhotoUrl(telegramId: string): Promise<{ photoUrl: string | null }> {
      try {
        return await client.get<{ photoUrl: string | null }>(
          apiRoutes.remnawave.telegramPhoto(telegramId),
        );
      } catch {
        return { photoUrl: null };
      }
    },

    async deleteUserDevice(
      userUuid: string,
      hwid: string,
    ): Promise<DeleteUserHwidDeviceCommand.Response['response'] | null> {
      return client.delete<DeleteUserHwidDeviceCommand.Response['response']>(
        apiRoutes.remnawave.userDevice(userUuid, hwid),
      );
    },
  };
}
