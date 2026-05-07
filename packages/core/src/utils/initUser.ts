import type { CreateUserRequestDto, CreateUserResponseDto, UserDto } from '@workspace/types';
import type { createRemnawaveApi } from '../api';

type RemnawaveApi = ReturnType<typeof createRemnawaveApi>;

/**
 * Look up a remnawave user by one or both identity keys. Returns the first
 * matching user, or `null` if none is found. Never creates a user.
 *
 * Lookup priority:
 *  1. By email       (if provided)
 *  2. By telegramId  (if provided and email lookup returned nothing)
 *
 * At least one of `email` or `telegramId` must be present.
 * Accepts an api client instance so it can be called from any platform.
 */
export async function initUser(
  api: RemnawaveApi,
  body: Pick<CreateUserRequestDto, 'email' | 'telegramId'>,
): Promise<CreateUserResponseDto | null> {
  if (!body.email && body.telegramId == null) {
    throw new Error('initUser requires at least an email or a telegramId');
  }

  try {
    if (body.email) {
      const byEmail = await api.getUserByEmail({ email: body.email });
      if (byEmail) return byEmail[0];
    }

    if (body.telegramId != null) {
      const byTelegram = await api.getUserByTelegramId(body.telegramId.toString());
      if (byTelegram) return byTelegram[0];
    }

    return null;
  } catch (error: unknown) {
    if (error instanceof Error) {
      const wrapped = new Error(`initUser: ${error.message}`);
      (wrapped as Error & { cause?: unknown }).cause = error;
      throw wrapped;
    }
    throw error;
  }
}

export const getIsCompleteUser = (user: UserDto | null) => {
  return Boolean(user?.email) && Boolean(user?.telegramId);
};

export const getIsWebUser = (user: UserDto | null) => {
  return !!user?.email && !user.telegramId;
};

export const getIsTgUser = (user: UserDto | null) => {
  return !!user?.telegramId && !user.email;
};
