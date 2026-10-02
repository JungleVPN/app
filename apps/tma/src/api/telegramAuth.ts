import { type ApiClientConfig, handleTelegramUnauthorized } from '@workspace/core/api';
import { useAuthStore } from '@workspace/core/stores';

/**
 * How every mini app request authenticates: Telegram initData in
 * X-Telegram-Init-Data, which the backend verifies with HMAC-SHA256.
 *
 * A rejection is handed to core, which asks for a reopen only when the data
 * has expired and reports any other rejection.
 */
export const telegramAuth: Pick<ApiClientConfig, 'getHeaders' | 'onUnauthorized'> = {
  getHeaders: (): Record<string, string> => {
    const { tgInitDataRaw } = useAuthStore.getState();
    if (tgInitDataRaw) return { 'X-Telegram-Init-Data': tgInitDataRaw };
    return {};
  },
  onUnauthorized: handleTelegramUnauthorized,
};
