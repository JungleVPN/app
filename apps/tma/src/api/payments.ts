import { createApiClient, createPaymentsApi } from '@workspace/core/api';
import { coreEnv as env } from '@workspace/core/env';
import { telegramAuth } from './telegramAuth';

/** Payments API client for the Telegram Mini App, authenticated with Telegram initData. */
export const paymentsApi = createPaymentsApi(
  createApiClient({ baseUrl: env.paymentsUrl, ...telegramAuth }),
);
