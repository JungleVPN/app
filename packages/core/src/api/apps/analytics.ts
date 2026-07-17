import { AttributionPayload, apiRoutes, CreateUserResponseDto } from '@workspace/types';
import type { ApiClient } from '../client';

export function createAnalyticsApi(client: ApiClient) {
  return {
    trackUserCreated(user: CreateUserResponseDto, attribution: AttributionPayload): void {
      client
        .post<void>(apiRoutes.analytics.trackUserCreated, { user, attribution })
        .catch(() => {});
    },
  };
}

export type AnalyticsApi = ReturnType<typeof createAnalyticsApi>;
