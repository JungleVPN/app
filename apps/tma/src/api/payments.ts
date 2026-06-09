import { createApiClient, createPaymentsApi } from '@workspace/core/api';
import { coreEnv as env } from '@workspace/core/env';

export const paymentsApi = createPaymentsApi(
  createApiClient({
    baseUrl: env.paymentsUrl,
  }),
);
