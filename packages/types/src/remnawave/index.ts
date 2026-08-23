export type { TRemnawaveWebhookUserEvent as RemnawebhookPayload } from '@remnawave/backend-contract';
export {
  CreateUserCommand,
  DeleteAllUserHwidDevicesCommand,
  DeleteUserCommand,
  DeleteUserHwidDeviceCommand,
  EVENTS as REMNAWAVE_EVENTS,
  EVENTS_SCOPES as REMNAWAVE_EVENTS_SCOPES,
  GetSubpageConfigByShortUuidCommand,
  GetSubpageConfigCommand,
  GetSubscriptionInfoByShortUuidCommand,
  GetUserByIdCommand,
  GetUserHwidDevicesCommand,
  GetUserMetadataCommand,
  GetUsersCommand,
  GetUsersStreamCommand,
  ResolveUserCommand,
  RevokeUserSubscriptionCommand,
  type TRemnawaveWebhookEvent,
  UpdateUserCommand,
  UpsertUserMetadataCommand,
} from '@remnawave/backend-contract';

export {
  SubscriptionPageRawConfigSchema,
  type TSubscriptionPageAppConfig,
  type TSubscriptionPageBlockConfig,
  type TSubscriptionPageButtonConfig,
  type TSubscriptionPageLanguageCode,
  type TSubscriptionPageLocalizedText,
  type TSubscriptionPagePlatformKey,
  type TSubscriptionPageRawConfig,
} from '@remnawave/subscription-page-types';

import {
  CreateUserCommand,
  GetUserByIdCommand,
  GetUserHwidDevicesCommand,
  GetUserMetadataCommand,
  GetUsersStreamCommand,
  UpdateUserCommand,
} from '@remnawave/backend-contract';

/**
 * Remnawave panel user identifier.
 *
 * Panel v3 dropped the `uuid` field entirely: users are keyed by a numeric `id`,
 * with `shortUuid` retained only as the subscription-link identifier. Everything
 * in this monorepo that used to pass a v2 uuid string now passes a `RemnaUserId`.
 */
export type RemnaUserId = number;

export type CreateUserRequestDto = CreateUserCommand.RequestBody;
export type UpdateUserRequestDto = UpdateUserCommand.RequestBody;

export type UserDto = CreateUserCommand.Response['response'];

export type GetUserByIdResponseDto = GetUserByIdCommand.Response['response'];
export type CreateUserResponseDto = CreateUserCommand.Response['response'];
export type UpdateUserResponseDto = UpdateUserCommand.Response['response'];
export type HwidDeviceDto = GetUserHwidDevicesCommand.Response['response']['devices'][number];
export type GetUserMetadataResponseDto = GetUserMetadataCommand.Response['response'];

/**
 * `/api/users/stream` replaced the removed by-telegram-id / by-email / by-tag
 * lookup endpoints in panel v3. It is the only remaining way to find a user by
 * a platform identity rather than by panel id.
 */
export type GetUsersStreamQuery = GetUsersStreamCommand.RequestQuery;
export type GetUsersStreamResponseDto = GetUsersStreamCommand.Response['response'];
export type StreamedUserDto = GetUsersStreamResponseDto['users'][number];
