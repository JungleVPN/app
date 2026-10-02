import type { ApiClientConfig } from '@workspace/core/api';
import { useAuthStore } from '@workspace/core/stores';

/**
 * How every mini app request authenticates: Telegram initData in
 * X-Telegram-Init-Data, which the backend verifies with HMAC-SHA256.
 *
 * The backend stops accepting that data after a fixed age, and only reopening
 * the app issues fresh data — so a rejection of data we did send marks the
 * session expired, and the app asks the user to reopen it.
 */
export const telegramAuth: Pick<ApiClientConfig, 'getHeaders' | 'onUnauthorized'> = {
  getHeaders: (): Record<string, string> => {
    const { tgInitDataRaw } = useAuthStore.getState();
    if (tgInitDataRaw) return { 'X-Telegram-Init-Data': tgInitDataRaw };
    return {};
  },
  onUnauthorized: () => {
    const { tgInitDataRaw, actions } = useAuthStore.getState();
    if (tgInitDataRaw) actions.setSessionExpired(true);
  },
};
