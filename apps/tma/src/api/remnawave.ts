import { createApiClient } from '@workspace/core/api';
import { useAuthStore } from '@workspace/core/stores';
import { coreEnv as env } from '@workspace/core/env';

/**
 * API client pointing to the NestJS remnawave backend.
 * Sends Telegram initData as X-Telegram-Init-Data header so the backend
 * can verify the user's identity without a separate auth handshake.
 */
export const backendClient = createApiClient({
  baseUrl: env.remnawaveUrl,
  getHeaders: (): Record<string, string> => {
    const { tgInitDataRaw } = useAuthStore.getState();
    if (tgInitDataRaw) return { 'X-Telegram-Init-Data': tgInitDataRaw };
    return {};
  },
});
