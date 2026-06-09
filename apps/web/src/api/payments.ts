import { createApiClient, createPaymentsApi } from '@workspace/core/api';
import { coreEnv as env } from '@workspace/core/env';

/**
 * API client pointing to the NestJS remnawave backend.
 * The backend mirrors @remnawave/backend-contract URLs,
 * so the shared API works without any web-specific overrides.
 */
const backendClient = createApiClient({
  baseUrl: env.paymentsUrl,
});

export const paymentsApi = createPaymentsApi(backendClient);
