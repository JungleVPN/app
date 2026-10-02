import { createApiClient } from '@workspace/core/api';
import { coreEnv as env } from '@workspace/core/env';
import { telegramAuth } from './telegramAuth';

/** API client for the NestJS remnawave backend, authenticated with Telegram initData. */
export const backendClient = createApiClient({ baseUrl: env.remnawaveUrl, ...telegramAuth });
