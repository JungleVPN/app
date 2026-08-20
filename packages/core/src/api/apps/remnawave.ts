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
  GetUserByUuidResponseDto,
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

    async getUserMetadata(uuid: string): Promise<Record<string, unknown> | null> {
      try {
        return await client.get<Record<string, unknown>>(apiRoutes.remnawave.userMetadata(uuid));
      } catch {
        return null;
      }
    },

    async upsertUserMetadata(uuid: string, metadata: Record<string, unknown>): Promise<void> {
      try {
        await client.put<void>(apiRoutes.remnawave.userMetadata(uuid), { metadata });
      } catch {
        // best-effort; language preference loss is non-critical
      }
    },

    // ── client-facing "me" methods (no UUID in path — derived from credential) ──

    async getMe(): Promise<GetUserByUuidResponseDto | null> {
      try {
        return await client.get<GetUserByUuidResponseDto>(apiRoutes.remnawave.me);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
          return null;
        }
        throw err;
      }
    },

    async updateMe(
      body: Omit<UpdateUserCommand.Request, 'uuid'>,
    ): Promise<UpdateUserResponseDto | null> {
      return client.patch<UpdateUserResponseDto>(apiRoutes.remnawave.me, body);
    },

    async getMyMetadata(): Promise<Record<string, unknown> | null> {
      try {
        return await client.get<Record<string, unknown>>(apiRoutes.remnawave.meMetadata);
      } catch {
        return null;
      }
    },

    async upsertMyMetadata(metadata: Record<string, unknown>): Promise<void> {
      try {
        await client.put<void>(apiRoutes.remnawave.meMetadata, { metadata });
      } catch {
        // best-effort; language preference loss is non-critical
      }
    },

    async getMyDevices(): Promise<GetUserHwidDevicesCommand.Response['response'] | null> {
      try {
        return await client.get<GetUserHwidDevicesCommand.Response['response']>(
          apiRoutes.remnawave.meDevices,
        );
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
          return null;
        }
        throw err;
      }
    },

    async deleteMyDevice(
      hwid: string,
    ): Promise<DeleteUserHwidDeviceCommand.Response['response'] | null> {
      return client.delete<DeleteUserHwidDeviceCommand.Response['response']>(
        apiRoutes.remnawave.meDevice(hwid),
      );
    },

    async getMyTelegramPhoto(): Promise<{ photoUrl: string | null }> {
      try {
        return await client.get<{ photoUrl: string | null }>(apiRoutes.remnawave.meTelegramPhoto);
      } catch {
        return { photoUrl: null };
      }
    },

    /**
     * Links an email to the authenticated user's account. If a different
     * account already owns the email, links the authenticated Telegram
     * identity to that account instead and returns the linked account.
     * Replaces the old getUserByEmail → updateUser(otherUuid) pattern.
     */
    async linkEmail(email: string): Promise<UpdateUserResponseDto | null> {
      return client.post<UpdateUserResponseDto>(apiRoutes.remnawave.meLinkEmail, { email });
    },

    /**
     * Find-or-create the remnawave user for a TMA user providing their email.
     * Replaces the old initUser() → updateUser/createUser chain on the
     * subscription page. Requires X-Telegram-Init-Data header.
     */
    async connectEmail(
      email: string,
      options: { inviterId?: string } = {},
    ): Promise<CreateUserResponseDto | UpdateUserResponseDto | null> {
      return client.post<CreateUserResponseDto>(apiRoutes.remnawave.connectEmail, {
        email,
        ...options,
      });
    },
  };
}
