import { createApiClient, createPaymentsApi } from '@workspace/core/api';
import { coreEnv as env } from '@workspace/core/env';
import { useAuthStore } from '@workspace/core/stores';

/**
 * Payments API client for the Telegram Mini App.
 * Sends Telegram initData as X-Telegram-Init-Data so the backend can validate
 * the user's identity via HMAC-SHA256 without a shared client secret.
 */
export const paymentsApi = createPaymentsApi(
  createApiClient({
    baseUrl: env.paymentsUrl,
    getHeaders: (): Record<string, string> => {
      const { tgInitDataRaw } = useAuthStore.getState();
      if (tgInitDataRaw) return { 'X-Telegram-Init-Data': tgInitDataRaw };
      return {};
    },
  }),
);
