import type { CreateUserRequestDto, CreateUserResponseDto } from '@workspace/types';
import type { createRemnawaveApi } from '../api';

type RemnawaveApi = ReturnType<typeof createRemnawaveApi>;

/**
 * Resolve-or-create a remnawave user for a given identity.
 *
 * Lookup priority:
 *  1. By email       (if provided — web platform)
 *  2. By telegramId  (if provided — TMA platform)
 *  3. Create new user if neither lookup returns a result.
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
