import { createApiClient } from '@workspace/core/api';
import { coreEnv as env } from '@workspace/core/env';

export const analyticsClient = createApiClient({ baseUrl: env.analyticsUrl });
