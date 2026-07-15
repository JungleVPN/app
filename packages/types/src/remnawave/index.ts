export type { TRemnawaveWebhookUserEvent as RemnawebhookPayload } from '@remnawave/backend-contract';
export {
  CreateUserCommand,
  DeleteAllUserHwidDevicesCommand,
  DeleteUserCommand,
  DeleteUserHwidDeviceCommand,
  EVENTS as REMNAWAVE_EVENTS,
  EVENTS_SCOPES as REMNAWAVE_EVENTS_SCOPES,
  GetAllUsersCommand,
  GetMetadataCommand,
  GetSubpageConfigByShortUuidCommand,
  GetSubscriptionInfoByShortUuidCommand,
  GetSubscriptionPageConfigCommand,
  GetUserByEmailCommand,
  GetUserByTelegramIdCommand,
  GetUserByUuidCommand,
  GetUserHwidDevicesCommand,
  GetUserMetadataCommand,
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
  DeleteUserCommand,
  GetUserByTelegramIdCommand,
  GetUserByUuidCommand,
  GetUserHwidDevicesCommand,
  GetUserMetadataCommand,
  UpdateUserCommand,
} from '@remnawave/backend-contract';

export type CreateUserRequestDto = CreateUserCommand.Request;
export type UpdateUserRequestDto = UpdateUserCommand.Request;

export type UserDto = CreateUserCommand.Response['response'];

// by-telegram-id and by-email return arrays of users inside `response`
export type GetUserByTelegramIdResponseDto = GetUserByTelegramIdCommand.Response['response'];
export type GetUserByUuidResponseDto = GetUserByUuidCommand.Response['response'];
export type CreateUserResponseDto = CreateUserCommand.Response['response'];
export type UpdateUserResponseDto = UpdateUserCommand.Response['response'];
export type DeleteUserResponseDto = DeleteUserCommand.Response['response'];
export type HwidDeviceDto = GetUserHwidDevicesCommand.Response['response']['devices'][number];
export type GetUserMetadataResponseDto = GetUserMetadataCommand.Response['response'];
